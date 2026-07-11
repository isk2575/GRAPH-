import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { defaultUserProfile, type UserProfile } from "../lib/readiness";
import { useAuth } from "./AuthContext";
import { apiGet, apiPut } from "../lib/api";

interface UserContextValue {
  profile: UserProfile;
  setProfile: (profile: UserProfile) => void;
  updateProfile: (patch: Partial<UserProfile>) => void;
  onboarded: boolean;
  setOnboarded: (v: boolean) => void;
  loadingProfile: boolean;
  reset: () => Promise<void>;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();

  const [profile, setProfileState] = useState<UserProfile>(defaultUserProfile);
  const [onboarded, setOnboardedState] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Prevents the initial DB load from immediately writing back to the DB.
  const hydrated = useRef(false);

  // Load from Postgres whenever the signed-in user changes.
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      hydrated.current = false;
      setProfileState(defaultUserProfile);
      setOnboardedState(false);
      setLoadingProfile(false);
      return;
    }

    let cancelled = false;
    setLoadingProfile(true);
    hydrated.current = false;

    apiGet<{ data: UserProfile | null; onboarded: boolean }>("/api/profile")
      .then((res) => {
        if (cancelled) return;
        setProfileState(res.data ?? defaultUserProfile);
        setOnboardedState(res.onboarded);
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

  // Persist changes back to Postgres.
  useEffect(() => {
    if (!user || !hydrated.current) return;
    apiPut("/api/profile", { data: profile, onboarded }).catch(() => {
      /* non-fatal; the UI keeps working on in-memory state */
    });
  }, [profile, onboarded, user]);

  const setProfile = (p: UserProfile) => setProfileState(p);
  const updateProfile = (patch: Partial<UserProfile>) =>
    setProfileState((prev) => ({ ...prev, ...patch }));
  const setOnboarded = (v: boolean) => setOnboardedState(v);

  const reset = async () => {
    setProfileState(defaultUserProfile);
    setOnboardedState(false);
    if (user) {
      await apiPut("/api/profile", {
        data: defaultUserProfile,
        onboarded: false,
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
        loadingProfile,
        reset,
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