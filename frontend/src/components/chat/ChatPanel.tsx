'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { X, Send, MessageSquare, Smile } from 'lucide-react';
import { useChat } from '@/hooks/useChat';
import { HocuspocusProvider } from '@hocuspocus/provider';
import type { ChatMessage } from '@/types/chat';

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  userId: string | null;
  userName: string;
  provider: HocuspocusProvider | null;
}

export function ChatPanel({
  isOpen,
  onClose,
  roomId,
  userId,
  userName,
  provider,
}: ChatPanelProps) {
  const [inputMessage, setInputMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { messages, sendMessage, isReady } = useChat({
    roomId,
    userId: userId || 'anonymous',
    userName,
    provider,
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSend = () => {
    if (!inputMessage.trim() || !isReady) return;
    sendMessage(inputMessage);
    setInputMessage('');
    setShowEmojiPicker(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const emojiGroups: { label: string; emojis: string[] }[] = [
    {
      label: 'Smileys',
      emojis: ['😀', '😁', '😂', '🤣', '😊', '😍', '😎', '😢', '😡', '🥳', '🤡 '],
    },
    {
      label: 'Hands',
      emojis: ['👍', '👎', '👏', '🙏', '✌️', '👌'],
    },
    {
      label: 'Misc',
      emojis: ['🔥', '✨', '✅', '❌', '💡', '🚀'],
    },
  ];

  const handleEmojiClick = (emoji: string) => {
    setInputMessage((prev) => prev + emoji);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="w-80 border-l bg-card flex flex-col h-full flex-shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          <h2 className="font-semibold text-sm">Chat</h2>
          {roomId && (
            <Badge variant="secondary" className="text-xs">
              {roomId.slice(0, 8)}
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef as any}>
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-8">
              No messages yet. Start the conversation!
            </div>
          ) : (
            messages.map((message) => {
              const isOwn = message.userId === userId;
              return (
                <div
                  key={message.id}
                  className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="" />
                    <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                      {getInitials(message.userName)}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[70%]`}
                  >
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-xs font-medium text-muted-foreground">
                        {message.userName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(message.timestamp)}
                      </span>
                    </div>
                    <div
                      className={`px-3 py-2 rounded-lg text-sm ${
                        isOwn
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground'
                      }`}
                    >
                      {message.text}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="relative flex gap-2 items-center">
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-9 w-9"
            onClick={() => setShowEmojiPicker((prev) => !prev)}
            disabled={!isReady}
          >
            <Smile className="h-4 w-4" />
          </Button>
          <Input
            ref={inputRef}
            type="text"
            placeholder="Type a message..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!isReady}
            className="flex-1 h-9"
          />
          <Button
            size="icon"
            className="h-9 w-9"
            onClick={handleSend}
            disabled={!inputMessage.trim() || !isReady}
          >
            <Send className="h-4 w-4" />
          </Button>

          {showEmojiPicker && (
            <div className="absolute bottom-11 left-0 z-50 w-64 rounded-md border bg-popover shadow-lg p-2">
              <div className="max-h-60 overflow-y-auto space-y-2">
                {emojiGroups.map((group) => (
                  <div key={group.label}>
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1 px-1">
                      {group.label}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {group.emojis.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          className="h-7 w-7 flex items-center justify-center rounded hover:bg-accent text-lg"
                          onClick={() => handleEmojiClick(emoji)}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
