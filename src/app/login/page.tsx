"use client";

import { useState, useTransition } from "react";
import { loginAction } from "./actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [password, setPassword] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const formData = new FormData();
    formData.set("password", password);
    startTransition(() => loginAction(formData));
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 p-8">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          TMCP Counsel Connections
        </h1>
        <p className="mt-2 text-slate-600">
          Texas Minority Counsel Program — Attorney Interview Scheduling
        </p>
      </div>

      <Card className="w-full max-w-sm shadow-md">
        <CardHeader>
          <CardTitle>Sign In</CardTitle>
          <CardDescription>Enter your access code to continue.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Access Code
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter access code"
                required
                autoFocus
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
              />
            </div>

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Signing in…" : "Sign In"}
            </Button>

            <p className="text-center text-xs text-red-500 empty:hidden">
              {/* Error handled via searchParams; resolved client-side if needed */}
            </p>
          </form>

          <div className="mt-6 rounded-md bg-slate-50 p-3 text-xs text-slate-500">
            <p className="font-medium text-slate-600">Demo access codes:</p>
            <p className="mt-1">
              <span className="font-mono font-semibold">admin</span> — TMCP
              Staff Dashboard
            </p>
            <p>
              <span className="font-mono font-semibold">company</span> —
              JPMorgan Chase Portal
            </p>
          </div>
        </CardContent>
      </Card>

      <p className="mt-10 text-sm text-slate-400">
        © {new Date().getFullYear()} Texas Minority Counsel Program
      </p>
    </div>
  );
}
