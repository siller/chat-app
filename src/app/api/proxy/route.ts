import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Hilfsfunktion für Mock-Antworten mit besserer Variation
function generateMockResponse(message: string): string {
  let response = `Ich habe deine Nachricht "${message}" erhalten. `;
  
  // Einfache Muster für verschiedene Antworttypen
  if (message.toLowerCase().includes('hallo') || message.toLowerCase().includes('hi')) {
    response += 'Hallo zurück! Wie kann ich dir helfen?';
  } else if (message.toLowerCase().includes('hilfe')) {
    response += 'Ich bin ein Test-Bot. Ich kann auf deine Fragen antworten und mit dem n8n-Workflow interagieren.';
  } else if (message.toLowerCase().includes('danke')) {
    response += 'Gerne! Ich freue mich, wenn ich helfen konnte.';
  } else if (message.toLowerCase().includes('n8n')) {
    response += 'n8n ist ein mächtiges Workflow-Automatisierungstool. Du kannst damit Prozesse automatisieren und verschiedene Systeme miteinander verbinden.';
  } else if (message.toLowerCase().includes('wetter')) {
    response += 'Ich kann leider keine Echtzeit-Wetterdaten abrufen, da ich nur ein simulierter Bot bin. Mit dem echten n8n-Workflow könnte ich das aber!';
  } else if (message.toLowerCase().includes('zeit') || message.toLowerCase().includes('uhrzeit')) {
    response += `Die aktuelle Uhrzeit ist ${new Date().toLocaleTimeString()}.`;
  } else if (message.toLowerCase().includes('datum')) {
    response += `Heute ist der ${new Date().toLocaleDateString()}.`;
  } else {
    // Zufällige allgemeine Antworten
    const generalResponses = [
      'Ich bin nur ein simulierter Bot, aber ich tue mein Bestes, um zu helfen.',
      'Interessante Nachricht! Kannst du mehr Details geben?',
      'Das verstehe ich. Möchtest du mehr zu diesem Thema wissen?',
      'Ich lerne noch, aber ich versuche zu helfen, wo ich kann.',
      'Das ist ein spannendes Thema. Lass uns darüber sprechen!',
      'Hmm, darüber weiß ich nicht viel. Kannst du deine Frage umformulieren?'
    ];
    response += generalResponses[Math.floor(Math.random() * generalResponses.length)];
  }
  
  return response;
}

