import axios from "axios";

const api = axios.create({
  baseURL: "/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("sb_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("sb_token");
      localStorage.removeItem("sb_user");
      // Clear redux auth state too (not just localStorage) so the navbar and
      // route guards react immediately instead of only after a reload.
      // Imported lazily to avoid a circular import with the store module.
      import("../redux/store").then(({ store }) => {
        import("../redux/slices/authSlice").then(({ logout }) => {
          store.dispatch(logout());
        });
      });
    }
    return Promise.reject(err);
  }
);

export default api;
