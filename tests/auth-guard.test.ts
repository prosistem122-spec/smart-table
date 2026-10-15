import { describe, expect, it } from "vitest";
import { AuthError, authErrorResponse } from "@/lib/admin/errors";

describe("authErrorResponse", () => {
  it("devolve 401 para não autenticado", async () => {
    const res = authErrorResponse(new AuthError("Não autenticado", 401));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Não autenticado");
  });

  it("devolve 403 sem permissão", async () => {
    const res = authErrorResponse(new AuthError("Sem permissão de administrador", 403));
    expect(res.status).toBe(403);
  });
});
