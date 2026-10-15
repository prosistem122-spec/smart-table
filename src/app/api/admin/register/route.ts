import { NextResponse } from "next/server";
import { adminRegisterSchema } from "@/lib/validation";
import { isSupabaseConfigured } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      configured: false,
      needs_invite: false,
      bootstrap: false,
    });
  }

  try {
    const admin = createServiceClient();
    const { count, error } = await admin
      .from("admin_profiles")
      .select("user_id", { count: "exact", head: true });

    if (error) {
      return NextResponse.json(
        { configured: true, error: error.message },
        { status: 500 }
      );
    }

    const hasAdmins = (count ?? 0) > 0;
    const inviteConfigured = Boolean(process.env.ADMIN_INVITE_CODE?.trim());

    return NextResponse.json({
      configured: true,
      bootstrap: !hasAdmins,
      needs_invite: hasAdmins,
      invite_configured: inviteConfigured,
    });
  } catch (err) {
    return NextResponse.json(
      {
        configured: false,
        error: err instanceof Error ? err.message : "Erro",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      {
        error:
          "Supabase não está configurado. Cria .env.local com NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY.",
      },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = adminRegisterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { email, password, display_name, invite_code } = parsed.data;
  const admin = createServiceClient();

  const { count, error: countError } = await admin
    .from("admin_profiles")
    .select("user_id", { count: "exact", head: true });

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }

  const hasAdmins = (count ?? 0) > 0;
  if (hasAdmins) {
    const expected = process.env.ADMIN_INVITE_CODE?.trim();
    if (!expected) {
      return NextResponse.json(
        {
          error:
            "Já existe administrador. Define ADMIN_INVITE_CODE no .env.local para permitir novos registos.",
        },
        { status: 403 }
      );
    }
    if ((invite_code || "").trim() !== expected) {
      return NextResponse.json(
        { error: "Código de convite inválido" },
        { status: 403 }
      );
    }
  }

  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name },
    });

  if (createError || !created.user) {
    return NextResponse.json(
      {
        error:
          createError?.message ||
          "Não foi possível criar o utilizador no Auth",
      },
      { status: 400 }
    );
  }

  const { error: profileError } = await admin.from("admin_profiles").insert({
    user_id: created.user.id,
    email,
    display_name,
    is_active: true,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json(
      { error: profileError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    email,
    bootstrap: !hasAdmins,
  });
}
