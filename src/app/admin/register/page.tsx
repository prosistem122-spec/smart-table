"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type RegisterStatus = {
  configured: boolean;
  bootstrap?: boolean;
  needs_invite?: boolean;
  invite_configured?: boolean;
  error?: string;
};

export default function AdminRegisterPage() {
  const router = useRouter();
  const [status, setStatus] = useState<RegisterStatus | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/register");
        const data = (await res.json()) as RegisterStatus;
        if (!cancelled) setStatus(data);
      } catch {
        if (!cancelled) {
          setStatus({
            configured: false,
            error: "Não foi possível contactar a API de registo.",
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          display_name: displayName,
          invite_code: inviteCode || undefined,
        }),
      });
      const data = (await res.json()) as { error?: string; ok?: boolean };
      if (!res.ok) {
        setError(data.error || "Falha no registo");
        setLoading(false);
        return;
      }

      const supabase = createBrowserSupabaseClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (authError) {
        setError(
          `Conta criada, mas o login falhou: ${authError.message}. Vai a /admin/login.`
        );
        setLoading(false);
        return;
      }

      router.replace("/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no registo");
      setLoading(false);
    }
  }

  const blocked =
    status &&
    status.configured &&
    status.needs_invite &&
    status.invite_configured === false;

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={onSubmit}>
        <div style={{ color: "#2446EE", fontWeight: 700, marginBottom: 8 }}>
          Smart Table
        </div>
        <h1>Criar conta admin</h1>
        <p>
          {status?.bootstrap
            ? "Primeiro administrador — sem código de convite."
            : status?.needs_invite
              ? "Registo com código de convite da equipa."
              : "Registo real no Supabase Auth + perfil admin."}
        </p>

        {status && !status.configured && (
          <p style={{ color: "#C2492E", fontSize: "0.85rem" }}>
            {status.error ||
              "Supabase não configurado. Cria .env.local com as chaves do projeto e aplica a migração SQL."}
          </p>
        )}

        {blocked && (
          <p style={{ color: "#C2492E", fontSize: "0.85rem" }}>
            Já existe admin. Define{" "}
            <code>ADMIN_INVITE_CODE</code> no{" "}
            <code>.env.local</code> para permitir novos registos.
          </p>
        )}

        <label htmlFor="display_name">Nome</label>
        <input
          id="display_name"
          type="text"
          required
          minLength={2}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          autoComplete="name"
          disabled={!status?.configured || blocked}
        />

        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          disabled={!status?.configured || blocked}
        />

        <label htmlFor="password">Palavra-passe (mín. 8)</label>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          disabled={!status?.configured || blocked}
        />

        {status?.needs_invite && status.invite_configured && (
          <>
            <label htmlFor="invite">Código de convite</label>
            <input
              id="invite"
              type="text"
              required
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              autoComplete="off"
            />
          </>
        )}

        {error && (
          <p style={{ color: "#C2492E", fontSize: "0.85rem" }}>{error}</p>
        )}

        <button
          className="admin-btn"
          type="submit"
          disabled={loading || !status?.configured || blocked}
          style={{ width: "100%" }}
        >
          {loading ? "A criar conta…" : "Registar e entrar"}
        </button>

        <p style={{ marginTop: 14, fontSize: "0.85rem", textAlign: "center" }}>
          Já tens conta?{" "}
          <Link href="/admin/login" style={{ color: "#2446EE", fontWeight: 600 }}>
            Entrar
          </Link>
        </p>
      </form>
    </div>
  );
}
