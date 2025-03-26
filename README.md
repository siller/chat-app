# n8n Chat App

Diese Anwendung ermöglicht Benutzern, sich mit Google oder Apple anzumelden und mit einem n8n-Workflow über einen Webhook zu chatten. Die Anwendung speichert Chatnachrichten in Supabase und bietet eine benutzerfreundliche Oberfläche zum Verwalten von Konversationen.

## Funktionen

- Authentifizierung mit Google und Apple OAuth über Supabase
- Chat-Interface zum Austausch mit einem n8n-Bot
- Speicherung von Chatverläufen in Supabase
- Verwalten mehrerer Konversationen
- Löschen von Nachrichten und Konversationen
- Responsive Design für Desktop und Mobile
- Robuste Fehlerbehandlung mit Fallback-Lösungen
- Integration mit n8n-Workflows über Webhooks

## Voraussetzungen

- Node.js 18+ und npm
- Supabase-Konto und Projekt
- Google OAuth-Client-ID (für Google-Anmeldung)
- Apple OAuth-Client-ID (für Apple-Anmeldung)
- n8n-Installation mit einem konfigurierten Webhook

## Installation

1. Repository klonen oder Dateien herunterladen
2. Abhängigkeiten installieren:

```bash
npm install
```

3. `.env.local`-Datei im Stammverzeichnis erstellen:

```
# Supabase Konfiguration (bitte mit echten Werten ersetzen)
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Google OAuth Einstellungen
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id

# Apple OAuth Einstellungen
NEXT_PUBLIC_APPLE_CLIENT_ID=your-apple-client-id

# n8n Webhook URL
NEXT_PUBLIC_N8N_WEBHOOK_URL=your-n8n-webhook-url
```

4. Entwicklungsserver starten:

```bash
npm run dev
```

5. Im Browser `http://localhost:3000` öffnen.

## Datenbankeinrichtung in Supabase

1. Supabase-Projekt erstellen
2. Authentifizierung einrichten:
   - Google OAuth und Apple OAuth aktivieren
   - Umleitung-URLs auf `https://your-domain.com/auth/callback` und `http://localhost:3000/auth/callback` (für die Entwicklung) setzen
3. URL und anonynen API-Key in `.env.local` eintragen
4. SQL-Editor öffnen und das folgende Schema ausführen (auch in `src/utils/supabase/schema-fixed.sql` zu finden):

```sql
-- Konversationen-Tabelle
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

-- Trigger für automatische Aktualisierung von updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversations_updated_at
BEFORE UPDATE ON conversations
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

-- Sicherheitsrichtlinien aktivieren
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Richtlinien für Konversationen
CREATE POLICY "Benutzer können nur ihre eigenen Konversationen sehen"
  ON conversations FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Benutzer können nur ihre eigenen Konversationen erstellen"
  ON conversations FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Benutzer können nur ihre eigenen Konversationen aktualisieren"
  ON conversations FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Benutzer können nur ihre eigenen Konversationen löschen"
  ON conversations FOR DELETE USING (auth.uid() = user_id);

-- Richtlinien für Nachrichten
CREATE POLICY "Benutzer können nur Nachrichten aus ihren eigenen Konversationen sehen"
  ON messages FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM conversations WHERE id = messages.conversation_id)
  );

CREATE POLICY "Benutzer können nur Nachrichten in ihren eigenen Konversationen erstellen"
  ON messages FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    auth.uid() IN (SELECT user_id FROM conversations WHERE id = messages.conversation_id)
  );

CREATE POLICY "Benutzer können nur ihre eigenen Nachrichten löschen"
  ON messages FOR DELETE USING (auth.uid() = user_id);

-- Indizes für schnellere Abfragen
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_user_id ON messages(user_id);
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
```

## n8n-Konfiguration

1. n8n-Workflow mit einem Webhook-Knoten erstellen:
   - POST-Methode aktivieren
   - Auf die folgenden Eingabeparameter zugreifen: `message`, `userId`, `userEmail`
   - Workflow konfigurieren, um Antworten in folgendem Format zurückzugeben:
     ```json
     {
       "response": "Hier steht die Antwort auf die Benutzernachricht"
     }
     ```
2. Webhook-URL kopieren und in `.env.local` eintragen
3. Der Workflow sollte eine Antwort in Form von JSON zurückgeben; falls nicht, verarbeitet die App die Antwort automatisch

## Webhooks testen

Um den n8n-Webhook manuell zu testen, kann folgender curl-Befehl verwendet werden:

```bash
curl -X POST "https://your-n8n-webhook-url" \
  -H "Content-Type: application/json" \
  -d '{"message":"Hallo", "userId":"test-user", "userEmail":"test@example.com"}'
```

## Produktions-Build

```bash
npm run build
npm run start
```

## Fehlerbehebung

- **CORS-Fehler**: Die Anwendung verwendet einen lokalen Proxy, um CORS-Probleme zu vermeiden
- **Webhook nicht erreichbar**: Die Anwendung bietet Fallback-Antworten für nicht erreichbare Webhooks
- **Probleme mit der Datenbankmigration**: Stelle sicher, dass zuerst die `conversations`-Tabelle und dann die `messages`-Tabelle erstellt wird

## Technologien

- Next.js 15
- React 19
- Supabase (Authentifizierung und Datenbank)
- Tailwind CSS 4
- TypeScript 5
- n8n (Workflow-Automatisierung)

## Lizenz

Dieses Projekt steht unter der MIT-Lizenz.

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
