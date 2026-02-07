
import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';

interface AuthScreenProps {
    onSuccess: () => void;
}

const AuthScreen = ({ onSuccess }: AuthScreenProps) => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
            } else {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: { username }
                    }
                });
                if (error) throw error;
            }
            onSuccess();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[1000] bg-black flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=2070')] bg-cover bg-center opacity-20" />

            <div className="w-full max-w-md glass p-10 rounded-[40px] border-orange-500/20 shadow-[0_0_100px_rgba(249,115,22,0.1)] relative overflow-hidden">
                {/* LOGO AREA */}
                <div className="text-center mb-10">
                    <h1 className="text-4xl font-black tracking-[0.3em] uppercase kairo-cyber-glow mb-2" style={{ fontFamily: 'Comfortaa, sans-serif' }}>
                        KAIRO<span className="text-white"> 4K</span>
                    </h1>
                    <p className="text-[10px] uppercase tracking-[0.4em] text-slate-500 font-black">Nexus Access Terminal</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {!isLogin && (
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4 mb-2 block">Username</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder-slate-600 focus:outline-none focus:border-orange-500/50 transition-all text-sm font-mono"
                                placeholder="OPERATOR_NAME"
                            />
                        </div>
                    )}

                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4 mb-2 block">Email Address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder-slate-600 focus:outline-none focus:border-orange-500/50 transition-all text-sm font-mono"
                            placeholder="operator@nexus.com"
                        />
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4 mb-2 block">Encryption Key</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder-slate-600 focus:outline-none focus:border-orange-500/50 transition-all text-sm font-mono"
                            placeholder="••••••••"
                        />
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-500 text-[10px] font-black uppercase tracking-widest text-center">
                            {error}
                        </div>
                    )}

                    <button
                        disabled={loading}
                        className="w-full py-5 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl font-black uppercase text-[12px] tracking-[0.2em] transition-all shadow-[0_20px_50px_rgba(249,115,22,0.3)] disabled:opacity-50 active:scale-95"
                    >
                        {loading ? 'Processing...' : isLogin ? 'Establish Link' : 'Register Operator'}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors"
                    >
                        {isLogin ? "Need new clearance? Create Account" : "Existing Operator? Log In"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AuthScreen;
