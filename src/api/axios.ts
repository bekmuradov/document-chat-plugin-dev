import axios from "axios";
import {EventSource} from "eventsource";

export const getEventSource = (sseUrl: string) => {
  const sourceInitDict = {
    withCredentials: true,
  };
  return new EventSource(sseUrl, sourceInitDict);
};

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL,
});

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
// eyJhbGciOiJIUzI1NiIsImtpZCI6InRkR3RndCtNZXpFcHhrelEiLCJ0eXAiOiJKV1QifQ
// eyJhbGciOiJIUzI1NiIsImtpZCI6InRkR3RndCtNZXpFcHhrelEiLCJ0eXAiOiJKV1QifQ
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    console.log(error, "errr");
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      try {
        const response = await axiosInstance.post("/auth/refresh-session", {
          refreshToken: localStorage.getItem("refresh_token"),
        });

        if (response.data?.session?.access_token) {
          localStorage.setItem(
            "access_token",
            response.data.session.access_token
          );
          localStorage.setItem(
            "refresh_token",
            response.data.session.refresh_token
          );

          // Retry original request with new token
          error.config.headers.Authorization = `Bearer ${response.data.access_token}`;
          return axiosInstance(error.config);
        } else {
          // Handle refresh token failure
          console.log("Refresh token failed");
        }
      } catch (refreshError) {
        console.error("Refresh token request failed", refreshError);
      }
    }
    return Promise.reject(error);
  },
);

export default axiosInstance;
