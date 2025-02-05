// src/app/page.tsx

"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Message, ChatResponse } from "../types/chat";

export default function ChatInterface() {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatId, setChatId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    // Initialize chat when component mounts
    initializeChat();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeChat = async () => {
    try {
      const response = await fetch("http://localhost:5000/start_chat", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      setChatId(data.chat_id);
      setMessages(data.messages);
    } catch (error) {
      console.error("Failed to initialize chat:", error);
    }
  };

  const handleSubmit = async () => {
    if (!input.trim()) return;

    setIsLoading(true);
    const currentInput = input; // Store current input
    setInput(""); // Clear input field

    try {
      const formData = new FormData();
      formData.append("question", currentInput);
      formData.append("chat_id", chatId || "");

      // Add user message immediately to local state
      const userMessage: Message = { 
        role: 'user', 
        content: currentInput,
        images: [] 
      };
      setMessages(prevMessages => [...prevMessages, userMessage]);

      const resp = await fetch("http://localhost:5000/get_answer", {
        method: "POST",
        body: formData,
      });

      const data: ChatResponse = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || "Unknown error occurred");
      }

      // Find the new assistant message from the response
      const newMessages = data.messages;
      const lastMessage = newMessages[newMessages.length - 1];
      
      // Only add the new assistant message to existing messages
      if (lastMessage.role === 'assistant') {
        setMessages(prevMessages => [...prevMessages, lastMessage]);
      }

    } catch (error) {
      const errorMessage: Message = {
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        images: []
      };
      setMessages(prevMessages => [...prevMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="container">
      <div className="chat-container">
        <div className="messages-container">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`message ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}
            >
              <div className="message-content">
                {message.content}
              </div>
              {message.images && message.images.length > 0 && (
                <div className="message-images">
                  {message.images.map((image, imgIndex) => (
                    <img
                      key={imgIndex}
                      src={`data:image/jpeg;base64,${image}`}
                      alt=""
                      className="message-image"
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="input-container">
          <textarea
            className="input-box"
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
          />
          <button
            className="send-button"
            onClick={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? "..." : "Send"}
          </button>
        </div>
      </div>

      <div className="back-button">
        <Link href="/" className="text-purple-600 hover:text-purple-800 font-semibold">
          &larr; Back to Home
        </Link>
      </div>

      <style jsx>{`
        .container {
          max-width: 1000px;
          margin: 0 auto;
          padding: 2rem;
          height: 100vh;
          display: flex;
          flex-direction: column;
        }

        .chat-container {
          flex-grow: 1;
          display: flex;
          flex-direction: column;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          overflow: hidden;
        }

        .messages-container {
          flex-grow: 1;
          overflow-y: auto;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .message {
          max-width: 80%;
          padding: 12px 16px;
          border-radius: 12px;
          word-wrap: break-word;
        }

        .user-message {
          align-self: flex-end;
          background-color: #663399;
          color: white;
        }

        .assistant-message {
          align-self: flex-start;
          background-color: rgba(255, 255, 255, 0.2);
          color: white;
        }

        .message-images {
          margin-top: 8px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .message-image {
          max-width: 200px;
          max-height: 200px;
          border-radius: 8px;
        }

        .input-container {
          display: flex;
          gap: 12px;
          padding: 16px;
          background: rgba(0, 0, 0, 0.2);
        }

        .input-box {
          flex-grow: 1;
          background-color: rgba(255, 255, 255, 0.1);
          border: none;
          border-radius: 24px;
          padding: 12px 20px;
          color: white;
          font-size: 16px;
          resize: none;
          height: 50px;
          min-height: 50px;
        }

        .input-box:focus {
          outline: none;
          box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.2);
        }

        .send-button {
          background-color: #16f9f6;
          border: none;
          border-radius: 24px;
          padding: 0 24px;
          font-size: 16px;
          cursor: pointer;
          color: black;
          font-weight: bold;
        }

        .send-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .back-button {
          margin-top: 20px;
        }
      `}</style>
    </div>
  );
}
