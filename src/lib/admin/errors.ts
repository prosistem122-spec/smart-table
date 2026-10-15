export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function authErrorResponse(err: unknown) {
  if (err instanceof AuthError) {
    return Response.json({ error: err.message }, { status: err.status });
  }
  if (err instanceof Error && err.message.includes("Supabase")) {
    return Response.json({ error: err.message }, { status: 503 });
  }
  console.error(err);
  return Response.json({ error: "Erro interno" }, { status: 500 });
}
