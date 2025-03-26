import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Lese den Request-Body
    const body = await request.json();
    const { message, userId, userEmail } = body;

    console.log('Mock-Webhook aufgerufen mit:', { message, userId, userEmail });

    // Simuliere eine Verzögerung wie bei einem echten externen Service
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Generiere eine einfache Antwort basierend auf der empfangenen Nachricht
    let response = `Ich habe deine Nachricht "${message}" erhalten. `;
    
    if (message.toLowerCase().includes('hallo') || message.toLowerCase().includes('hi')) {
      response += 'Hallo zurück! Wie kann ich dir helfen?';
    } else if (message.toLowerCase().includes('hilfe')) {
      response += 'Ich bin ein Test-Bot. Ich kann noch nicht viel, aber ich kann auf deine Nachrichten antworten.';
    } else if (message.toLowerCase().includes('danke')) {
      response += 'Gerne! Ich freue mich, wenn ich helfen konnte.';
    } else if (message.toLowerCase().includes('n8n')) {
      response += 'n8n ist ein mächtiges Workflow-Automatisierungstool. Diese Nachricht wird gerade von einer Mock-API simuliert, da der echte n8n-Webhook nicht erreichbar ist.';
    } else {
      response += 'Dies ist eine automatische Antwort von der Mock-API. Der echte n8n-Webhook ist noch nicht konfiguriert oder erreichbar.';
    }

    // Sende die Antwort zurück
    return NextResponse.json({ response });
  } catch (error) {
    console.error('Fehler im Mock-Webhook:', error);
    return NextResponse.json(
      { error: 'Fehler bei der Verarbeitung der Anfrage' },
      { status: 500 }
    );
  }
} 