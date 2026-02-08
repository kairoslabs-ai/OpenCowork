import { useState } from 'react';
import { Send, Paperclip, Bot, User, FileText, CheckCircle2, Sparkles } from 'lucide-react';
import { Button } from '../common/Button';
import type { Message } from './types';

interface ChatPanelProps {
  messages: Message[];
  onSendMessage: (content: string) => void;
  isLoading?: boolean;
}

export function ChatPanel({ messages, onSendMessage, isLoading }: ChatPanelProps) {
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-full flex-col bg-card">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h2 className="font-semibold text-foreground">OpenCowork</h2>
          <p className="text-xs text-muted-foreground">Agentic Task Assistant</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <Sparkles className="h-12 w-12 text-muted-foreground/20 mb-2" />
            <p className="text-sm text-muted-foreground">No messages yet</p>
            <p className="text-xs text-muted-foreground mt-1">Start by describing your task</p>
          </div>
        ) : (
          messages.map((message) => <MessageBubble key={message.id} message={message} />)
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border p-4">
        <div className="flex items-end gap-2">
          <Button
            variant="ghost"
            className="h-10 w-10 shrink-0 text-muted-foreground hover:text-foreground"
          >
            <Paperclip className="h-5 w-5" />
          </Button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your task..."
            className="min-h-[44px] max-h-32 flex-1 resize-none rounded-lg border border-input bg-secondary/50 px-4 py-3 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
            rows={1}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="h-10 w-10 shrink-0 rounded-lg"
          >
            {isLoading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUser ? 'bg-secondary' : 'bg-primary/10'
        }`}
      >
        {isUser ? (
          <User className="h-4 w-4 text-secondary-foreground" />
        ) : (
          <Bot className="h-4 w-4 text-primary" />
        )}
      </div>

      {/* Content */}
      <div className={`flex-1 space-y-3 ${isUser ? 'text-right' : ''}`}>
        <div
          className={`inline-block rounded-lg px-4 py-3 text-sm ${
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground'
          }`}
        >
          <p>{message.content}</p>
        </div>

        {/* Linked Files */}
        {message.linkedFiles && message.linkedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {message.linkedFiles.map((file, i) => (
              <button
                key={i}
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-2.5 py-1.5 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent/80"
              >
                <FileText className="h-3 w-3" />
                {file.split('/').pop()}
              </button>
            ))}
          </div>
        )}

        {/* Checklist */}
        {message.checklist && message.checklist.length > 0 && (
          <div className="rounded-lg bg-secondary p-3 text-left">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Completed Tasks</p>
            <ul className="space-y-1.5">
              {message.checklist.map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <CheckCircle2
                    className={`h-4 w-4 shrink-0 ${
                      item.completed ? 'text-[hsl(var(--success))]' : 'text-muted-foreground'
                    }`}
                  />
                  <span className={item.completed ? 'text-foreground' : 'text-muted-foreground'}>
                    {item.text}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Highlights */}
        {message.highlights && message.highlights.length > 0 && (
          <div className="rounded-lg bg-accent/30 p-3 text-left">
            <p className="mb-2 text-xs font-medium text-accent-foreground">Quick Highlights</p>
            <ul className="space-y-1">
              {message.highlights.map((highlight, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/80" />
                  {highlight}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Timestamp */}
        <p className="text-xs text-muted-foreground">
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}