// Verzögerung simulieren, damit der Bot realistischer wirkt
async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function POST(request: NextRequest) {
  try {
    // Startzeit für Leistungsmessung
    const startTime = Date.now();
    
    // Lese den Request-Body
    const body = await request.json();
    const { message, userId, userEmail } = body;

    // Validiere Eingaben
    if (!message || typeof message !== 'string') {
      return NextResponse.json({
        response: '[SERVER] Fehler: Die Nachricht fehlt oder hat ein ungültiges Format.'
      }, { status: 400 });
    }

    // Die originale n8n-Webhook-URL
    const n8nWebhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL;
    
    // Verwende Mock-Antwort, wenn keine URL konfiguriert ist
    if (!n8nWebhookUrl || n8nWebhookUrl === '/api/mock-webhook') {
      console.log('Verwende Mock-Webhook, da keine n8n-URL konfiguriert ist');
      
      // Simuliere eine natürliche Verzögerung (500-1500ms)
      const randomDelay = 500 + Math.random() * 1000;
      await delay(randomDelay);
      
      return NextResponse.json({ 
        response: generateMockResponse(message),
        mock: true,
        processing_time_ms: Date.now() - startTime
      });
    }
    
    console.log('---------------------------------------');
    console.log('Proxy-Anfrage an n8n:', n8nWebhookUrl);
    console.log('Request-Body:', JSON.stringify({
      message,
      userId: userId || 'anonym',
      userEmail: userEmail || 'anonym@beispiel.de'
    }, null, 2));
    console.log('Zeitstempel:', new Date().toISOString());
    console.log('---------------------------------------');
    
    try {
      // Zusätzliche Header für bessere Diagnose
      const headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'n8n-chat-app-proxy',
        'Accept': 'application/json, text/plain, */*',
        'X-Chat-App-Version': '1.0.0',
        'X-Request-ID': `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
      };
      
      // Sende die Anfrage an den n8n-Webhook mit Timeout (15 Sekunden)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      console.log('Sende POST-Anfrage mit Request-ID:', headers['X-Request-ID']);
      
      const response = await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message,
          userId: userId || 'anonym',
          userEmail: userEmail || 'anonym@beispiel.de',
          timestamp: new Date().toISOString()
        }),
        signal: controller.signal
      });
      
      // Timeout abbrechen
      clearTimeout(timeoutId);
      
      console.log('---------------------------------------');
      console.log('Antwort vom Webhook:');
      console.log('Status:', response.status, response.statusText);
      console.log('Headers:', JSON.stringify(Object.fromEntries([...response.headers.entries()]), null, 2));
      console.log('Antwortzeit:', `${Date.now() - startTime}ms`);
      console.log('---------------------------------------');
      
      if (!response.ok) {
        console.error('n8n Webhook Fehler:', response.status, response.statusText);
        
        // Fallback-Antwort mit Mock-Service
        console.log('Verwende Mock-Antwort, da der Webhook einen Fehler zurückgegeben hat');
        
        // Kurze Verzögerung für bessere Benutzererfahrung
        await delay(500);
        
        return NextResponse.json({
          response: generateMockResponse(message),
          mock: true,
          error: `Webhook hat mit Status ${response.status} geantwortet`,
          processing_time_ms: Date.now() - startTime
        });
      }
      
      // Parse die Antwort vom n8n-Webhook
      const responseText = await response.text();
      console.log('Antwort vom n8n-Webhook (Text):', responseText);
      
      let data;
      try {
        // Versuche, die Antwort als JSON zu parsen
        data = JSON.parse(responseText);
        console.log('Antwort vom n8n-Webhook (JSON):', data);
      } catch (jsonError) {
        console.error('Fehler beim Parsen der JSON-Antwort:', jsonError);
        // Wenn der Webhook eine leere Antwort oder kein gültiges JSON zurückgibt
        if (!responseText || responseText.trim() === '') {
          console.log('Webhook hat eine leere Antwort zurückgegeben');
          data = { 
            response: 'Der n8n-Webhook hat zwar erfolgreich geantwortet, aber keine Daten zurückgegeben.',
            mock: false,
            empty_response: true
          };
        } else {
          // Verwende den Text als Antwort
          data = { 
            response: responseText || 'Antwort vom n8n-Webhook (kein gültiges JSON)',
            mock: false,
            raw_text: true
          };
        }
      }
      
      // Stelle sicher, dass ein "response"-Feld vorhanden ist
      if (!data.response) {
        console.log('Kein response-Feld in der Antwort, versuche Extraktion');
        
        // Versuche, eine sinnvolle Antwort aus dem JSON zu extrahieren
        if (data.output) {
          // Neue Struktur vom n8n-Webhook: { "output": "Antworttext" }
          data.response = typeof data.output === 'string' 
            ? data.output.trim() 
            : JSON.stringify(data.output);
        } else if (data.message) {
          data.response = data.message;
        } else if (data.result) {
          data.response = typeof data.result === 'string' ? data.result : JSON.stringify(data.result);
        } else if (data.data) {
          data.response = typeof data.data === 'string' ? data.data : JSON.stringify(data.data);
        } else if (data.text) {
          data.response = data.text;
        } else if (data.content) {
          data.response = data.content;
        } else if (typeof data === 'object') {
          // Wenn die Antwort ein Objekt ist, konvertiere es zu einem String
          data.response = JSON.stringify(data);
        } else {
          data = { 
            response: String(data),
            mock: false,
            converted: true
          };
        }
      }
      
      // Bereinige die Antwort, falls es sich um einen String mit Zeilenumbrüchen handelt
      if (typeof data.response === 'string') {
        data.response = data.response.trim()
          // Entferne überflüssige Zeilenumbrüche am Anfang und Ende
          .replace(/^\n+|\n+$/g, '')
          // Entferne doppelte Anführungszeichen, falls vorhanden
          .replace(/^"|"$/g, '');
      }
      
      // Füge Verarbeitungszeit hinzu
      data.processing_time_ms = Date.now() - startTime;
      
      // Sende die Antwort zurück zum Client
      return NextResponse.json(data);
    } catch (error: any) {
      console.error('Fehler beim Aufrufen des n8n-Webhooks:', error.message, error.stack);
      
      // Prüfe, ob es sich um einen Timeout handelt
      const isTimeout = error.name === 'AbortError';
      
      // Fallback-Antwort mit Mock-Service bei Netzwerkfehlern
      console.log(`Verwende Mock-Antwort, da beim Aufruf des Webhooks ein ${isTimeout ? 'Timeout' : 'Fehler'} aufgetreten ist`);
      
      // Kurze Verzögerung für bessere Benutzererfahrung
      await delay(500);
      
      return NextResponse.json({
        response: isTimeout 
          ? `Die Anfrage an den n8n-Webhook hat zu lange gedauert. Hier ist eine alternative Antwort: ${generateMockResponse(message)}`
          : generateMockResponse(message),
        mock: true,
        error: error.message || 'Unbekannter Fehler',
        is_timeout: isTimeout,
        processing_time_ms: Date.now() - startTime
      });
    }
  } catch (error: any) {
    console.error('Proxy-Fehler:', error.message, error.stack);
    
    return NextResponse.json({
      response: `[SERVER] Ein Fehler ist aufgetreten: ${error.message || 'Unbekannter Fehler'}`,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
} 