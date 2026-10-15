# Smart Table — Captação, Tracking e Admin

Aplicação Next.js (App Router) + TypeScript + Supabase para a análise gratuita Smart Table: identificação de leads, funil instrumentado, persistência de eventos e painel **Inteligência Comercial**.

O funil visual original está preservado em [`legacy/smart-table-funil-original.html`](legacy/smart-table-funil-original.html).

## Funcionalidades

| Área | Estado |
|------|--------|
| Formulário inicial (nome + telefone + consentimento) | Implementado |
| Funil original (20 etapas) com tracking | Implementado |
| APIs públicas session/events/answers | Implementado |
| Painel admin + lista + perfil + timeline | Implementado |
| Migração SQL + RLS | Implementado |
| Política de privacidade | Implementado |
| Testes unitários (Vitest) | Implementado |
| Smoke E2E (Playwright) | Implementado |
| Persistência real em produção | **Requer** configurar Supabase |

Sem variáveis Supabase, a UI pública funciona; as APIs devolvem `503` e o admin não autentica.

## Requisitos

- Node.js 20+
- Conta [Supabase](https://supabase.com) (projeto PostgreSQL)

## Configuração

1. Copiar variáveis:

```bash
cp .env.example .env.local
```

2. Preencher:

| Variável | Descrição |
|----------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anónima (browser / Auth) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role (**só servidor**, nunca no browser) |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Número WhatsApp da equipa (ex: `25884...`) |
| `INACTIVE_AFTER_MS` | Inatividade (default `900000` = 15 min) |
| `EVENT_RETENTION_DAYS` | Retenção (default `365`) |
| `PUBLIC_RATE_LIMIT_PER_MINUTE` | Rate limit APIs públicas |

3. Aplicar a migração no SQL Editor do Supabase (ou CLI):

[`supabase/migrations/001_init.sql`](supabase/migrations/001_init.sql)

Cria: `leads`, `sessions`, `events`, `funnel_answers`, `lead_notes`, `admin_profiles`, índices, RLS e `is_admin()`.

4. Criar o primeiro administrador:

- Authentication → Users → Add user (email + password)
- No SQL Editor:

```sql
insert into public.admin_profiles (user_id, email, display_name, is_active)
values (
  '<USER_UUID_DO_AUTH>',
  'admin@exemplo.com',
  'Admin',
  true
);
```

5. Instalar e correr:

```bash
npm install
npm run dev
```

- Público: http://localhost:3000  
- Admin: http://localhost:3000/admin/login  
- Privacidade: http://localhost:3000/privacidade  

## Comandos

```bash
npm run dev          # desenvolvimento
npm run build        # build produção
npm start            # servidor produção
npm test             # testes unitários Vitest
npm run test:e2e     # Playwright (sobe o dev server)
npm run lint         # ESLint
```

## Arquitetura (resumo)

```
Visitante → LeadForm → POST /api/public/session
         → Funil → track() → POST /api/public/events|answers
Admin Auth → /api/admin/* (JWT + admin_profiles) → métricas / leads / notas
```

- Chave **service role** apenas em Route Handlers.
- Visitantes **não** leem PII de outros (RLS sem políticas anon; APIs validam `session_id` ↔ `lead_id`).
- Match de retorno: telefone normalizado **exacto** (não por nome semelhante).
- Inatividade: último evento + `INACTIVE_AFTER_MS` — **não** afirma abandono definitivo.

## Retenção / limpeza

Coluna `leads.retention_until`. Exemplo de limpeza manual (rever antes de correr em produção):

```sql
-- Exemplo: apagar leads cuja retenção expirou (CASCADE limpa sessões/eventos)
delete from public.leads
where retention_until is not null
  and retention_until < now();
```

Agendar via cron / Supabase scheduled function conforme a vossa política.

## Alterações à página inicial

1. Novo ecrã de identificação antes do funil (nome, telefone, consentimentos, link privacidade, CTA **Analisar o meu restaurante**).
2. Funil original portado para React com os mesmos passos e visual.
3. Instrumentação de eventos (`data-track` / nomes estáveis) sem bloquear a navegação se a API falhar.

## Configuração manual restante

- Criar projeto Supabase e colar chaves em `.env.local`
- Correr `001_init.sql`
- Criar utilizador Auth + linha em `admin_profiles`
- Substituir `NEXT_PUBLIC_WHATSAPP_NUMBER` pelo número real
- (Opcional) Domínio de produção e redirect URLs no Supabase Auth

## Testes

Ver secção “Resultados dos testes” após execução local com `npm test` / `npm run test:e2e`.
