import { createClient } from '@/utils/supabase/client';
import { v4 as uuidv4 } from 'uuid';

export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  conversation_id?: string;
  saved?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  created_at: Date;
  updated_at: Date;
  user_id: string;
}

// Erstelle eine neue Konversation für den aktuellen Benutzer
export async function createConversation(userId: string, title: string = 'Neue Konversation'): Promise<string | null> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('conversations')
    .insert([
      { user_id: userId, title }
    ])
    .select('id')
    .single();
  
  if (error) {
    console.error('Fehler beim Erstellen der Konversation:', error);
    return null;
  }
  
  return data.id;
}

// Hole alle Konversationen des aktuellen Benutzers
export async function getConversations(): Promise<Conversation[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .order('updated_at', { ascending: false });
  
  if (error) {
    console.error('Fehler beim Laden der Konversationen:', error);
    return [];
  }
  
  return data || [];
}

// Hole alle Nachrichten einer Konversation
export async function getMessages(conversationId: string): Promise<Message[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error('Fehler beim Laden der Nachrichten:', error);
    return [];
  }
  
  return data.map(msg => ({
    id: msg.id,
    content: msg.content,
    sender: msg.sender,
    timestamp: new Date(msg.created_at),
    conversation_id: msg.conversation_id,
    saved: true
  })) || [];
}

// Konversation umbenennen
export async function renameConversation(conversationId: string, newTitle: string): Promise<boolean> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('conversations')
    .update({ title: newTitle })
    .eq('id', conversationId);
  
  if (error) {
    console.error('Fehler beim Umbenennen der Konversation:', error);
    return false;
  }
  
  return true;
}

// Konversation löschen
export async function deleteConversation(conversationId: string): Promise<boolean> {
  const supabase = createClient();
  
  // Alle Nachrichten in der Konversation werden automatisch durch ON DELETE CASCADE gelöscht
  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('id', conversationId);
  
  if (error) {
    console.error('Fehler beim Löschen der Konversation:', error);
    return false;
  }
  
  return true;
}

// Nachricht speichern
export async function saveMessage(message: Message, userId: string): Promise<Message> {
  const supabase = createClient();
  
  // Wenn keine Konversation angegeben ist, erstelle eine neue
  if (!message.conversation_id) {
    const conversationId = await createConversation(userId);
    if (!conversationId) {
      console.error('Konnte keine neue Konversation erstellen');
      return { ...message, saved: false };
    }
    message.conversation_id = conversationId;
  }
  
  // Stelle sicher, dass wir eine gültige UUID haben
  const messageId = uuidv4();
  
  const { data, error } = await supabase
    .from('messages')
    .insert([
      {
        id: messageId, // Verwende immer eine erzeugte UUID
        content: message.content,
        sender: message.sender,
        user_id: userId,
        conversation_id: message.conversation_id,
        created_at: message.timestamp || new Date()
      }
    ])
    .select()
    .single();
  
  if (error) {
    console.error('Fehler beim Speichern der Nachricht:', error);
    return { ...message, saved: false };
  }
  
  // Aktualisiere den Zeitstempel der Konversation
  await supabase
    .from('conversations')
    .update({ updated_at: new Date() })
    .eq('id', message.conversation_id);
  
  return {
    ...message,
    id: data.id,
    saved: true
  };
}

// Nachricht löschen
export async function deleteMessage(messageId: string): Promise<boolean> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('messages')
    .delete()
    .eq('id', messageId);
  
  if (error) {
    console.error('Fehler beim Löschen der Nachricht:', error);
    return false;
  }
  
  return true;
}

// Generiere Titel für eine Konversation basierend auf der ersten Nachricht
export async function generateConversationTitle(conversationId: string, firstMessageContent: string): Promise<boolean> {
  // Kürze den Titel auf max. 50 Zeichen ab
  let title = firstMessageContent.substring(0, 47);
  if (firstMessageContent.length > 47) {
    title += '...';
  }
  
  return await renameConversation(conversationId, title);
} 