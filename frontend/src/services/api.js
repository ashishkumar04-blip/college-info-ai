import axios from "axios";

// Base URL of your backend
const API = axios.create({
  baseURL: "http://localhost:8000/api",
});

// Automatically attach the token to every request if logged in
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth functions
export const signup = (name, email, password) =>
  API.post("/auth/signup", { name, email, password });

export const login = (email, password) =>
  API.post("/auth/login", { email, password });

export default API;
