"use client";

import { useState, FormEvent, useEffect, useRef } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    phone: "",
    password: "",
    name: "",
    role: "student" as "admin" | "student" | "business"
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetRequest, setResetRequest] = useState({ username: "", message: "" });
  const [resetRequestError, setResetRequestError] = useState("");
  const [resetRequestSuccess, setResetRequestSuccess] = useState("");
  const [resetRequestLoading, setResetRequestLoading] = useState(false);
  const loginUsernameRef = useRef<HTMLInputElement | null>(null);
  const registerNameRef = useRef<HTMLInputElement | null>(null);
  const authSectionRef = useRef<HTMLElement | null>(null);

  // Redirect if already logged in
  useEffect(() => {
    if (session?.user) {
      const userRole = (session.user as any).role || "student";
      if (userRole === "admin") {
        router.push("/admin");
      } else if (userRole === "student") {
        router.push("/student");
      } else if (userRole === "business") {
        router.push("/business");
      }
    }
  }, [session, router]);

  const scrollToForm = (loginView: boolean) => {
    setIsLogin(loginView);
    setError("");
    setSuccess("");

    requestAnimationFrame(() => {
      const target = authSectionRef.current;
      if (!target) return;

      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const top = target.getBoundingClientRect().top + window.scrollY - 40;

      // Scroll both with scrollTo (offset) and scrollIntoView as fallback
      window.scrollTo({ top, behavior: prefersReducedMotion ? "auto" : "smooth" });
      target.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });

      setTimeout(() => {
        if (loginView) {
          loginUsernameRef.current?.focus();
        } else {
          registerNameRef.current?.focus();
        }
      }, prefersReducedMotion ? 0 : 300);
    });
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    setFieldErrors({});

    const nextErrors: { [key: string]: string } = {};
    if (!formData.username.trim()) nextErrors.username = "Username is required";
    if (!formData.password) nextErrors.password = "Password is required";
    if (formData.password && formData.password.length < 6) nextErrors.password = "Password must be at least 6 characters";
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setLoading(false);
      return;
    }

    try {
      const validationResponse = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password
        })
      });

      if (!validationResponse.ok) {
        const data = await validationResponse.json();
        setError(data.error || "Invalid credentials. Please try again.");
        setLoading(false);
        return;
      }

      const result = await signIn("credentials", {
        username: formData.username,
        password: formData.password,
        redirect: false
      });

      if (result?.error) {
        if (result.error.toLowerCase().includes("inactive")) {
          setError("Your account is inactive. Please contact an administrator.");
        } else {
          setError("Invalid credentials. Please try again.");
        }
      } else if (result?.ok) {
        // Redirect immediately - session hook will handle role detection
        setSuccess("Login successful! Redirecting...");
        router.refresh();
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    setFieldErrors({});

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const nextErrors: { [key: string]: string } = {};
    if (!formData.name.trim()) nextErrors.name = "Full name is required";
    if (!formData.username.trim()) nextErrors.username = "Username is required";
    if (!formData.email.trim()) nextErrors.email = "Email is required";
    if (formData.email && !emailRegex.test(formData.email)) nextErrors.email = "Enter a valid email";
    if (!formData.phone.trim()) nextErrors.phone = "Phone number is required";
    if (!formData.password) nextErrors.password = "Password is required";
    if (formData.password && formData.password.length < 6) nextErrors.password = "Password must be at least 6 characters";
    if (!formData.role) nextErrors.role = "Role is required";
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Registration failed");
        return;
      }

      // Show success message and switch to login
      setSuccess("Registration successful! Please login with your credentials.");
      setFormData({
        username: "",
        email: "",
        phone: "",
        password: "",
        name: "",
        role: "student"
      });
      
      // Switch to login view after 2 seconds
      setTimeout(() => {
        setIsLogin(true);
        setSuccess("");
      }, 2000);
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetRequest = async (e: FormEvent) => {
    e.preventDefault();
    setResetRequestError("");
    setResetRequestSuccess("");

    if (!resetRequest.username.trim()) {
      setResetRequestError("Username is required");
      return;
    }

    setResetRequestLoading(true);
    try {
      const response = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: resetRequest.username.trim(),
          message: resetRequest.message.trim()
        })
      });
      const data = await response.json();
      if (!response.ok) {
        setResetRequestError(data.error || "Failed to send request");
        return;
      }
      setResetRequestSuccess("Request sent to admin. You will be contacted.");
      setResetRequest({ username: "", message: "" });
    } catch {
      setResetRequestError("Failed to send request");
    } finally {
      setResetRequestLoading(false);
    }
  };


  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 px-6 py-24 text-white sm:py-32">
        <div className="relative mx-auto max-w-4xl text-center">
          <h1 className="mb-6 text-5xl font-bold leading-tight sm:text-6xl md:text-7xl">
            Smart Task Management System
          </h1>
          <p className="mb-8 text-xl text-blue-100 sm:text-2xl">
            Empowering students and small business owners to achieve more with intelligent automation
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => scrollToForm(false)}
              className="rounded-lg bg-white px-8 py-4 text-lg font-semibold text-blue-600 shadow-lg transition hover:bg-blue-50 hover:shadow-xl"
            >
              Get Started
            </button>
            <button
              type="button"
              onClick={() => scrollToForm(true)}
              className="rounded-lg border-2 border-white px-8 py-4 text-lg font-semibold text-white transition hover:bg-white/10"
            >
              Sign In
            </button>
          </div>
        </div>
        <div className="absolute -bottom-1 left-0 right-0">
          <svg viewBox="0 0 1440 120" className="w-full fill-slate-50">
            <path d="M0,64L80,69.3C160,75,320,85,480,80C640,75,800,53,960,48C1120,43,1280,53,1360,58.7L1440,64L1440,120L1360,120C1280,120,1120,120,960,120C800,120,640,120,480,120C320,120,160,120,80,120L0,120Z"></path>
          </svg>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-slate-50 px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-12 text-center text-3xl font-bold text-slate-900">
            Everything You Need in One Place
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="rounded-xl bg-white p-8 shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="mb-2 text-xl font-semibold text-slate-900">For Students</h3>
              <p className="text-slate-600">Manage your tasks, timetable, and deadlines with smart reminders and collaboration tools.</p>
            </div>

            <div className="rounded-xl bg-white p-8 shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 text-green-600">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="mb-2 text-xl font-semibold text-slate-900">For Business</h3>
              <p className="text-slate-600">Track inventory, expenses, and sales. Automate routine tasks and focus on growth.</p>
            </div>

            <div className="rounded-xl bg-white p-8 shadow-sm">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="mb-2 text-xl font-semibold text-slate-900">Secure & Reliable</h3>
              <p className="text-slate-600">Your data is protected with enterprise-grade security and automated backups.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Auth Section */}
      <section id="auth-form" ref={authSectionRef} className="bg-white px-6 py-16">
        <div className="mx-auto max-w-md">
          <div className="rounded-2xl bg-white p-8 shadow-xl">
            <h2 className="mb-6 text-center text-3xl font-bold text-slate-900">
              {isLogin ? "Welcome Back" : "Create Account"}
            </h2>
            <p className="mb-8 text-center text-slate-600">
              {isLogin ? "Sign in to your account" : "Join us today"}
            </p>

            {error && (
              <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-800">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 rounded-lg bg-green-50 p-4 text-sm text-green-800">
                {success}
              </div>
            )}

            <form onSubmit={isLogin ? handleLogin : handleRegister} className="space-y-4">
              {!isLogin && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Full Name
                  </label>
                  <input
                    type="text"
                    ref={registerNameRef}
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value });
                      setFieldErrors((prev) => ({ ...prev, name: "" }));
                    }}
                    className={`w-full rounded-lg border px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                      fieldErrors.name ? "border-red-400" : "border-slate-300"
                    }`}
                    required
                  />
                  {fieldErrors.name && (
                    <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p>
                  )}
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Username
                </label>
                <input
                  type="text"
                  ref={isLogin ? loginUsernameRef : undefined}
                  value={formData.username}
                  onChange={(e) => {
                    setFormData({ ...formData, username: e.target.value });
                    setFieldErrors((prev) => ({ ...prev, username: "" }));
                  }}
                  className={`w-full rounded-lg border px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                    fieldErrors.username ? "border-red-400" : "border-slate-300"
                  }`}
                  required
                />
                {fieldErrors.username && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.username}</p>
                )}
              </div>

              {!isLogin && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => {
                      setFormData({ ...formData, email: e.target.value });
                      setFieldErrors((prev) => ({ ...prev, email: "" }));
                    }}
                    className={`w-full rounded-lg border px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                      fieldErrors.email ? "border-red-400" : "border-slate-300"
                    }`}
                    required
                  />
                  {fieldErrors.email && (
                    <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>
                  )}
                </div>
              )}

              {!isLogin && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => {
                      setFormData({ ...formData, phone: e.target.value });
                      setFieldErrors((prev) => ({ ...prev, phone: "" }));
                    }}
                    className={`w-full rounded-lg border px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                      fieldErrors.phone ? "border-red-400" : "border-slate-300"
                    }`}
                    required
                  />
                  {fieldErrors.phone && (
                    <p className="mt-1 text-xs text-red-600">{fieldErrors.phone}</p>
                  )}
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Password
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => {
                    setFormData({ ...formData, password: e.target.value });
                    setFieldErrors((prev) => ({ ...prev, password: "" }));
                  }}
                  className={`w-full rounded-lg border px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                    fieldErrors.password ? "border-red-400" : "border-slate-300"
                  }`}
                  required
                />
                {fieldErrors.password && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p>
                )}
              </div>

              {!isLogin && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    I am a
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => {
                      setFormData({ ...formData, role: e.target.value as "admin" | "student" | "business" });
                      setFieldErrors((prev) => ({ ...prev, role: "" }));
                    }}
                    className={`w-full rounded-lg border px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                      fieldErrors.role ? "border-red-400" : "border-slate-300"
                    }`}
                  >
                    <option value="student">Student</option>
                    <option value="business">Business Owner</option>
                  </select>
                  {fieldErrors.role && (
                    <p className="mt-1 text-xs text-red-600">{fieldErrors.role}</p>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 font-semibold text-white shadow-lg transition hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50"
              >
                {loading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
              </button>
            </form>

            {isLogin && (
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowResetModal(true);
                    setResetRequestError("");
                    setResetRequestSuccess("");
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError("");
                  setSuccess("");
                }}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                {isLogin ? "Don't have an account? Register" : "Already have an account? Sign In"}
              </button>
            </div>
          </div>
        </div>
      </section>

      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Reset Password</h3>
                <p className="text-sm text-slate-600">Send a request to the admin to reset your password.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="rounded-full p-1 text-slate-500 hover:bg-slate-100"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {resetRequestError && (
              <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {resetRequestError}
              </div>
            )}

            {resetRequestSuccess && (
              <div className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">
                {resetRequestSuccess}
              </div>
            )}

            <form onSubmit={handleResetRequest} className="mt-4 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Username</label>
                <input
                  type="text"
                  value={resetRequest.username}
                  onChange={(e) => setResetRequest({ ...resetRequest, username: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Message (optional)</label>
                <textarea
                  value={resetRequest.message}
                  onChange={(e) => setResetRequest({ ...resetRequest, message: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  rows={3}
                />
              </div>
              <button
                type="submit"
                disabled={resetRequestLoading}
                className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {resetRequestLoading ? "Sending..." : "Send Request"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-slate-900 px-6 py-8 text-center text-slate-400">
        <p>&copy; 2026 Smart Task Management System. All rights reserved.</p>
      </footer>
    </div>
  );
}
