import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const n8nWebhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL;
  
  if (!n8nWebhookUrl) {
    return NextResponse.json({ error: 'Webhook-URL ist nicht konfiguriert' }, { status: 500 });
  }
  
  try {
    // Test 1: Einfache GET-Anfrage
    const getResponse = await fetch(n8nWebhookUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'n8n-chat-app-test',
        'Accept': '*/*',
      },
    });
    
    const getStatus = getResponse.status;
    const getHeaders = Object.fromEntries([...getResponse.headers.entries()]);
    let getText = '';
    
    try {
      getText = await getResponse.text();
    } catch (e) {
      getText = 'Konnte Antworttext nicht lesen';
    }
    
    // Test 2: OPTIONS-Anfrage (CORS-Preflight)
    const optionsResponse = await fetch(n8nWebhookUrl, {
      method: 'OPTIONS',
      headers: {
        'User-Agent': 'n8n-chat-app-test',
        'Accept': '*/*',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type',
        'Origin': 'http://localhost:3000',
      },
    });
    
    const optionsStatus = optionsResponse.status;
    const optionsHeaders = Object.fromEntries([...optionsResponse.headers.entries()]);
    
    // Test 3: POST mit minimal Data
    const postResponse = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'User-Agent': 'n8n-chat-app-test',
        'Content-Type': 'application/json',
        'Accept': '*/*',
      },
      body: JSON.stringify({ test: 'Einfacher Test vom API-Tester' }),
    });
    
    const postStatus = postResponse.status;
    const postHeaders = Object.fromEntries([...postResponse.headers.entries()]);
    let postText = '';
    
    try {
      postText = await postResponse.text();
    } catch (e) {
      postText = 'Konnte Antworttext nicht lesen';
    }
    
    // Ergebnisse zusammenfassen
    return NextResponse.json({
      webhookUrl: n8nWebhookUrl,
      getTest: {
        status: getStatus,
        headers: getHeaders,
        body: getText,
      },
      optionsTest: {
        status: optionsStatus,
        headers: optionsHeaders,
        corsSupport: !!optionsHeaders['access-control-allow-origin'],
      },
      postTest: {
        status: postStatus,
        headers: postHeaders,
        body: postText,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: 'Fehler beim Testen des Webhooks',
      message: error.message,
      stack: error.stack
    }, { status: 500 });
  }
} 