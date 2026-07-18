import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import {
  defaultUserProfile,
  computeReadiness,
  type UserProfile,
  type Baseline,
} from "../lib/readiness";
import { useAuth } from "./AuthContext";
import { apiGet, apiPut } from "../lib/api";

interface UserContextValue {
  profile: UserProfile;
  setProfile: (profile: UserProfile) => void;
  updateProfile: (patch: Partial<UserProfile>) => void;
  onboarded: boolean;
  setOnboarded: (v: boolean) => void;
  baseline: Baseline | null;
  loadingProfile: boolean;
  reset: () => Promise<void>;
  completeOnboarding: (finalProfile: UserProfile) => Promise<void>;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();

  const [profile, setProfileState] = useState<UserProfile>(defaultUserProfile);
  const [onboarded, setOnboardedState] = useState(false);
  const [baseline, setBaseline] = useState<Baseline | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const hydrated = useRef(false);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      hydrated.current = false;
      setProfileState(defaultUserProfile);
      setOnboardedState(false);
      setBaseline(null);
      setLoadingProfile(false);
      return;
    }

    let cancelled = false;
    setLoadingProfile(true);
    hydrated.current = false;

    apiGet<{
      data: UserProfile | null;
      onboarded: boolean;
      baseline: Baseline | null;
    }>("/api/profile")
      .then((res) => {
        if (cancelled) return;
        setProfileState(res.data ?? defaultUserProfile);
        setOnboardedState(res.onboarded);
        setBaseline(res.baseline);
      })
      .catch(() => {
        if (!cancelled) setProfileState(defaultUserProfile);
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingProfile(false);
          hydrated.current = true;
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  // Persist profile changes. Baseline is intentionally NOT sent here — it's
  // written once by completeOnboarding and frozen by the backend thereafter.
  useEffect(() => {
    if (!user || !hydrated.current) return;
    apiPut("/api/profile", { data: profile, onboarded }).catch(() => {});
  }, [profile, onboarded, user]);

  const setProfile = (p: UserProfile) => setProfileState(p);
  const updateProfile = (patch: Partial<UserProfile>) =>
    setProfileState((prev) => ({ ...prev, ...patch }));
  const setOnboarded = (v: boolean) => setOnboardedState(v);

  const completeOnboarding = async (finalProfile: UserProfile) => {
    const result = computeReadiness(finalProfile);
    const snapshot: Baseline = {
      score: result.score,
      breakdown: result.breakdown,
    };
    setProfileState(finalProfile);
    setOnboardedState(true);
    setBaseline((prev) => prev ?? snapshot);

    if (user) {
      await apiPut("/api/profile", {
        data: finalProfile,
        onboarded: true,
        baseline: snapshot,
      }).catch(() => {});
    }
  };

  const reset = async () => {
    setProfileState(defaultUserProfile);
    setOnboardedState(false);
    setBaseline(null);
    if (user) {
      await apiPut("/api/profile", {
        data: defaultUserProfile,
        onboarded: false,
        baseline: null,
      }).catch(() => {});
      await apiPut("/api/progress", { activeHabits: [], doneStops: [] }).catch(
        () => {}
      );
    }
  };

  return (
    <UserContext.Provider
      value={{
        profile,
        setProfile,
        updateProfile,
        onboarded,
        setOnboarded,
        baseline,
        loadingProfile,
        reset,
        completeOnboarding,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within a UserProvider");
  return ctx;
}