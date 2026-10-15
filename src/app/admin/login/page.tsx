"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { Suspense } from "react";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    params.get("error") === "supabase_not_configured"
      ? "Supabase não está configurado. Define as variáveis em .env.local."
      : null
  );
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }
      router.replace("/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no login");
      setLoading(false);
    }
  }

  async function onLogout() {
    try {
      const supabase = createBrowserSupabaseClient();
      await supabase.auth.signOut();
      setError(null);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={onSubmit}>
        <div style={{ color: "#2446EE", fontWeight: 700, marginBottom: 8 }}>
          Smart Table
        </div>
        <h1>Acesso administrativo</h1>
        <p>Área protegida para a equipa comercial.</p>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
        />
        <label htmlFor="password">Palavra-passe</label>
        <input
          id="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
        {error && (
          <p style={{ color: "#C2492E", fontSize: "0.85rem" }}>{error}</p>
        )}
        <button className="admin-btn" type="submit" disabled={loading} style={{ width: "100%" }}>
          {loading ? "A entrar…" : "Entrar"}
        </button>
        <button
          type="button"
          className="admin-btn ghost"
          style={{ width: "100%", marginTop: 8 }}
          onClick={onLogout}
        >
          Terminar sessão
        </button>
      </form>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="login-wrap">A carregar…</div>}>
      <LoginForm />
    </Suspense>
  );
}
