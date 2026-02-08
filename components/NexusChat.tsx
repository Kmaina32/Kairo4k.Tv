
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { UserProfile } from '../types';

interface Message {
    id: string;
    user_name: string;
    content: string;
    timestamp: string;
}

interface NexusChatProps {
    user: UserProfile;
}

const NexusChat = ({ user }: NexusChatProps) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const chatEndRef = useRef<HTMLDivElement>(null);
    const channelRef = useRef<any>(null);

    useEffect(() => {
        // Initialize Supabase Realtime Channel
        const channel = supabase.channel('nexus-ops', {
            config: {
                broadcast: { self: true },
            },
        });

        channel
            .on('broadcast', { event: 'chat' }, ({ payload }) => {
                setMessages((prev) => [...prev.slice(-49), payload]);
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('[Chat] Connected');
                }
            });

        channelRef.current = channel;

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        const messagePayload: Message = {
            id: Math.random().toString(36).substr(2, 9),
            user_name: user.username,
            content: newMessage,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        // Broadcast message to all active operators
        await channelRef.current.send({
            type: 'broadcast',
            event: 'chat',
            payload: messagePayload,
        });

        setNewMessage('');
    };

    return (
        <div className="flex flex-col h-full glass rounded-[40px] border-white/5 overflow-hidden">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse" />
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Live Chat</h3>
                </div>
                <span className="text-[8px] font-mono text-white/20 uppercase tracking-widest">Active Now</span>
            </div>

            {/* CHAT FEED */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-20 text-center space-y-2">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                        <span className="text-[9px] font-black uppercase tracking-widest">Start a conversation...</span>
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div key={msg.id} className={`flex flex-col ${msg.user_name === user.username ? 'items-end' : 'items-start'}`}>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-[8px] font-black uppercase tracking-widest text-orange-500/60">{msg.user_name}</span>
                                <span className="text-[7px] font-mono text-white/20">{msg.timestamp}</span>
                            </div>
                            <div className={`px-4 py-2.5 rounded-2xl text-[11px] max-w-[80%] ${msg.user_name === user.username ? 'bg-orange-600 text-white rounded-tr-none' : 'bg-white/5 border border-white/10 text-slate-300 rounded-tl-none'}`}>
                                {msg.content}
                            </div>
                        </div>
                    ))
                )}
                <div ref={chatEndRef} />
            </div>

            {/* INPUT BRIDGE */}
            <form onSubmit={handleSendMessage} className="p-6 pt-0">
                <div className="relative">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-[11px] text-white placeholder-slate-600 focus:outline-none focus:border-orange-500/50 transition-all font-mono"
                    />
                    <button
                        type="submit"
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-orange-600 rounded-xl text-white hover:bg-orange-500 transition-all active:scale-95 shadow-lg"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                    </button>
                </div>
            </form>
        </div>
    );
};

export default NexusChat;
