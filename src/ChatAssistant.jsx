import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, X, Bot, Sparkles, User, Loader2, MinusCircle, Maximize2 } from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";

const ChatAssistant = ({ habits, profile, externalOpen, onToggle }) => {
    const [internalOpen, setInternalOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);

    const isOpen = externalOpen !== undefined ? externalOpen : internalOpen;
    const setIsOpen = onToggle || setInternalOpen;
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState([
        {
            id: 1,
            role: 'assistant',
            content: "Hi! I'm your StreakFlow AI assistant. How can I help you crush your goals today?",
            timestamp: new Date()
        }
    ]);
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef(null);

    // Initialize Gemini AI
    const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        systemInstruction: `You are the StreakFlow AI Assistant. You help users stay motivated and manage their habits.
        The user's name is ${profile.name || 'User'}.
        Current habits: ${habits.length > 0 ? habits.map(h => `- ${h.name} (${h.currentStreak} day streak, category: ${h.category})`).join(', ') : 'No habits created yet.'}.
        Be encouraging, concise, and professional. Use the user's data to give personalized advice.`
    });

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    const handleSend = async (e) => {
        e.preventDefault();
        const userInput = input.trim();
        if (!userInput) return;

        const userMsg = {
            id: Date.now(),
            role: 'user',
            content: userInput,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        try {
            // Gemini history MUST NOT start with a 'model' (assistant) role.
            // We filter out our initial greeting to comply with the API.
            const history = messages
                .filter(msg => msg.id !== 1) // Remove initial assistant greeting
                .map(msg => ({
                    role: msg.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: msg.content }],
                }));

            const chatSession = model.startChat({ history });

            const result = await chatSession.sendMessage(userInput);
            const responseText = result.response.text();

            const aiMsg = {
                id: Date.now() + 1,
                role: 'assistant',
                content: responseText,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, aiMsg]);
        } catch (error) {
            console.error("Gemini AI Error:", error);
            const errorMsg = {
                id: Date.now() + 1,
                role: 'assistant',
                content: "I'm having trouble connecting to my brain right now. Please check your API key or try again in a moment! 🧠💤",
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsTyping(false);
        }
    };

    const toggleChat = () => {
        setIsOpen(!isOpen);
        setIsMinimized(false);
    };

    return (
        <div className={`chat-assistant-container ${isOpen ? 'active' : ''} ${isMinimized ? 'minimized' : ''}`}>
            {/* Floating Toggle Button */}
            <button
                className={`chat-toggle-btn ${isOpen ? 'hidden' : ''}`}
                onClick={toggleChat}
                title="AI Assistant"
            >
                <div className="chat-toggle-glow"></div>
                <Sparkles className="sparkle-icon" size={20} />
                <MessageCircle size={28} />
            </button>

            {/* Chat Window */}
            {isOpen && (
                <div className="chat-window animate-slide-up">
                    <div className="chat-header">
                        <div className="chat-header-info">
                            <div className="chat-bot-avatar">
                                <Bot size={20} color="white" />
                                <div className="online-indicator"></div>
                            </div>
                            <div>
                                <h3>StreakFlow AI</h3>
                                <p>Online & ready to help</p>
                            </div>
                        </div>
                        <div className="chat-header-actions">
                            <button onClick={() => setIsMinimized(!isMinimized)} className="chat-action-btn">
                                {isMinimized ? <Maximize2 size={18} /> : <MinusCircle size={18} />}
                            </button>
                            <button onClick={() => setIsOpen(false)} className="chat-action-btn close">
                                <X size={18} />
                            </button>
                        </div>
                    </div>

                    {!isMinimized && (
                        <>
                            <div className="chat-messages" ref={scrollRef}>
                                {messages.map((msg) => (
                                    <div key={msg.id} className={`message-wrapper ${msg.role}`}>
                                        <div className="message-avatar">
                                            {msg.role === 'assistant' ? <Bot size={14} /> : <User size={14} />}
                                        </div>
                                        <div className="message-bubble">
                                            {msg.content}
                                            <span className="message-time">
                                                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                                {isTyping && (
                                    <div className="message-wrapper assistant">
                                        <div className="message-avatar">
                                            <Bot size={14} />
                                        </div>
                                        <div className="message-bubble typing">
                                            <div className="typing-dot"></div>
                                            <div className="typing-dot"></div>
                                            <div className="typing-dot"></div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="chat-suggestions">
                                <button onClick={() => setInput("How to build a streak?")}>🔥 Building Streaks</button>
                                <button onClick={() => setInput("Suggest a healthy habit")}>🏥 Health Tips</button>
                            </div>

                            <form className="chat-input-area" onSubmit={handleSend}>
                                <input
                                    type="text"
                                    placeholder="Ask me anything..."
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                />
                                <button type="submit" disabled={!input.trim()}>
                                    <Send size={18} />
                                </button>
                            </form>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default ChatAssistant;
