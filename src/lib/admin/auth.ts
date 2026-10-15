import { createUserServerClient, createServiceClient } from "@/lib/supabase/server";
import { AuthError } from "@/lib/admin/errors";

export { AuthError, authErrorResponse } from "@/lib/admin/errors";

export async function requireAdmin(): Promise<{
  userId: string;
  email: string;
}> {
  const supabase = await createUserServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new AuthError("Não autenticado", 401);
  }

  const admin = createServiceClient();
  const { data: profile } = await admin
    .from("admin_profiles")
    .select("user_id, email, is_active")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile || !profile.is_active) {
    throw new AuthError("Sem permissão de administrador", 403);
  }

  return { userId: user.id, email: user.email || profile.email };
}
