import React from 'react';
import { User, LogIn, LogOut, Mail, Lock, Phone, Shield, UserPlus } from 'lucide-react';

export const Auth = ({ loginMode, setLoginMode, authData, setAuthData, handleAuth, isLoading }) => {
    return (
        <div className="max-w-md mx-auto pt-20 animate-fade-up">
            <div className="bg-[#0a0a0a] border border-slate-800 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-purple-600"></div>

                <h2 className="text-3xl font-black text-white mb-8 text-center uppercase tracking-tighter">
                    {loginMode ? 'Iniciar Sesión' : 'Crear Cuenta'}
                </h2>

                <div className="space-y-4">
                    {!loginMode && (
                        <>
                            <AuthInput icon={User} placeholder="Nombre Completo" value={authData.name} onChange={v => setAuthData({ ...authData, name: v })} />
                            <AuthInput icon={UserPlus} placeholder="Nombre de Usuario" value={authData.username} onChange={v => setAuthData({ ...authData, username: v })} />
                        </>
                    )}
                    <AuthInput icon={Mail} placeholder="Email" value={authData.email} onChange={v => setAuthData({ ...authData, email: v })} />
                    <AuthInput icon={Lock} placeholder="Contraseña" type="password" value={authData.password} onChange={v => setAuthData({ ...authData, password: v })} />
                </div>

                <button
                    onClick={() => handleAuth(!loginMode)}
                    disabled={isLoading}
                    className="w-full mt-8 py-4 bg-white text-black font-black rounded-2xl hover:bg-cyan-400 transition shadow-lg flex items-center justify-center gap-2"
                >
                    {isLoading ? 'PROCESANDO...' : loginMode ? 'INGRESAR' : 'REGISTRARME'}
                </button>

                <p className="mt-8 text-center text-slate-500 text-sm font-bold">
                    {loginMode ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
                    <button onClick={() => setLoginMode(!loginMode)} className="text-cyan-400 ml-2 hover:underline">
                        {loginMode ? 'Regístrate aquí' : 'Inicia sesión'}
                    </button>
                </p>
            </div>
        </div>
    );
};

const AuthInput = ({ icon: Icon, placeholder, value, onChange, type = "text" }) => (
    <div className="relative">
        <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
        <input
            type={type}
            placeholder={placeholder}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 pl-12 text-white placeholder-slate-600 focus:border-cyan-500 outline-none transition"
            value={value}
            onChange={e => onChange(e.target.value)}
        />
    </div>
);
