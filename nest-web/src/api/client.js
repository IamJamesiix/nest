import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
});

// attach the token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("nest_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// a 401 means the token is missing or expired, so log the user out
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const onLoginPage = window.location.pathname.startsWith("/login");
    if (err.response?.status === 401 && localStorage.getItem("nest_token") && !onLoginPage) {
      localStorage.removeItem("nest_token");
      window.location.href = "/login?expired=1";
    }
    return Promise.reject(err);
  }
);

// pull a readable message out of any API error
export const errMsg = (err) => {
  if (err?.response?.data?.message) return err.response.data.message;
  if (err?.request && !err?.response) return "Can't reach the server. Check that the API is running on port 5000.";
  return err?.message || "Something went wrong";
};

export default api;
