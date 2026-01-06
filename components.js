// === COMPONENTES UI REUTILIZABLES ===
// Componentes visuales compartidos para SUSTORE
// Expuestos en window.SustoreComponents

import React, { useEffect, useRef, useCallback } from 'react';
import {
    X, CheckCircle, AlertCircle, AlertTriangle, Info, Loader2, ArrowLeft, Shield
} from 'lucide-react';

// --- TOAST (NOTIFICACIÓN) ---
const Toast = ({ message, type, onClose }) => {
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

// --- MODAL DE CONFIRMACIÓN ---
const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel, confirmText = "Confirmar", cancelText = "Cancelar", isDangerous = false }) => {
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

// --- ERROR BOUNDARY ---
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ error, errorInfo });
        console.error("Uncaught error:", error, errorInfo);
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

// --- LOADING SPINNER ---
const LoadingSpinner = ({ message = "Cargando...", fullScreen = true }) => {
    const content = (
        <div className="flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-12 h-12 text-cyan-500 animate-spin" />
            <p className="text-slate-400 font-medium">{message}</p>
        </div>
    );

    if (fullScreen) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                {content}
            </div>
        );
    }
    return content;
};

// --- INFINITE SCROLL TRIGGER ---
const InfiniteScrollTrigger = ({ onLoadMore, hasMore, isLoading }) => {
    const triggerRef = useRef(null);

    const handleObserver = useCallback((entries) => {
        const target = entries[0];
        if (target.isIntersecting && hasMore && !isLoading) {
            onLoadMore();
        }
    }, [onLoadMore, hasMore, isLoading]);

    useEffect(() => {
        const option = {
            root: null,
            rootMargin: "200px",
            threshold: 0
        };
        const observer = new IntersectionObserver(handleObserver, option);
        if (triggerRef.current) observer.observe(triggerRef.current);

        return () => {
            if (triggerRef.current) observer.unobserve(triggerRef.current);
        };
    }, [handleObserver]);

    return (
        <div ref={triggerRef} className="w-full py-8 flex justify-center">
            {isLoading && <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />}
            {!hasMore && !isLoading && (
                <p className="text-slate-500 text-sm">No hay más productos</p>
            )}
        </div>
    );
};

// --- ACCESO DENEGADO ---
const AccessDenied = ({ onBack }) => (
    <div className="min-h-screen bg-gradient-to-br from-black via-slate-900 to-black flex items-center justify-center p-6">
        <div className="glass p-10 rounded-[2rem] max-w-md w-full text-center border border-red-500/30 shadow-[0_0_40px_rgba(220,38,38,0.15)]">
            <div className="w-24 h-24 rounded-full bg-red-900/20 flex items-center justify-center mx-auto mb-6">
                <Shield className="w-12 h-12 text-red-500" />
            </div>
            <h1 className="text-2xl font-black text-white mb-3">ACCESO DENEGADO</h1>
            <p className="text-slate-400 mb-8">No tienes los permisos necesarios para acceder a esta sección. Contacta con el administrador si crees que es un error.</p>
            <button onClick={onBack} className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition flex items-center justify-center gap-2">
                <ArrowLeft className="w-5 h-5" /> Volver a la Tienda
            </button>
        </div>
    </div>
);

// --- EXPONER EN WINDOW ---
window.SustoreComponents = {
    Toast,
    ConfirmModal,
    ErrorBoundary,
    LoadingSpinner,
    InfiniteScrollTrigger,
    AccessDenied
};

console.log('[Components] ✅ Módulo cargado correctamente');
