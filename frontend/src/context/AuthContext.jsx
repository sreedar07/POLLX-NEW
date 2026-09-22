import React, { createContext, useContext, useState, useEffect } from "react";
import { api } from "../api/client";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token") || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const userData = await api.get("/api/auth/me");
        setUser(userData);
      } catch (err) {
        console.warn("Session expired or invalid, clearing credentials:", err.message);
        logout();
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [token]);

  const login = async (email, password) => {
    const cleanEmail = email ? email.trim() : "";
    const data = await api.post("/api/auth/login", { email: cleanEmail, password });
    if (data.token) {
      localStorage.setItem("token", data.token);
      setToken(data.token);
    }
    if (data.user) {
      setUser(data.user);
    }
    return data;
  };

  const verifyOTP = async (email, otp) => {
    const cleanEmail = email ? email.trim() : "";
    const cleanOtp = otp ? otp.trim() : "";
    const data = await api.post("/api/auth/verify-otp", { email: cleanEmail, otp: cleanOtp });
    if (data.token) {
      localStorage.setItem("token", data.token);
      setToken(data.token);
    }
    if (data.user) {
      setUser(data.user);
    }
    return data.user;
  };

  const resendOTP = async (email) => {
    const cleanEmail = email ? email.trim() : "";
    return await api.post("/api/auth/resend-otp", { email: cleanEmail });
  };

  const register = async (registrationData) => {
    const payload = {
      ...registrationData,
      email: registrationData?.email ? registrationData.email.trim() : "",
    };
    const data = await api.post("/api/auth/register", payload);
    if (data.token) {
      localStorage.setItem("token", data.token);
      setToken(data.token);
    }
    if (data.user) {
      setUser(data.user);
    }
    return data;
  };

  const verifyEmail = async (email, code) => {
    const data = await api.post("/api/auth/verify-email", { email, code });
    if (data.token) {
      localStorage.setItem("token", data.token);
      setToken(data.token);
    }
    if (data.user) {
      setUser(data.user);
    }
    return data.user;
  };

  const resendCode = async (email) => {
    return await api.post("/api/auth/resend-code", { email });
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      loading, 
      login, 
      verifyOTP,
      resendOTP,
      register, 
      verifyEmail,
      resendCode,
      logout, 
      isAuthenticated: !!user,
      isAdmin: user?.role === "admin",
      isVerified: !!user?.is_verified,
      badges: user?.badges || []
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
