import React, { useState, useRef, useEffect } from "react";
import { Send, Sparkles, X } from "lucide-react";
import type { ChatMessage } from "../hooks/useWebRTC";

interface CozyChatProps {
  isOpen: boolean;
  messages: ChatMessage[];
  currentUserId: string;
  onSendMessage: (text: string) => void;
  onSendReaction: (emoji: string) => void;
  onClose: () => void;
}

export const CozyChat: React.FC<CozyChatProps> = ({
  isOpen,
  messages,
  currentUserId,
  onSendMessage,
  onSendReaction,
  onClose,
}) => {
  const [text, setText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onSendMessage(text);
      setText("");
    }
  };

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  const reactionEmojis = ["❤️", "✨", "😂", "🍿", "👏", "🥺"];

  return (
    <div
      className={`fixed top-0 right-0 h-[100dvh] w-full max-w-full md:max-w-md md:w-96 z-40 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col border-l border-stone-900/60 bg-[#0B0A09] md:cozy-glass shadow-[-10px_0_30px_rgba(0,0,0,0.3)] ${
        isOpen ? "translate-x-0" : "translate-x-full pointer-events-none"
      }`}
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-stone-850 flex items-center gap-2 pt-10 md:pt-4">
        <div className="w-2 h-2 rounded-full bg-cozy-gold shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
        <h3 className="text-sm font-semibold text-stone-200 tracking-wide font-display">
          Sessão de Conversa
        </h3>
        
        <button
          type="button"
          onClick={onClose}
          className="ml-auto p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors cursor-pointer"
          aria-label="Fechar bate-papo"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4">
            <Sparkles className="w-5 h-5 text-stone-600 mb-2 animate-pulse-slow" />
            <p className="text-xs text-stone-500 max-w-[200px] leading-relaxed">
              Sua sala privada está ativa. Envie uma mensagem ou reação para começar!
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.userId === currentUserId;
            const isSystem = msg.userId === "system";

            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center my-2">
                  <span className="text-[10px] text-stone-500 bg-stone-950/40 px-3 py-1 rounded-lg border border-stone-850/50 italic tracking-wider">
                    {msg.text}
                  </span>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex flex-col max-w-[85%] ${
                  isMe ? "ml-auto items-end" : "mr-auto items-start"
                } animate-fade-in`}
              >
                {/* Sender Name */}
                {!isMe && (
                  <span className="text-[10px] font-medium text-stone-400 mb-1 ml-1.5">
                    {msg.userName}
                  </span>
                )}
                
                {/* Bubble */}
                <div
                  className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm border ${
                    isMe
                      ? "bg-cozy-gray border-stone-800 text-stone-200 rounded-tr-sm"
                      : "bg-[#181512] border-stone-900 text-stone-300 rounded-tl-sm"
                  }`}
                >
                  <p className="break-all whitespace-pre-wrap">{msg.text}</p>
                </div>
                
                {/* Timestamp */}
                <span className="text-[9px] text-stone-600 mt-1 mx-1.5">
                  {msg.timestamp}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Reactions Bar */}
      <div className="px-5 pt-3 pb-1 border-t border-stone-850 flex items-center justify-between">
        <span className="text-[10px] text-stone-500 font-medium">Reações rápidas:</span>
        <div className="flex gap-1.5">
          {reactionEmojis.map((emoji) => (
            <button
              key={emoji}
              onClick={() => onSendReaction(emoji)}
              className="text-lg hover:scale-125 transition-transform duration-200 cursor-pointer active:scale-95"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Text Input Panel */}
      <form onSubmit={handleSubmit} className="p-4 pb-6 md:pb-4 border-t border-stone-850 bg-stone-950/20">
        <div className="flex items-center gap-2 p-1.5 bg-stone-950/60 rounded-xl border border-stone-850">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Escreva algo..."
            className="flex-1 bg-transparent px-2.5 py-1 text-sm text-stone-200 outline-none placeholder-stone-600"
          />
          <button
            type="submit"
            disabled={!text.trim()}
            className={`p-2 rounded-lg transition-colors ${
              text.trim()
                ? "bg-stone-800 text-cozy-gold border border-stone-700/60 hover:bg-stone-750"
                : "text-stone-700 pointer-events-none"
            }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
