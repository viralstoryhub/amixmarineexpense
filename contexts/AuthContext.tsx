import React, { createContext, useContext, useState, useEffect } from 'react';

type UserRole = 'field' | 'manager' | null;

interface AuthContextType {
    role: UserRole;
    login: (passcode: string) => boolean;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [role, setRole] = useState<UserRole>(null);

    useEffect(() => {
        const savedRole = localStorage.getItem('amix_user_role') as UserRole;
        if (savedRole) setRole(savedRole);
    }, []);

    const login = (passcode: string): boolean => {
        if (passcode === '1234') { // Field Staff
            setRole('field');
            localStorage.setItem('amix_user_role', 'field');
            return true;
        }
        if (passcode === '8888') { // Manager
            setRole('manager');
            localStorage.setItem('amix_user_role', 'manager');
            return true;
        }
        return false;
    };

    const logout = () => {
        setRole(null);
        localStorage.removeItem('amix_user_role');
    };

    return (
        <AuthContext.Provider value={{ role, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};
