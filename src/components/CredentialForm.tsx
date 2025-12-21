import React, { useState } from 'react';
import { AngelCredentials } from '../services/angelService';
import { Lock } from 'lucide-react';

interface Props {
    onSubmit: (creds: AngelCredentials) => void;
    isLoading: boolean;
    error?: string;
}

const CredentialForm: React.FC<Props> = ({ onSubmit, isLoading, error }) => {
    const [apiKey, setApiKey] = useState('');
    const [clientCode, setClientCode] = useState('');
    const [password, setPassword] = useState('');
    const [totp, setTotp] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({ apiKey, clientCode, password, totp });
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-4">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-2xl">
                <div className="flex justify-center mb-6">
                    <div className="p-3 bg-blue-500/10 rounded-full">
                        <Lock className="w-8 h-8 text-blue-500" />
                    </div>
                </div>
                <h2 className="text-2xl font-bold text-center mb-2 text-white">Connect Broker</h2>
                <p className="text-slate-400 text-center mb-6 text-sm">
                    Enter your Angel SmartAPI credentials to fetch your portfolio.
                    <br />
                    <span className="text-xs text-yellow-500/80 mt-2 block">
                        ⚠️ Credentials are processed locally in your browser memory.
                    </span>
                </p>

                {error && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Client Code</label>
                        <input
                            type="text"
                            required
                            value={clientCode}
                            onChange={(e) => setClientCode(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g. A12345"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">API Key</label>
                        <input
                            type="password"
                            required
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter your SmartAPI Key"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Password / PIN</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="••••••"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">TOTP</label>
                        <input
                            type="text"
                            required
                            maxLength={6}
                            value={totp}
                            onChange={(e) => setTotp(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-center tracking-widest font-mono"
                            placeholder="000000"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                    >
                        {isLoading ? 'Connecting...' : 'Fetch Portfolio'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default CredentialForm;
