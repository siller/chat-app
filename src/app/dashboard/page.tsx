'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Message, Conversation, saveMessage, getMessages, getConversations, createConversation, deleteConversation, deleteMessage } from '@/utils/chat';
import ThemeRegistry from '@/components/ThemeRegistry';

// Material UI Komponenten
import {
  AppBar, Toolbar, Typography, IconButton, Button, TextField,
  Drawer, List, ListItem, ListItemButton, ListItemText, ListItemIcon,
  Paper, Box, CircularProgress, Divider, InputAdornment,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  Card, CardContent
} from '@mui/material';

// Material Icons
import {
  Menu as MenuIcon,
  Send as SendIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Logout as LogoutIcon,
  Chat as ChatIcon,
  Close as CloseIcon
} from '@mui/icons-material';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{open: boolean, type: 'message' | 'conversation', id: string}>({
    open: false,
    type: 'message',
    id: ''
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Drawer-Breite für Desktop
  const drawerWidth = 280;

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        loadConversations();
      } else {
        router.push('/login');
      }
      setLoading(false);
    };

    getUser();
  }, [router, supabase.auth]);

  useEffect(() => {
    // Scroll zum Ende der Nachrichten
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Lade Konversationen für den Benutzer
  const loadConversations = async () => {
    const convs = await getConversations();
    setConversations(convs);
    
    if (convs.length > 0 && !activeConversation) {
      setActiveConversation(convs[0].id);
      loadMessages(convs[0].id);
    }
  };

  // Lade Nachrichten für eine Konversation
  const loadMessages = async (conversationId: string) => {
    setLoading(true);
    const msgs = await getMessages(conversationId);
    setMessages(msgs);
    setLoading(false);
  };

  // Wechsle zu einer anderen Konversation
  const switchConversation = (conversationId: string) => {
    setActiveConversation(conversationId);
    loadMessages(conversationId);
    setDrawerOpen(false);
  };

  // Starte eine neue Konversation
  const startNewConversation = async () => {
    if (!user) return;
    
    const conversationId = await createConversation(user.id);
    if (conversationId) {
      await loadConversations();
      setActiveConversation(conversationId);
      setMessages([]);
      setDrawerOpen(false);
    }
  };

  // Dialog zum Löschen öffnen
  const openDeleteDialog = (type: 'message' | 'conversation', id: string) => {
    setDeleteDialog({
      open: true,
      type,
      id
    });
  };

  // Dialog zum Löschen schließen
  const closeDeleteDialog = () => {
    setDeleteDialog({
      ...deleteDialog,
      open: false
    });
  };

  // Element löschen (Nachricht oder Konversation)
  const handleDelete = async () => {
    const { type, id } = deleteDialog;
    
    if (type === 'conversation') {
      await deleteConversation(id);
      
      // Wenn die aktive Konversation gelöscht wurde, zur ersten verfügbaren wechseln
      if (id === activeConversation) {
        const updatedConversations = conversations.filter(c => c.id !== id);
        if (updatedConversations.length > 0) {
          setActiveConversation(updatedConversations[0].id);
          loadMessages(updatedConversations[0].id);
        } else {
          setActiveConversation(null);
          setMessages([]);
        }
      }
      
      await loadConversations();
    } else if (type === 'message') {
      const success = await deleteMessage(id);
      if (success && activeConversation) {
        loadMessages(activeConversation);
      }
    }
    
    closeDeleteDialog();
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputMessage.trim() || sending || !user) return;
    
    // Erstelle eine neue Konversation, wenn noch keine aktiv ist
    let currentConversationId = activeConversation;
    if (!currentConversationId) {
      currentConversationId = await createConversation(user.id);
      if (!currentConversationId) {
        console.error('Konnte keine neue Konversation erstellen');
        return;
      }
      setActiveConversation(currentConversationId);
      await loadConversations();
    }
    
    // Erstelle UI-ID für die temporäre Anzeige
    const tempId = `temp-${Date.now()}`;
    
    const userMessage: Message = {
      id: tempId,
      content: inputMessage,
      sender: 'user',
      timestamp: new Date(),
      conversation_id: currentConversationId
    };

    // Nachricht im UI anzeigen und in Datenbank speichern
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setSending(true);
    
    // Speichere die Benutzernachricht in der Datenbank
    const savedMessage = await saveMessage(userMessage, user.id);
    
    // Optional: UI mit der tatsächlichen ID aktualisieren
    if (savedMessage.saved) {
      setMessages(prev => prev.map(msg => 
        msg.id === tempId ? { ...msg, id: savedMessage.id } : msg
      ));
    }

    try {
      // Speichere die Nachricht, damit wir sie für den Fallback nutzen können
      const currentMessage = inputMessage;
      
      console.log('Sende Anfrage an den Proxy-Endpunkt');
      
      try {
        // Verwende unseren eigenen API-Proxy, um CORS-Probleme zu vermeiden
        const response = await fetch('/api/proxy', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: currentMessage,
            userId: user?.id || 'anonym',
            userEmail: user?.email || 'anonym@beispiel.de',
          }),
        });

        if (!response.ok) {
          throw new Error(`Server hat mit Status ${response.status} geantwortet`);
        }

        const data = await response.json();
        console.log('Antwort erhalten:', data);
        
        // Bot-Antwort mit temporärer ID erstellen
        const tempBotId = `temp-bot-${Date.now()}`;
        
        // Bot-Antwort hinzufügen
        const botMessage: Message = {
          id: tempBotId,
          content: data.response || 'Es tut mir leid, ich konnte keine Antwort generieren.',
          sender: 'bot',
          timestamp: new Date(),
          conversation_id: currentConversationId
        };

        // Nachricht im UI anzeigen und in Datenbank speichern
        setMessages(prev => [...prev, botMessage]);
        const savedBotMessage = await saveMessage(botMessage, user.id);
        
        // Optional: UI mit der tatsächlichen ID aktualisieren
        if (savedBotMessage.saved) {
          setMessages(prev => prev.map(msg => 
            msg.id === tempBotId ? { ...msg, id: savedBotMessage.id } : msg
          ));
        }
        
        // Konversationsliste aktualisieren, um neueste Nachrichten zu zeigen
        await loadConversations();
      } catch (error: any) {
        console.error('Fehler beim Senden der Nachricht:', error);
        
        // Temporäre ID für die Fehlermeldung
        const tempErrorId = `temp-error-${Date.now()}`;
        
        // Fehlermeldung als Bot-Nachricht anzeigen
        const errorMessage: Message = {
          id: tempErrorId,
          content: `Fehler: ${error.message || 'Es ist ein unbekannter Fehler aufgetreten.'}`,
          sender: 'bot',
          timestamp: new Date(),
          conversation_id: currentConversationId
        };

        setMessages(prev => [...prev, errorMessage]);
        const savedErrorMessage = await saveMessage(errorMessage, user.id);
        
        // Optional: UI mit der tatsächlichen ID aktualisieren
        if (savedErrorMessage.saved) {
          setMessages(prev => prev.map(msg => 
            msg.id === tempErrorId ? { ...msg, id: savedErrorMessage.id } : msg
          ));
        }
      }
    } finally {
      setSending(false);
    }
  };

  if (loading && !activeConversation) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <ThemeRegistry>
      <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f5f5f5' }}>
        {/* App Bar */}
        <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
          <Toolbar>
            <IconButton
              edge="start"
              color="inherit"
              aria-label="menu"
              onClick={() => setDrawerOpen(!drawerOpen)}
              sx={{ mr: 2, display: { sm: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              n8n Chat
            </Typography>
            <Typography variant="body2" sx={{ mr: 2 }}>
              {user?.email}
            </Typography>
            <Button
              color="inherit"
              onClick={handleSignOut}
              startIcon={<LogoutIcon />}
            >
              Abmelden
            </Button>
          </Toolbar>
        </AppBar>

        {/* Drawer - Mobil */}
        <Drawer
          variant="temporary"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box' },
          }}
        >
          <DrawerContent 
            conversations={conversations}
            activeConversation={activeConversation}
            onSwitchConversation={switchConversation}
            onNewConversation={startNewConversation}
            onDeleteConversation={(id) => openDeleteDialog('conversation', id)}
          />
        </Drawer>

        {/* Drawer - Desktop */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box', position: 'relative' },
            width: drawerWidth,
            flexShrink: 0,
          }}
        >
          <Toolbar /> {/* Spacer für die AppBar */}
          <DrawerContent 
            conversations={conversations}
            activeConversation={activeConversation}
            onSwitchConversation={switchConversation}
            onNewConversation={startNewConversation}
            onDeleteConversation={(id) => openDeleteDialog('conversation', id)}
          />
        </Drawer>

        {/* Hauptbereich */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 2,
            width: { sm: `calc(100% - ${drawerWidth}px)` },
            mt: '64px', // Höhe der AppBar
            display: 'flex',
            flexDirection: 'column',
            height: 'calc(100vh - 64px)'
          }}
        >
          <Paper 
            elevation={2}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              overflow: 'hidden'
            }}
          >
            {/* Chat-Nachrichten */}
            <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
              {messages.length === 0 ? (
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  height: '100%',
                  color: 'text.secondary'
                }}>
                  <ChatIcon sx={{ fontSize: 60, mb: 2, opacity: 0.7 }} />
                  <Typography variant="h6">
                    Sende eine Nachricht, um mit dem Chat zu beginnen
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {messages.map((message) => (
                    <Box
                      key={message.id}
                      sx={{
                        display: 'flex',
                        justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <Card
                        sx={{
                          maxWidth: '80%',
                          position: 'relative',
                          bgcolor: message.sender === 'user' ? 'primary.main' : 'background.paper',
                          color: message.sender === 'user' ? 'primary.contrastText' : 'text.primary',
                          boxShadow: 2,
                          '&:hover .delete-button': {
                            opacity: 1
                          }
                        }}
                      >
                        <IconButton 
                          size="small"
                          className="delete-button"
                          onClick={() => openDeleteDialog('message', message.id)}
                          sx={{
                            position: 'absolute',
                            top: 4,
                            right: 4,
                            opacity: 0,
                            transition: 'opacity 0.2s',
                            color: message.sender === 'user' ? 'primary.contrastText' : 'text.secondary',
                            '&:hover': {
                              color: 'error.main'
                            }
                          }}
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                        <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                            {message.content}
                          </Typography>
                          <Typography 
                            variant="caption" 
                            display="block" 
                            sx={{ 
                              mt: 0.5,
                              opacity: 0.7,
                              color: message.sender === 'user' ? 'inherit' : 'text.secondary'
                            }}
                          >
                            {message.timestamp.toLocaleTimeString()}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Box>
                  ))}
                  <div ref={messagesEndRef} />
                </Box>
              )}
            </Box>

            {/* Chat-Eingabe */}
            <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
              <form onSubmit={sendMessage}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    fullWidth
                    variant="outlined"
                    placeholder="Schreibe eine Nachricht..."
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    disabled={sending}
                    size="medium"
                    InputProps={{
                      sx: { 
                        bgcolor: 'background.paper',
                        '& .MuiInputBase-input': {
                          color: 'text.primary',  // Dunklere Textfarbe
                        }
                      },
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton 
                            type="submit" 
                            disabled={!inputMessage.trim() || sending}
                            color="primary"
                          >
                            {sending ? <CircularProgress size={24} /> : <SendIcon />}
                          </IconButton>
                        </InputAdornment>
                      )
                    }}
                  />
                </Box>
              </form>
            </Box>
          </Paper>
        </Box>

        {/* Bestätigungsdialog zum Löschen */}
        <Dialog
          open={deleteDialog.open}
          onClose={closeDeleteDialog}
        >
          <DialogTitle>
            {deleteDialog.type === 'conversation' ? 'Konversation löschen' : 'Nachricht löschen'}
          </DialogTitle>
          <DialogContent>
            <DialogContentText>
              {deleteDialog.type === 'conversation' 
                ? 'Möchtest du diese Konversation wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.'
                : 'Möchtest du diese Nachricht wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.'
              }
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeDeleteDialog} color="primary">
              Abbrechen
            </Button>
            <Button onClick={handleDelete} color="error" variant="contained" startIcon={<DeleteIcon />}>
              Löschen
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </ThemeRegistry>
  );
}

