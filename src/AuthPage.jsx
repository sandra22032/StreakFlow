import React, { useState } from 'react';
import { Flame, Mail, Lock, User, ArrowRight, Eye, EyeOff, Loader } from 'lucide-react';
import { supabase } from './supabaseClient';

const InputField = ({ label, id, type = 'text', icon: Icon, value, onChange, placeholder, extra }) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';

    return (
        <div className="auth-field">
            <label htmlFor={id} className="auth-label">{label}</label>
            <div className="auth-input-wrap">
                <Icon size={18} className="auth-input-icon" />
                <input
                    id={id}
                    type={isPassword && showPassword ? 'text' : type}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    className="auth-input"
                    required
                    autoComplete={isPassword ? 'current-password' : id}
                />
                {isPassword && (
                    <button
                        type="button"
                        className="auth-eye-btn"
                        onClick={() => setShowPassword(p => !p)}
                        tabIndex={-1}
                    >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                )}
            </div>
            {extra}
        </div>
    );
};

export default function AuthPage() {
    const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'reset'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' }); // type: 'success' | 'error'

    const showMsg = (text, type = 'error') => setMessage({ text, type });
    const clearMsg = () => setMessage({ text: '', type: '' });

    const handleLogin = async (e) => {
        e.preventDefault();
        clearMsg();
        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) showMsg(error.message);
        setLoading(false);
    };

    const handleSignup = async (e) => {
        e.preventDefault();
        clearMsg();
        if (password.length < 6) return showMsg('Password must be at least 6 characters.');
        setLoading(true);
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { name } },
        });
        if (error) showMsg(error.message);
        else showMsg('Check your email to confirm your account!', 'success');
        setLoading(false);
    };

    const handleReset = async (e) => {
        e.preventDefault();
        clearMsg();
        setLoading(true);
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin,
        });
        if (error) showMsg(error.message);
        else showMsg('Password reset link sent — check your inbox!', 'success');
        setLoading(false);
    };

    const switchMode = (newMode) => {
        setMode(newMode);
        clearMsg();
        setEmail('');
        setPassword('');
        setName('');
    };

    return (
        <div className="auth-page">
            {/* Background orbs */}
            <div className="auth-orb auth-orb-1" />
            <div className="auth-orb auth-orb-2" />

            <div className="auth-card">
                {/* Logo */}
                <div className="auth-logo">
                    <div className="auth-logo-icon">
                        <Flame size={32} strokeWidth={2.5} fill="#ffffff" color="#ffffff" />
                    </div>
                    <div>
                        <h1 className="auth-brand">StreakFlow</h1>
                        <p className="auth-tagline">Master your habits. Win every day.</p>
                    </div>
                </div>

                {/* Tab switcher (login/signup only) */}
                {mode !== 'reset' && (
                    <div className="auth-tabs">
                        <button
                            className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
                            onClick={() => switchMode('login')}
                        >
                            Sign In
                        </button>
                        <button
                            className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
                            onClick={() => switchMode('signup')}
                        >
                            Create Account
                        </button>
                    </div>
                )}

                {/* Title */}
                <div className="auth-heading">
                    {mode === 'login' && <><h2>Welcome back 👋</h2><p>Your streaks are waiting for you.</p></>}
                    {mode === 'signup' && <><h2>Start your journey 🚀</h2><p>Build habits that last a lifetime.</p></>}
                    {mode === 'reset' && (
                        <>
                            <h2>Reset password 🔑</h2>
                            <p>We'll send a reset link to your email.</p>
                        </>
                    )}
                </div>

                {/* Alert message */}
                {message.text && (
                    <div className={`auth-alert auth-alert-${message.type}`}>
                        {message.text}
                    </div>
                )}

                {/* Form */}
                <form
                    onSubmit={mode === 'login' ? handleLogin : mode === 'signup' ? handleSignup : handleReset}
                    className="auth-form"
                >
                    {mode === 'signup' && (
                        <InputField
                            label="Full Name"
                            id="name"
                            icon={User}
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Jane Doe"
                        />
                    )}

                    <InputField
                        label="Email Address"
                        id="email"
                        type="email"
                        icon={Mail}
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="you@example.com"
                    />

                    {mode !== 'reset' && (
                        <InputField
                            label="Password"
                            id="password"
                            type="password"
                            icon={Lock}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="••••••••"
                            extra={
                                mode === 'login' && (
                                    <button
                                        type="button"
                                        className="auth-forgot"
                                        onClick={() => switchMode('reset')}
                                    >
                                        Forgot password?
                                    </button>
                                )
                            }
                        />
                    )}

                    <button type="submit" className="auth-submit-btn" disabled={loading}>
                        {loading ? (
                            <><Loader size={18} className="auth-spinner" /> Working…</>
                        ) : (
                            <>
                                {mode === 'login' && <><ArrowRight size={18} /> Sign In</>}
                                {mode === 'signup' && <><ArrowRight size={18} /> Create Account</>}
                                {mode === 'reset' && <><Mail size={18} /> Send Reset Link</>}
                            </>
                        )}
                    </button>
                </form>

                {/* Footer links */}
                <div className="auth-footer">
                    {mode === 'login' && (
                        <p>New to StreakFlow?{' '}
                            <button type="button" className="auth-link" onClick={() => switchMode('signup')}>
                                Create a free account
                            </button>
                        </p>
                    )}
                    {mode === 'signup' && (
                        <p>Already have an account?{' '}
                            <button type="button" className="auth-link" onClick={() => switchMode('login')}>
                                Sign in
                            </button>
                        </p>
                    )}
                    {mode === 'reset' && (
                        <p>
                            <button type="button" className="auth-link" onClick={() => switchMode('login')}>
                                ← Back to Sign In
                            </button>
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
