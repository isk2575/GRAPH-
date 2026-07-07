import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { defaultUserProfile, type UserProfile } from "../lib/readiness";

interface UserContextValue {
  profile: UserProfile;
  setProfile: (profile: UserProfile) => void;
  updateProfile: (patch: Partial<UserProfile>) => void;
  onboarded: boolean;
  setOnboarded: (v: boolean) => void;
  reset: () => void;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

const STORAGE_KEY = "graph_profile";
const ONBOARDED_KEY = "graph_onboarded";

function loadProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : defaultUserProfile;
  } catch {
    return defaultUserProfile;
  }
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<UserProfile>(loadProfile);
  const [onboarded, setOnboardedState] = useState<boolean>(
    () => localStorage.getItem(ONBOARDED_KEY) === "true"
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem(ONBOARDED_KEY, String(onboarded));
  }, [onboarded]);

  const setProfile = (p: UserProfile) => setProfileState(p);
  const updateProfile = (patch: Partial<UserProfile>) =>
    setProfileState((prev) => ({ ...prev, ...patch }));
  const setOnboarded = (v: boolean) => setOnboardedState(v);

  const reset = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(ONBOARDED_KEY);
    setProfileState(defaultUserProfile);
    setOnboardedState(false);
  };

  return (
    <UserContext.Provider
      value={{
        profile,
        setProfile,
        updateProfile,
        onboarded,
        setOnboarded,
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