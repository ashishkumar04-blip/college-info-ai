import { createContext, useContext, useState } from "react";

// Create the context
const AuthContext = createContext();

// This wraps the whole app and shares login state everywhere
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    // Check if user was already logged in (from a previous session)
    const name = localStorage.getItem("user_name");
    const token = localStorage.getItem("token");
    return name && token ? { name } : null;
  });

  const loginUser = (token, name) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user_name", name);
    setUser({ name });
  };

  const logoutUser = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user_name");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loginUser, logoutUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook — lets any component access auth state easily
export function useAuth() {
  return useContext(AuthContext);
}
