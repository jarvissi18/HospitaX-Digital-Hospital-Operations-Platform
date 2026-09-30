import {
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Loader2,
  ArrowRight,
  AlertCircle,
  ShieldCheck,
  KeyRound,
} from "lucide-react";

import { useState } from "react";
import type { FormEvent } from "react";

import { useNavigate } from "react-router-dom";

import { login as loginApi } from "../../services/authApi";
import { useAuth } from "../../context/AuthContext";

type LoginMethod = "password" | "pin";

export default function LoginForm() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState("");
  const [loginMethod, setLoginMethod] =
    useState<LoginMethod>("password");

  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [showPin, setShowPin] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  // =====================================================
  // SWITCH LOGIN METHOD
  // =====================================================

  const handleMethodChange = (
    method: LoginMethod
  ) => {
    if (loading) {
      return;
    }

    setLoginMethod(method);
    setError("");

    if (method === "password") {
      setPin("");
      setShowPin(false);
    } else {
      setPassword("");
      setShowPassword(false);
    }
  };

  // =====================================================
  // LOGIN
  // =====================================================

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");

    const normalizedIdentifier =
      identifier.trim();

    if (!normalizedIdentifier) {
      setError(
        "Please enter your Employee ID / Email."
      );
      return;
    }

    if (
      loginMethod === "password" &&
      !password
    ) {
      setError(
        "Please enter your password."
      );
      return;
    }

    if (
      loginMethod === "pin" &&
      !pin
    ) {
      setError(
        "Please enter your PIN."
      );
      return;
    }

    if (
      loginMethod === "pin" &&
      (pin.length < 4 ||
        pin.length > 6)
    ) {
      setError(
        "PIN must be between 4 and 6 digits."
      );
      return;
    }

    try {
      setLoading(true);

      const response =
        loginMethod === "password"
          ? await loginApi({
              identifier:
                normalizedIdentifier,
              password,
            })
          : await loginApi({
              identifier:
                normalizedIdentifier,
              pin,
            });

      if (
        !response?.access_token ||
        !response?.user
      ) {
        throw new Error(
          "Invalid authentication response."
        );
      }

      // ---------------------------------------------------
      // Store authenticated session
      // ---------------------------------------------------

      login(
        response.access_token,
        response.user
      );

      // ---------------------------------------------------
      // Navigate to role-aware dashboard
      // ---------------------------------------------------

      navigate(
        "/dashboard",
        {
          replace: true,
        }
      );
    } catch (err: unknown) {
      console.error(
        "Login failed:",
        err
      );

      let message =
        "Unable to sign in. Please check your credentials and try again.";

      if (
        typeof err === "object" &&
        err !== null &&
        "response" in err
      ) {
        const response =
          (
            err as {
              response?: {
                data?: {
                  detail?: string;
                  message?: string;
                };
              };
            }
          ).response;

        const detail =
          response?.data?.detail ??
          response?.data?.message;

        if (
          typeof detail === "string" &&
          detail.trim()
        ) {
          message = detail;
        }
      } else if (
        err instanceof Error &&
        err.message
      ) {
        message = err.message;
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5"
      noValidate
    >
      {/* =================================================
          ERROR
      ================================================= */}

      {error && (
        <div
          role="alert"
          className="
            flex
            items-start
            gap-2.5
            rounded-xl
            border
            border-red-100
            bg-red-50
            px-3.5
            py-3
            text-sm
            text-red-700
          "
        >
          <AlertCircle
            size={17}
            className="
              mt-0.5
              shrink-0
              text-red-500
            "
          />

          <p className="leading-5">
            {error}
          </p>
        </div>
      )}

      {/* =================================================
          EMPLOYEE ID / EMAIL
      ================================================= */}

      <div>
        <label
          htmlFor="login-identifier"
          className="
            mb-2
            block
            text-[12px]
            font-semibold
            text-slate-700
          "
        >
          Employee ID / Email
        </label>

        <div className="relative">
          <Mail
            size={17}
            strokeWidth={2}
            className="
              pointer-events-none
              absolute
              left-3.5
              top-1/2
              -translate-y-1/2
              text-slate-400
            "
          />

          <input
            id="login-identifier"
            name="identifier"
            type="text"
            autoComplete="username"
            value={identifier}
            onChange={(event) => {
              setIdentifier(
                event.target.value
              );
              setError("");
            }}
            placeholder="Enter Employee ID or email"
            disabled={loading}
            className="
              h-12
              w-full
              rounded-xl
              border
              border-slate-200
              bg-white
              pl-10
              pr-4
              text-sm
              text-slate-900
              outline-none
              transition
              placeholder:text-slate-400
              hover:border-slate-300
              focus:border-blue-500
              focus:ring-4
              focus:ring-blue-500/10
              disabled:cursor-not-allowed
              disabled:bg-slate-50
            "
          />
        </div>
      </div>

      {/* =================================================
          AUTHENTICATION METHOD
      ================================================= */}

      <div>
        <div
          className="
            mb-2
            flex
            items-center
            justify-between
          "
        >
          <span
            className="
              text-[12px]
              font-semibold
              text-slate-700
            "
          >
            Sign in with
          </span>

          <span
            className="
              text-[10px]
              font-medium
              text-slate-400
            "
          >
            Choose one method
          </span>
        </div>

        <div
          className="
            grid
            grid-cols-2
            gap-1
            rounded-xl
            border
            border-slate-200
            bg-slate-100
            p-1
          "
        >
          <button
            type="button"
            onClick={() =>
              handleMethodChange(
                "password"
              )
            }
            disabled={loading}
            className={`
              flex
              h-10
              items-center
              justify-center
              gap-2
              rounded-lg
              text-[12px]
              font-semibold
              transition
              ${
                loginMethod ===
                "password"
                  ? `
                    bg-white
                    text-blue-600
                    shadow-sm
                  `
                  : `
                    text-slate-500
                    hover:text-slate-700
                  `
              }
              disabled:cursor-not-allowed
            `}
          >
            <LockKeyhole size={15} />

            <span>
              Password
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              handleMethodChange(
                "pin"
              )
            }
            disabled={loading}
            className={`
              flex
              h-10
              items-center
              justify-center
              gap-2
              rounded-lg
              text-[12px]
              font-semibold
              transition
              ${
                loginMethod === "pin"
                  ? `
                    bg-white
                    text-blue-600
                    shadow-sm
                  `
                  : `
                    text-slate-500
                    hover:text-slate-700
                  `
              }
              disabled:cursor-not-allowed
            `}
          >
            <KeyRound size={15} />

            <span>
              PIN
            </span>
          </button>
        </div>
      </div>

      {/* =================================================
          PASSWORD
      ================================================= */}

      {loginMethod ===
        "password" && (
        <div>
          <label
            htmlFor="login-password"
            className="
              mb-2
              block
              text-[12px]
              font-semibold
              text-slate-700
            "
          >
            Password
          </label>

          <div className="relative">
            <LockKeyhole
              size={17}
              strokeWidth={2}
              className="
                pointer-events-none
                absolute
                left-3.5
                top-1/2
                -translate-y-1/2
                text-slate-400
              "
            />

            <input
              id="login-password"
              name="password"
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              autoComplete="current-password"
              value={password}
              onChange={(event) => {
                setPassword(
                  event.target.value
                );
                setError("");
              }}
              placeholder="Enter your password"
              disabled={loading}
              className="
                h-12
                w-full
                rounded-xl
                border
                border-slate-200
                bg-white
                pl-10
                pr-11
                text-sm
                text-slate-900
                outline-none
                transition
                placeholder:text-slate-400
                hover:border-slate-300
                focus:border-blue-500
                focus:ring-4
                focus:ring-blue-500/10
                disabled:cursor-not-allowed
                disabled:bg-slate-50
              "
            />

            <button
              type="button"
              onClick={() =>
                setShowPassword(
                  (current) =>
                    !current
                )
              }
              disabled={loading}
              aria-label={
                showPassword
                  ? "Hide password"
                  : "Show password"
              }
              className="
                absolute
                right-3
                top-1/2
                flex
                h-8
                w-8
                -translate-y-1/2
                items-center
                justify-center
                rounded-lg
                text-slate-400
                transition
                hover:bg-slate-100
                hover:text-slate-600
                disabled:cursor-not-allowed
              "
            >
              {showPassword ? (
                <EyeOff size={17} />
              ) : (
                <Eye size={17} />
              )}
            </button>
          </div>
          <p
            className="
              mt-2
              text-[10px]
              text-slate-400
            "
          >
            Enter the password assigned to your staff account.
          </p>
        </div>
      )}

      {/* =================================================
          PIN
      ================================================= */}

      {loginMethod === "pin" && (
        <div>
          <label
            htmlFor="login-pin"
            className="
              mb-2
              block
              text-[12px]
              font-semibold
              text-slate-700
            "
          >
            PIN
          </label>

          <div className="relative">
            <KeyRound
              size={17}
              strokeWidth={2}
              className="
                pointer-events-none
                absolute
                left-3.5
                top-1/2
                -translate-y-1/2
                text-slate-400
              "
            />

            <input
              id="login-pin"
              name="pin"
              type={
                showPin
                  ? "text"
                  : "password"
              }
              inputMode="numeric"
              autoComplete="current-password"
              maxLength={6}
              value={pin}
              onChange={(event) => {
                const value =
                  event.target.value.replace(
                    /\D/g,
                    ""
                  );

                setPin(value);
                setError("");
              }}
              placeholder="Enter your PIN"
              disabled={loading}
              className="
                h-12
                w-full
                rounded-xl
                border
                border-slate-200
                bg-white
                pl-10
                pr-11
                text-sm
                tracking-[0.18em]
                text-slate-900
                outline-none
                transition
                placeholder:tracking-normal
                placeholder:text-slate-400
                hover:border-slate-300
                focus:border-blue-500
                focus:ring-4
                focus:ring-blue-500/10
                disabled:cursor-not-allowed
                disabled:bg-slate-50
              "
            />

            <button
              type="button"
              onClick={() =>
                setShowPin(
                  (current) => !current
                )
              }
              disabled={loading}
              aria-label={
                showPin
                  ? "Hide PIN"
                  : "Show PIN"
              }
              className="
                absolute
                right-3
                top-1/2
                flex
                h-8
                w-8
                -translate-y-1/2
                items-center
                justify-center
                rounded-lg
                text-slate-400
                transition
                hover:bg-slate-100
                hover:text-slate-600
                disabled:cursor-not-allowed
              "
            >
              {showPin ? (
                <EyeOff size={17} />
              ) : (
                <Eye size={17} />
              )}
            </button>
          </div>

          <p
            className="
              mt-2
              text-[10px]
              text-slate-400
            "
          >
            Enter the 4–6 digit PIN assigned
            to your staff account.
          </p>
        </div>
      )}

      {/* =================================================
          SUBMIT
      ================================================= */}

      <button
        type="submit"
        disabled={
          loading ||
          !identifier.trim() ||
          (loginMethod ===
            "password" &&
            !password) ||
          (loginMethod === "pin" &&
            !pin)
        }
        className="
          group
          flex
          h-12
          w-full
          items-center
          justify-center
          gap-2
          rounded-xl
          bg-blue-600
          px-5
          text-sm
          font-semibold
          text-white
          shadow-[0_10px_25px_rgba(37,99,235,0.20)]
          transition
          hover:bg-blue-700
          hover:shadow-[0_14px_30px_rgba(37,99,235,0.24)]
          focus:outline-none
          focus:ring-4
          focus:ring-blue-500/20
          active:scale-[0.99]
          disabled:cursor-not-allowed
          disabled:bg-slate-300
          disabled:shadow-none
        "
      >
        {loading ? (
          <>
            <Loader2
              size={17}
              className="animate-spin"
            />

            <span>
              Signing in...
            </span>
          </>
        ) : (
          <>
            <span>
              Sign In
            </span>

            <ArrowRight
              size={17}
              className="
                transition-transform
                duration-200
                group-hover:translate-x-0.5
              "
            />
          </>
        )}
      </button>

      {/* =================================================
          ACCESS NOTE
      ================================================= */}

      <div
        className="
          flex
          items-center
          justify-center
          gap-2
          pt-0.5
          text-[10px]
          font-medium
          text-slate-400
        "
      >
        <span
          className="
            flex
            h-5
            w-5
            items-center
            justify-center
            rounded-full
            bg-emerald-50
            text-emerald-600
          "
        >
          <ShieldCheck
            size={12}
            strokeWidth={2.5}
          />
        </span>

        <span>
          Authorized staff access only
        </span>
      </div>
    </form>
  );
}