// Komponente für den Drawer-Inhalt
function DrawerContent({
  conversations,
  activeConversation,
  onSwitchConversation,
  onNewConversation,
  onDeleteConversation
}: {
  conversations: Conversation[];
  activeConversation: string | null;
  onSwitchConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
}) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ p: 2 }}>
        <Button
          fullWidth
          variant="contained"
          startIcon={<AddIcon />}
          onClick={onNewConversation}
        >
          Neue Konversation
        </Button>
      </Box>
      <Divider />
      <List sx={{ flex: 1, overflow: 'auto' }}>
        {conversations.length === 0 ? (
          <ListItem>
            <ListItemText 
              primary="Keine Konversationen" 
              primaryTypographyProps={{ align: 'center', color: 'text.secondary' }} 
            />
          </ListItem>
        ) : (
          conversations.map((conv) => (
            <ListItem key={conv.id} disablePadding>
              <ListItemButton 
                selected={activeConversation === conv.id}
                onClick={() => onSwitchConversation(conv.id)}
                sx={{
                  borderRadius: 1,
                  m: 0.5
                }}
              >
                <ListItemText 
                  primary={conv.title} 
                  primaryTypographyProps={{ noWrap: true }} 
                  secondary={new Date(conv.updated_at).toLocaleString()}
                  secondaryTypographyProps={{ noWrap: true, fontSize: '0.75rem' }}
                />
                <ListItemIcon sx={{ minWidth: 'auto' }}>
                  <IconButton 
                    edge="end" 
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteConversation(conv.id);
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </ListItemIcon>
              </ListItemButton>
            </ListItem>
          ))
        )}
      </List>
    </Box>
  );
} 