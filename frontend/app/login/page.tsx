
"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API = "http://localhost:5000/api";

export default function MemberLogin() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed.");
      }

      if (data.user?.role !== "MEMBER") {
        throw new Error(
          "This portal is only for library members. Please use the Admin Portal."
        );
      }

      sessionStorage.setItem("memberToken", data.token);
      sessionStorage.setItem(
        "memberUser",
        JSON.stringify(data.user)
      );

      router.push("/member");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to log in."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-5 py-10">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-slate-900 shadow-xl">

        {/* Library Logo and Heading */}
        <div className="mb-8 text-center">

          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-950">
            <div className="relative h-10 w-10">
              <span className="absolute left-1 top-1 h-6 w-5 rounded-sm bg-lime-400 shadow-sm" />
              <span className="absolute left-3 top-3 h-6 w-5 rounded-sm bg-cyan-400 shadow-sm" />
              <span className="absolute left-0 top-4 h-5 w-5 rounded-sm bg-emerald-400 shadow-sm" />
              <span className="absolute left-4 top-5 h-5 w-5 rounded-sm bg-blue-500 shadow-sm" />
            </div>
          </div>

          <p className="text-sm font-bold uppercase tracking-widest text-cyan-700">
            Library Intelligence
          </p>

          <h1 className="mt-5 text-3xl font-bold text-slate-900">
            Welcome Back!
          </h1>

          <p className="mt-3 text-base text-slate-500">
            Log in to access your library account.
          </p>
        </div>

        {/* Member Login Form */}
        <form onSubmit={handleLogin}>
          <div className="space-y-5">

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-900">
                Email Address
              </label>

              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your registered email"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-4 text-slate-900 placeholder:text-slate-400 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-900">
                Password
              </label>

              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-4 text-slate-900 placeholder:text-slate-400 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
              />
            </div>

          </div>

          {error && (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            className="mt-7 w-full rounded-xl bg-slate-950 px-4 py-4 font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Login to Library"}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-7 border-t border-slate-200 pt-6 text-center">

          <p className="text-sm text-slate-600">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-semibold text-cyan-700 hover:underline"
            >
              Register here
            </Link>
          </p>

          <div className="mt-5">
            <Link
              href="/"
              className="text-sm font-medium text-slate-500 hover:text-slate-900"
            >
              ← Administrator Portal
            </Link>
          </div>

        </div>
      </div>
    </main>
  );
}
