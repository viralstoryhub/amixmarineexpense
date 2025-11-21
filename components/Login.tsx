import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Icons } from '../constants';

const Login: React.FC = () => {
    const { login } = useAuth();
    const [passcode, setPasscode] = useState('');
    const [error, setError] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!login(passcode)) {
            setError(true);
            setPasscode('');
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
                <div className="w-16 h-16 bg-amix-blue rounded-full flex items-center justify-center mx-auto mb-6 text-white">
                    <Icons.Lock />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Amix Marine Expenses</h1>
                <p className="text-slate-500 mb-8">Enter your access code to continue.</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <input
                            type="password"
                            inputMode="numeric"
                            value={passcode}
                            onChange={(e) => { setError(false); setPasscode(e.target.value); }}
                            placeholder="Enter Passcode"
                            className="w-full text-center text-2xl tracking-widest py-3 border-2 border-slate-200 rounded-xl focus:border-amix-blue focus:ring-0 outline-none transition"
                            autoFocus
                        />
                    </div>

                    {error && (
                        <p className="text-red-500 text-sm animate-pulse">Invalid passcode. Try again.</p>
                    )}

                    <button
                        type="submit"
                        className="w-full bg-amix-blue text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-200"
                    >
                        Access System
                    </button>
                </form>

                <div className="mt-8 text-xs text-slate-400">
                    <p>Field Staff: 1234</p>
                    <p>Managers: 8888</p>
                </div>
            </div>
        </div>
    );
};

export default Login;
