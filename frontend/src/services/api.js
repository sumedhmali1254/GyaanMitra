import axios from "axios";

// const api = axios.create({
//   baseURL: "http://localhost:5000/api",
//   headers: {
//     "Content-Type": "application/json",
//   },
// });

// [DEPLOYMENT UPDATE]: Use the Vercel environment variable for the Render API.
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, "");

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// This interceptor automatically attaches the user's login token to all backend requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * ==============================================================================
 * CENTRAL ENDPOINTS DIRECTORY
 * This file contains ALL API routes used throughout the particular GyaanMitra frontend!
 * Use these constants instead of hardcoding API routes into your .jsx pages.
 * ==============================================================================
 */

export const Endpoints = {
  // 1. Authentication & Users
  Auth: {
    Login: "/auth/login", // POST: Validates user credentials and returns JWT token
    Register: "/auth/register", // POST: Creates a new student user in the database
    Profile: "/auth/profile", // PUT: Updates user avatar, username, and bio
  },

  // 2. Chatbot & AI Assistance
  Gyaani: {
    Chat: "/chatbot/chat", // POST: Sends user queries to LM Studio (Qwen LLM) and returns AI response
  },

  // 3. Quizzes & Tests
  Quizzes: {
    GetAll: "/quizzes", // GET: Retrieves all previously saved quizzes for the user
    GetById: (id) => `/quizzes/${id}`, // GET: Fetches a specific quiz layout by its database ID
    GenerateSingle: "/quizzes/generate", // POST: Uses LM Studio to generate a single interactive quiz from a topic
    SaveScore: (id) => `/quizzes/${id}/score`, // POST: Records the user's final quiz score into the database
  },

  // 4. Flashcards
  Flashcards: {
    GetBySource: (source) => `/flashcards?source=${source}`, // GET: Fetches user flashcards (filtered by 'pdf' or 'manual')
    GenerateBulk: "/flashcards/generate-all-ai", // POST: Processes entire syllabus into 50+ flashcards sequentially via AI
  },

  // 5. Study Notes & To-Do Lists
  Notes: {
    GetAll: "/notes", // GET: Gets all markdown notes and active todos mapped to the user
    AddTopic: "/notes/topic", // POST: Creates a new main study topic category
    AddNote: (topicId) => `/notes/${topicId}`, // POST: Appends a fast note/todo inside a specific topic
    ToggleTodo: (topicId, noteId) => `/notes/${topicId}/${noteId}/toggle`, // PUT: Checkmarks a to-do item
  },

  // 6. External Real-Time Feeds (Like Jamendo)
  External: {
    // GET: Connects purely over internet (no backend required) to stream Lofi/chill study variants!
    JamendoStream: (clientId) =>
      `https://api.jamendo.com/v3.0/tracks/?client_id=${clientId}&format=json&limit=30&tags=lofi&audioformat=mp32`,
  },
};

export default api;
