import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import type { ReactNode } from "react";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Firebase restores the session asynchronously. Redirecting before that
  // finishes would bounce signed-in users to login on every refresh.
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0B0B0C]">
        <Loader2 size={28} className="animate-spin text-[#E50914]" />
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        state={{ notice: "Please log in to continue.", from: location.pathname }}
        replace
      />
    );
  }

  return <>{children}</>;
}