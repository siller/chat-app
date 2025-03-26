import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Diese Seiten benötigen keine Authentifizierung
  if (
    pathname === '/login' ||
    pathname.startsWith('/auth/') ||
    pathname === '/'
  ) {
    return NextResponse.next();
  }

  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    // Keine Sitzung gefunden, Benutzer auf Login-Seite umleiten
    if (!session) {
      const redirectUrl = new URL('/login', request.url);
      return NextResponse.redirect(redirectUrl);
    }

    // Benutzer ist authentifiziert, fahre normal fort
    return NextResponse.next();
  } catch (error) {
    console.error('Fehler in der Middleware:', error);
    
    // Bei einem Fehler zur Login-Seite umleiten
    const redirectUrl = new URL('/login', request.url);
    return NextResponse.redirect(redirectUrl);
  }
}

export const config = {
  matcher: [
    /*
     * Verpasse folgende Pfade:
     * - API-Routen (/api/*)
     * - Statische Dateien (z.B. favicon.ico)
     * - Andere statische Ressourcen (/_next/*)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}; 