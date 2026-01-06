import React, { useEffect } from 'react';
import {
    Info, CheckCircle, AlertCircle, AlertTriangle, X
} from 'lucide-react';

export const Toast = ({ message, type, onClose }) => {
    let containerClass = "fixed top-24 right-4 z-[9999] flex items-center gap-4 p-5 rounded-2xl border-l-4 backdrop-blur-xl animate-fade-up shadow-2xl transition-all duration-300";
    let iconContainerClass = "p-2 rounded-full";
    let IconComponent = Info;

    if (type === 'success') {
        containerClass += " border-green-500 text-green-400 bg-black/90 shadow-[0_0_20px_rgba(34,197,94,0.3)]";
        iconContainerClass += " bg-green-500/20";
        IconComponent = CheckCircle;
    } else if (type === 'error') {
        containerClass += " border-red-500 text-red-400 bg-black/90 shadow-[0_0_20px_rgba(239,68,68,0.3)]";
        iconContainerClass += " bg-red-500/20";
        IconComponent = AlertCircle;
    } else if (type === 'warning') {
        containerClass += " border-yellow-500 text-yellow-400 bg-black/90 shadow-[0_0_20px_rgba(234,179,8,0.3)]";
        iconContainerClass += " bg-yellow-500/20";
        IconComponent = AlertTriangle;
    } else {
        containerClass += " border-cyan-500 text-cyan-400 bg-black/90 shadow-[0_0_20px_rgba(6,182,212,0.3)]";
        iconContainerClass += " bg-cyan-500/20";
        IconComponent = Info;
    }

    useEffect(() => {
        const t = setTimeout(onClose, 4000);
        return () => clearTimeout(t);
    }, [onClose]);

    return (
        <div className={containerClass}>
            <div className={iconContainerClass}>
                <IconComponent className="w-5 h-5" />
            </div>
            <div>
                <p className="font-bold text-sm tracking-wide">{message}</p>
            </div>
            <button onClick={onClose} className="ml-2 text-white/50 hover:text-white transition">
                <X className="w-4 h-4" />
            </button>
        </div>
    );
};

export const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel, confirmText = "Confirmar", cancelText = "Cancelar", isDangerous = false }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-up p-4">
            <div className={`glass p-8 rounded-[2rem] max-w-sm w-full border ${isDangerous ? 'border-red-500/50 shadow-[0_0_30px_rgba(220,38,38,0.2)]' : 'border-slate-700 shadow-2xl'}`}>
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 mx-auto ${isDangerous ? 'bg-red-900/20 text-red-500' : 'bg-cyan-900/20 text-cyan-500'}`}>
                    {isDangerous ? <AlertTriangle className="w-8 h-8" /> : <Info className="w-8 h-8" />}
                </div>
                <h3 className="text-xl font-black text-center mb-2 text-white">{title}</h3>
                <p className="text-slate-400 text-center mb-8 text-sm leading-relaxed">{message}</p>
                <div className="flex gap-3">
                    <button onClick={onCancel} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition">{cancelText}</button>
                    <button onClick={onConfirm} className={`flex-1 py-3 text-white rounded-xl font-bold transition shadow-lg ${isDangerous ? 'bg-red-600 hover:bg-red-500 shadow-red-600/30' : 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-600/30'}`}>{confirmText}</button>
                </div>
            </div>
        </div>
    );
};

export class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ error, errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-black text-red-500 p-10 font-mono">
                    <h1 className="text-4xl font-bold mb-4">CRITICAL SYSTEM FAILURE</h1>
                    <div className="border border-red-900 bg-red-900/10 p-6 rounded-xl overflow-auto">
                        <h2 className="text-xl font-bold mb-2">{this.state.error?.toString()}</h2>
                        <pre className="text-xs text-red-400/70 whitespace-pre-wrap">{this.state.errorInfo?.componentStack}</pre>
                    </div>
                    <button onClick={() => window.location.reload()} className="mt-8 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-500 font-bold">
                        REINICIAR SISTEMA
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}
