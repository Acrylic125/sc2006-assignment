"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, X, Send, MapPin, Loader2 } from "lucide-react";
import { trpc } from "@/server/client";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  loading?: boolean;
}

export function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      text: "Hi! I'm your Singapore travel assistant! 🇸🇬 I can help you discover amazing places to visit. Try asking me something like:\n\n• 'Show me cultural attractions'\n• 'I want good food places in Chinatown'\n• 'Find me outdoor activities'\n• 'What's interesting near Marina Bay?'",
      isUser: false,
      timestamp: new Date(),
    }
  ]);
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const sendMessageMutation = trpc.chatbot.sendMessage.useMutation();

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Auto-scroll when chat window opens
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100); // Small delay to ensure window is fully rendered
    }
  }, [isOpen]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || sendMessageMutation.isPending) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputText;
    setInputText("");

    // Add loading message
    const loadingMessage: Message = {
      id: (Date.now() + 1).toString(),
      text: "Thinking...",
      isUser: false,
      timestamp: new Date(),
      loading: true,
    };
    setMessages(prev => [...prev, loadingMessage]);

    try {
      // Send to backend
      const result = await sendMessageMutation.mutateAsync({
        message: currentInput,
      });

      // Remove loading message and add bot response
      setMessages(prev => {
        const withoutLoading = prev.filter(msg => !msg.loading);
        const botMessage: Message = {
          id: (Date.now() + 2).toString(),
          text: result.response,
          isUser: false,
          timestamp: new Date(),
        };
        return [...withoutLoading, botMessage];
      });
    } catch (error) {
      console.error("Failed to send message:", error);
      // Remove loading message and add error message
      setMessages(prev => {
        const withoutLoading = prev.filter(msg => !msg.loading);
        const errorMessage: Message = {
          id: (Date.now() + 2).toString(),
          text: "Sorry, I'm having trouble responding right now. Please try again! 😅",
          isUser: false,
          timestamp: new Date(),
        };
        return [...withoutLoading, errorMessage];
      });
    }
  };

  return (
    <>
      {/* Chat Toggle Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-4 right-4 z-50 rounded-full w-14 h-14 shadow-lg hover:shadow-xl transition-all duration-200 ${isOpen ? 'hidden' : 'flex'}`}
        size="icon"
      >
        <MessageCircle className="w-6 h-6" />
      </Button>

            {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 z-50 w-80 h-96 max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] bg-background border border-border rounded-lg shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b bg-primary text-primary-foreground rounded-t-lg shrink-0">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <h3 className="font-semibold">Travel Assistant</h3>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="text-primary-foreground hover:bg-primary-foreground/20 h-6 w-6"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full p-3" ref={scrollAreaRef}>
              <div className="space-y-3">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] p-3 rounded-lg text-sm whitespace-pre-wrap break-words ${
                        message.isUser
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-secondary-foreground'
                      }`}
                    >
                      {message.loading ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>{message.text}</span>
                        </div>
                      ) : (
                        message.text
                      )}
                    </div>
                  </div>
                ))}
                {/* Invisible element to scroll to */}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          </div>

          {/* Input */}
          <div className="p-3 border-t flex gap-2 shrink-0">
            <Input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask me about Singapore..."
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              className="flex-1"
              disabled={sendMessageMutation.isPending}
            />
            <Button 
              onClick={handleSendMessage} 
              size="icon"
              disabled={sendMessageMutation.isPending || !inputText.trim()}
            >
              {sendMessageMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}