import { useState, useEffect } from 'react';
import { loginUser, registerUser } from 'services';

export const useAuth = () => {
    const [currentUser, setCurrentUser] = useState(() => {
        try {
            const saved = localStorage.getItem('nexus_user_data');
            return saved ? JSON.parse(saved) : null;
        } catch (e) { return null; }
    });

    useEffect(() => {
        if (currentUser) {
            localStorage.setItem('nexus_user_data', JSON.stringify(currentUser));
        } else {
            localStorage.removeItem('nexus_user_data');
        }
    }, [currentUser]);

    const login = async (email, pass) => {
        const user = await loginUser(email, pass);
        setCurrentUser(user);
        return user;
    };

    const register = async (data) => {
        const user = await registerUser(data);
        setCurrentUser(user);
        return user;
    };

    const logout = () => setCurrentUser(null);

    return { currentUser, login, register, logout };
};
