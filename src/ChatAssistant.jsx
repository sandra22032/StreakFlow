import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, X, Bot, Sparkles, User, Loader2, MinusCircle, Maximize2 } from 'lucide-react';

const ChatAssistant = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
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

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMsg = {
            id: Date.now(),
            role: 'user',
            content: input,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        // Simulate AI Response
        setTimeout(() => {
            const aiMsg = {
                id: Date.now() + 1,
                role: 'assistant',
                content: generateMockResponse(input),
                timestamp: new Date()
            };
            setMessages(prev => [...prev, aiMsg]);
            setIsTyping(false);
        }, 1500);
    };

    const generateMockResponse = (text) => {
        const lowerText = text.toLowerCase();
        if (lowerText.includes('streak')) {
            return "Building a streak is all about 'Atomic Habits'. Start so small it's impossible to fail. If you want to run a marathon, start by putting on your running shoes every day.";
        }
        if (lowerText.includes('health')) {
            return "Health streaks are powerful! Try tracking 'Drink 2L water' or '10 min stretching'. Consistency in health leads to massive energy gains.";
        }
        if (lowerText.includes('lazy') || lowerText.includes('tired')) {
            return "It's okay to have low-energy days. Don't break the chain! Do a 'Micro Version' of your habit. Instead of a 1-hour workout, do just 5 pushups.";
        }
        return "That's a great goal! Remember, consistency beats intensity every time. Keep flowing with StreakFlow! Is there anything specific about your habits you'd like to optimize?";
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
