"use client";

import React, { useState, useEffect, createContext, useContext } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Message, DR_ECHO_SYSTEM_PROMPT } from '@/lib/ai-assistant';
import { DrEchoDialog } from './dr-echo-dialog';
import { useHealthStore } from '@/lib/store/health-store';

// Initial messages for the chat
const initialMessages: Message[] = [
  {
    id: 'system-1',
    role: 'system',
    content: DR_ECHO_SYSTEM_PROMPT,
    timestamp: new Date()
  },
  {
    id: 'welcome',
    role: 'assistant',
    content: "Hello! I'm Dr. Echo, your CareNexa AI health assistant. How can I help you with your health today?",
    timestamp: new Date()
  }
];

// Create a context to share the assistant functionality
interface DrEchoContextType {
  isOpen: boolean;
  messages: Message[];
  openAssistant: () => void;
  closeAssistant: () => void;
  sendMessage: (message: string) => Promise<void>;
  isTyping: boolean;
  clearMessages: () => void;
}

const DrEchoContext = createContext<DrEchoContextType | null>(null);

// Hook to use the assistant
export function useDrEcho() {
  const context = useContext(DrEchoContext);
  if (!context) {
    throw new Error("useDrEcho must be used within a DrEchoProvider");
  }
  return context;
}

// Provider component
export function DrEchoProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isTyping, setIsTyping] = useState(false);
  const { addConsultationReceipt } = useHealthStore();

  // Load messages from localStorage on mount
  useEffect(() => {
    const savedMessages = localStorage.getItem("drEchoMessages");
    if (savedMessages) {
      try {
        const parsedMessages = JSON.parse(savedMessages) as Message[];

        // Ensure the system prompt is always present
        if (!parsedMessages.some(msg => msg.role === 'system')) {
          parsedMessages.unshift({
            id: 'system-1',
            role: 'system',
            content: DR_ECHO_SYSTEM_PROMPT,
            timestamp: new Date()
          });
        }

        // Fix timestamp strings (convert back to Date objects)
        const messagesWithDates = parsedMessages.map(msg => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));

        setMessages(messagesWithDates);
      } catch (error) {
        console.error("Error parsing saved messages:", error);
      }
    }
  }, []);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 2) {
      localStorage.setItem("drEchoMessages", JSON.stringify(messages));
    }
  }, [messages]);

  const openAssistant = () => setIsOpen(true);
  const closeAssistant = () => setIsOpen(false);

  const clearMessages = () => {
    setMessages([
      {
        id: 'system-1',
        role: 'system',
        content: DR_ECHO_SYSTEM_PROMPT,
        timestamp: new Date()
      },
      {
        id: 'welcome',
        role: 'assistant',
        content: "Hello! I'm Dr. Echo, your EchoMed AI health assistant. How can I help you with your health today?",
        timestamp: new Date()
      }
    ]);
    localStorage.removeItem("drEchoMessages");
  };

  const sendMessage = async (message: string) => {
    if (!message.trim()) return;

    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: message,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    try {
      // Route through /api/chat which uses the secure server-side GEMINI_API_KEY
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: message,
          agentType: "general",
          systemContext: "The user is speaking with Dr. Echo, an AI health assistant. Provide empathetic, evidence-based health guidance. Always recommend consulting a healthcare professional for serious concerns.",
        }),
      });

      const data = await res.json();
      const responseText = data.response || (data.error
        ? `I'm sorry, I encountered an issue: ${data.error}`
        : "I'm sorry, I couldn't process that request. Please try again.");

      const assistantMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: responseText,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Save to Audit Trail (only for real AI responses, not errors)
      if (data.response) {
        try {
          const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(responseText));
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const responseHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
          addConsultationReceipt({
            timestamp: new Date().toISOString(),
            agentType: 'general',
            promptSummary: message.length > 80 ? message.slice(0, 80) + '...' : message,
            responseHash,
            modelVersion: 'gemini-2.0-flash',
            disclaimer: 'AI-generated health information. Not a substitute for professional medical advice.',
          });
        } catch (hashErr) {
          console.warn('Could not save consultation receipt:', hashErr);
        }
      }
    } catch (err) {
      console.error("Dr. Echo fetch error:", err);
      const errorMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: "I'm sorry, I couldn't reach the AI service right now. Please check your connection and try again.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const value = {
    isOpen,
    messages,
    openAssistant,
    closeAssistant,
    sendMessage,
    isTyping,
    clearMessages
  };

  return (
    <DrEchoContext.Provider value={value}>
      {children}
      {isOpen && <DrEchoDialog />}
    </DrEchoContext.Provider>
  );
} 