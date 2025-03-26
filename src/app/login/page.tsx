'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import ThemeRegistry from '@/components/ThemeRegistry';
import {
  Box,
  Button,
  Container,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material';
import { Google as GoogleIcon } from '@mui/icons-material';

// Apple Icon als SVG-Komponente
const AppleIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    style={{ marginRight: 8 }}
  >
    <path
      d="M16.65 5.68c-1.57 0-2.78.77-3.76 1.16-.82.33-1.42.33-2.21 0-.84-.39-2.07-1.16-3.73-1.16-2.36 0-4.95 1.99-4.95 6.08 0 4.08 3.17 8.1 4.95 8.1 1.17 0 2.01-.91 3.32-1.38.76-.27 1.31-.27 2.05 0 1.31.47 2.15 1.38 3.33 1.38 1.78 0 4.95-4.02 4.95-8.1 0-4.09-2.6-6.08-4.95-6.08z"
      fill="currentColor"
    />
  </svg>
);

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setError(error.message);
      }
    } catch (err: any) {
      setError(err.message || 'Ein Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setError(error.message);
      }
    } catch (err: any) {
      setError(err.message || 'Ein Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemeRegistry>
      <Box
        sx={{
          display: 'flex',
          minHeight: '100vh',
          bgcolor: 'background.default',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Container maxWidth="sm">
          <Paper 
            elevation={3}
            sx={{ 
              p: 4, 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center'
            }}
          >
            <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
              Anmelden
            </Typography>
            
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
              Melde dich an, um mit dem n8n-Bot zu chatten
            </Typography>

            {error && (
              <Alert severity="error" sx={{ width: '100%', mb: 3 }}>
                {error}
              </Alert>
            )}

            <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Button
                variant="outlined"
                fullWidth
                onClick={handleGoogleSignIn}
                disabled={loading}
                startIcon={
                  loading ? <CircularProgress size={20} /> : <GoogleIcon />
                }
                sx={{ 
                  py: 1.5, 
                  borderColor: 'divider',
                  color: 'text.primary',
                  bgcolor: 'background.paper',
                  '&:hover': {
                    bgcolor: 'action.hover',
                    borderColor: 'divider'
                  }
                }}
              >
                Mit Google anmelden
              </Button>

              <Button
                variant="outlined"
                fullWidth
                onClick={handleAppleSignIn}
                disabled={loading}
                startIcon={
                  loading ? <CircularProgress size={20} /> : <AppleIcon />
                }
                sx={{ 
                  py: 1.5, 
                  borderColor: 'divider',
                  color: 'text.primary',
                  bgcolor: 'background.paper',
                  '&:hover': {
                    bgcolor: 'action.hover',
                    borderColor: 'divider'
                  }
                }}
              >
                Mit Apple anmelden
              </Button>
            </Box>
          </Paper>
        </Container>
      </Box>
    </ThemeRegistry>
  );
} 