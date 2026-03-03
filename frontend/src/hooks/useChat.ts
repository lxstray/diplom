'use client';

import { useEffect, useState, useCallback } from 'react';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import type { ChatMessage } from '@/types/chat';

const COLLAB_URL =
  process.env.NEXT_PUBLIC_COLLAB_URL || 'ws://localhost:3002';

export interface UseChatOptions {
  roomId: string;
  userId: string;
  userName: string;
  provider: HocuspocusProvider | null;
}

export interface UseChatResult {
  messages: ChatMessage[];
  sendMessage: (text: string) => void;
  clearMessages: () => void;
  isReady: boolean;
}

export function useChat({
  roomId,
  userId,
  userName,
  provider,
}: UseChatOptions): UseChatResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [yChat, setYChat] = useState<Y.Array<Y.Map<any>> | null>(null);

  // Setup Yjs chat array when provider is connected
  useEffect(() => {
    if (!provider || !roomId) {
      setYChat(null);
      setMessages([]);
      setIsReady(false);
      return;
    }

    const ydoc = provider.document;
    
    // Get or create the chat array in Yjs
    const chatArray = ydoc.getArray<Y.Map<any>>('chat');
    setYChat(chatArray);
    setIsReady(true);

    // Load existing messages
    const loadMessages = () => {
      const existingMessages: ChatMessage[] = [];
      for (let i = 0; i < chatArray.length; i++) {
        const msgMap = chatArray.get(i);
        if (msgMap) {
          existingMessages.push({
            id: msgMap.get('id'),
            userId: msgMap.get('userId'),
            userName: msgMap.get('userName'),
            text: msgMap.get('text'),
            timestamp: msgMap.get('timestamp'),
          });
        }
      }
      setMessages(existingMessages);
    };

    loadMessages();

    // Observe changes to chat array
    const observer = (event: Y.YArrayEvent<Y.Map<any>>) => {
      const newMessages: ChatMessage[] = [];
      for (let i = 0; i < chatArray.length; i++) {
        const msgMap = chatArray.get(i);
        if (msgMap) {
          newMessages.push({
            id: msgMap.get('id'),
            userId: msgMap.get('userId'),
            userName: msgMap.get('userName'),
            text: msgMap.get('text'),
            timestamp: msgMap.get('timestamp'),
          });
        }
      }
      setMessages(newMessages);
    };

    chatArray.observe(observer);

    return () => {
      chatArray.unobserve(observer);
    };
  }, [provider, roomId]);

  const sendMessage = useCallback(
    (text: string) => {
      if (!yChat || !userId || !userName) return;

      const message: ChatMessage = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId,
        userName,
        text: text.trim(),
        timestamp: Date.now(),
      };

      const messageMap = new Y.Map();
      messageMap.set('id', message.id);
      messageMap.set('userId', message.userId);
      messageMap.set('userName', message.userName);
      messageMap.set('text', message.text);
      messageMap.set('timestamp', message.timestamp);

      yChat.push([messageMap]);
    },
    [yChat, userId, userName]
  );

  const clearMessages = useCallback(() => {
    if (!yChat) return;
    yChat.delete(0, yChat.length);
  }, [yChat]);

  return {
    messages,
    sendMessage,
    clearMessages,
    isReady,
  };
}
