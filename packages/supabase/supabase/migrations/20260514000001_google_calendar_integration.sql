-- Tokens OAuth do Google Calendar por usuário
-- Tabela separada de users para não expor tokens sensíveis em ctx.profile (carregado em toda action)
CREATE TABLE IF NOT EXISTS user_google_tokens (
  id            uuid        PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id       uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  access_token  text        NOT NULL,
  refresh_token text,
  expires_at    timestamptz NOT NULL,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE user_google_tokens ENABLE ROW LEVEL SECURITY;

-- Usuário pode ler e deletar seus próprios tokens
-- Writes são feitos exclusivamente via service_role (supabaseAdmin), que bypassa RLS
CREATE POLICY "user_google_tokens: owner read"
  ON user_google_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_google_tokens: owner delete"
  ON user_google_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- ID do evento criado no Google Calendar para update/delete futuros
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS google_event_id text;
