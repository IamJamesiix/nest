import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { errMsg } from "../api/client";
import { homeFor, useAuth } from "../context/AuthContext";

const enabled = !!import.meta.env.VITE_GOOGLE_CLIENT_ID;

// "Continue with Google" for the login and register pages.
// role only matters the first time someone signs up with Google.
export default function GoogleButton({ role, onError }) {
  const { googleLogin } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [busy, setBusy] = useState(false);

  if (!enabled) {
    return (
      <p className="rounded-2xl border border-dashed border-line px-4 py-3 text-center text-xs text-mut">
        Google sign-in is off. Add VITE_GOOGLE_CLIENT_ID to .env and restart the dev server.
      </p>
    );
  }

  const onSuccess = async ({ credential }) => {
    setBusy(true);
    onError("");
    try {
      const { isNew, user } = await googleLogin(credential, role);
      if (isNew && user.role === "agent") navigate("/agent/verification", { replace: true });
      else navigate(params.get("next") || homeFor(user), { replace: true });
    } catch (err) {
      onError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`flex justify-center ${busy ? "pointer-events-none opacity-60" : ""}`}>
      <GoogleLogin
        text="continue_with"
        shape="pill"
        width="320"
        onSuccess={onSuccess}
        onError={() => onError("Google sign-in failed. Try again.")}
      />
    </div>
  );
}

// the "or" line between the google button and the email form
export function OrDivider() {
  return (
    <div className="my-6 flex items-center gap-3 text-xs font-semibold text-mut">
      <span className="h-px flex-1 bg-line" />
      or use your email
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}
