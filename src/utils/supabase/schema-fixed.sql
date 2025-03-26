-- Schema für Chat-Nachrichten und Konversationen
-- Sicherheitsrichtlinien für Row-Level-Security (RLS)

-- Konversationen-Tabelle (muss vor der messages-Tabelle erstellt werden)
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Neue Konversation',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Chat-Nachrichten-Tabelle
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  sender TEXT NOT NULL CHECK (sender IN ('user', 'bot')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE
);

-- Funktion zum Aktualisieren des 'updated_at'-Felds
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger für das automatische Aktualisieren von 'updated_at'
CREATE TRIGGER update_conversations_updated_at
BEFORE UPDATE ON conversations
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

-- Sicherheitsrichtlinien (RLS)
-- Aktiviere RLS für beide Tabellen
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Richtlinien für Konversationen
CREATE POLICY "Benutzer können nur ihre eigenen Konversationen sehen"
  ON conversations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Benutzer können nur ihre eigenen Konversationen erstellen"
  ON conversations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Benutzer können nur ihre eigenen Konversationen aktualisieren"
  ON conversations
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Benutzer können nur ihre eigenen Konversationen löschen"
  ON conversations
  FOR DELETE
  USING (auth.uid() = user_id);

-- Richtlinien für Nachrichten
CREATE POLICY "Benutzer können nur Nachrichten aus ihren eigenen Konversationen sehen"
  ON messages
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM conversations WHERE id = messages.conversation_id
    )
  );

CREATE POLICY "Benutzer können nur Nachrichten in ihren eigenen Konversationen erstellen"
  ON messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    auth.uid() IN (
      SELECT user_id FROM conversations WHERE id = messages.conversation_id
    )
  );

CREATE POLICY "Benutzer können nur ihre eigenen Nachrichten löschen"
  ON messages
  FOR DELETE
  USING (
    auth.uid() = user_id
  );

-- Indizes für schnellere Abfragen
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id); 