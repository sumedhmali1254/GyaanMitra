import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from "react";
import api from "../services/api";
import { toast } from "react-hot-toast";
import { AuthContext } from "./AuthContext";

const ChatContext = createContext();

export const useChat = () => useContext(ChatContext);

const generateTempId = () => "new-" + Math.random().toString(36).substring(2, 11);

const fallbackAnswers = {
  "What features does GyaanMitra have?": "GyaanMitra acts as your personal AI study companion! I come equipped with:\n\n- Study Planner to manage your schedule.\n- Flashcards & Quiz Generator to test your knowledge.\n- Focus Timer & Music Player to keep you in the zone.\n- Analytics to track your progress.\n- And of course, me—your AI assistant!",
  "How does the Study Planner work?": "The Study Planner lets you intuitively organize your learning schedule. You can create different subjects, generate an AI-powered timetable instantly, schedule specific study sessions dynamically, and track your daily progress all in one centralized place!",
  "Can you generate quizzes and flashcards?": "Absolutely! GyaanMitra has a built-in Quiz Generator and Flashcard Maker. You can use your subjects or supply specific topics to automatically construct interactive customized flashcard decks and practice tests, allowing you to breeze through your revision!",
  "How do I track my study progress?": "You can track your consistency closely using the Analytics Dashboard and by checking off your daily Notes & To-Dos. Additionally, every time you complete a Pomodoro session in the Focus Timer, your active study time contributes entirely to your analytics so you can easily spot your best productivity hours!"
};

export const ChatProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [chatSessions, setChatSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);

  const [typingSessionIds, setTypingSessionIds] = useState({}); // { [id]: boolean }
  const [aiStatus, setAiStatus] = useState("checking");
  const [aiModels, setAiModels] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const abortControllersRef = useRef({}); // { [id]: AbortController }

  // Keep live refs so async functions never see stale closures
  const sessionsRef = useRef(chatSessions);
  const activeIdRef = useRef(activeSessionId);
  useEffect(() => { sessionsRef.current = chatSessions; }, [chatSessions]);
  useEffect(() => { activeIdRef.current = activeSessionId; }, [activeSessionId]);

  // Fetch from DB when user logs in / out
  useEffect(() => {
    if (!user?.id) {
      setChatSessions([]);
      setActiveSessionId(null);
      return;
    }

    const fetchSessions = async () => {
      setIsLoadingHistory(true);
      try {
        const res = await api.get("/chatsessions");
        const sessions = res.data.data || [];
        setChatSessions(sessions);
        if (sessions.length > 0) {
          setActiveSessionId(sessions[0].id);
        }
        // If no sessions exist, don't auto-create — user clicks "Start New Chat"
      } catch (error) {
        console.error("Failed to load chat history", error);
      } finally {
        setIsLoadingHistory(false);
      }
    };
    fetchSessions();
  }, [user?.id]);

  // Health check for LM Studio
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await api.get("/ai-health");
        if (res.data?.connected) {
          setAiStatus("connected");
          setAiModels(res.data.models || []);
        } else {
          setAiStatus("disconnected");
          setAiModels([]);
        }
      } catch (error) {
        setAiStatus("disconnected");
        setAiModels([]);
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const activeSession = chatSessions.find(s => s.id === activeSessionId);
  const messages = activeSession ? activeSession.messages : [];

  const cancelChat = useCallback((id = activeIdRef.current) => {
    const controller = abortControllersRef.current[id];
    if (controller) {
      controller.abort();
      delete abortControllersRef.current[id];
      setTypingSessionIds(prev => ({ ...prev, [id]: false }));
      toast.success("Generation cancelled");
    }
  }, []);

  const startNewChat = useCallback(async (forceActive = true) => {
    // Check for an existing empty session to avoid unnecessary duplicates
    const currentSessions = sessionsRef.current;
    const existingEmpty = currentSessions.find(s => s.messages.length === 0);
    if (existingEmpty) {
      if (forceActive) {
        cancelChat();
        setActiveSessionId(existingEmpty.id);
      }
      return existingEmpty.id;
    }

    // Phase 1: Optimistic Local State (so UI reacts instantly)
    // We NO LONGER cancelChat() here to allow background generation
    
    const tempId = generateTempId();
    const localPlaceholder = {
      id: tempId,
      title: "New Chat",
      messages: [],
      updatedAt: new Date().toISOString(),
    };
    
    setChatSessions(prev => [localPlaceholder, ...prev]);
    setActiveSessionId(tempId);
    activeIdRef.current = tempId;

    // Phase 2: Background Persistence
    try {
      const res = await api.post("/chatsessions", { 
        title: "New Chat", 
        messages: [] 
      });
      const dbSession = res.data.data;
      
      // Update the placeholder with the real DB session (synced ID)
      setChatSessions(prev => 
        prev.map(s => s.id === tempId ? dbSession : s)
      );
      
      // Update the reactive state AND the ref to ensure clean handoff
      if (activeIdRef.current === tempId) {
        setActiveSessionId(dbSession.id);
        activeIdRef.current = dbSession.id;
      }
      return dbSession.id;
    } catch (error) {
      console.error("Failed to persist new chat session", error);
      // It stays as a local session (starts with 'new-'), which is already in state
      return tempId;
    }
  }, [cancelChat]);

  const deleteChat = useCallback(async (id) => {
    if (id.startsWith("new-")) {
      setChatSessions(prev => {
        const filtered = prev.filter(s => s.id !== id);
        if (filtered.length > 0) setActiveSessionId(filtered[0].id);
        return filtered;
      });
      return;
    }
    try {
      await api.delete(`/chatsessions/${id}`);
      setChatSessions(prev => {
        const filtered = prev.filter(s => s.id !== id);
        if (filtered.length === 0) {
          setTimeout(() => startNewChat(true), 0);
        } else if (activeIdRef.current === id) {
          setActiveSessionId(filtered[0].id);
        }
        return filtered;
      });
      toast.success("Chat deleted");
    } catch (error) {
      toast.error("Failed to delete chat");
    }
  }, [startNewChat]);

  const renameChat = useCallback(async (id, newTitle) => {
    if (id.startsWith("new-")) return;
    setChatSessions(prev => prev.map(s => s.id === id ? { ...s, title: newTitle } : s));
    try {
      await api.put(`/chatsessions/${id}`, { title: newTitle });
    } catch (err) {
      toast.error("Failed to rename chat in database");
    }
  }, []);

  // Handle switching active sessions
  const switchActiveSession = useCallback((id) => {
    if (id !== activeIdRef.current) {
      setActiveSessionId(id);
    }
  }, []);

  const sendMessage = useCallback(async (messageText, overrideId = null) => {
    if (!messageText.trim() || !user) return;

    // Read from refs or overrideId to avoid transitions causing empty messages
    let currentId = overrideId || activeIdRef.current;
    const latestSessions = sessionsRef.current;
    let currentSession = latestSessions.find(s => s.id === currentId);

    if (!currentSession) return;

    const userMessage = { from: "user", text: messageText, time: new Date().toISOString() };
    const updatedMessages = [...currentSession.messages, userMessage];

    let generatedTitle = currentSession.title;
    let isNewCreation = false;

    if (currentId.startsWith("new-") || currentSession.messages.length === 0) {
      isNewCreation = true;
      const words = messageText.split(" ");
      generatedTitle = words.slice(0, 5).join(" ") + (words.length > 5 ? "..." : "");
    }

    // Optimistic UI update – user message appears immediately
    setChatSessions(prev => prev.map(s => {
      if (s.id === currentId) {
        return { ...s, title: isNewCreation ? generatedTitle : s.title, messages: updatedMessages, updatedAt: new Date().toISOString() };
      }
      return s;
    }));

    // ── Fallback answers (quick questions always answered from code) ──
    if (fallbackAnswers[messageText]) {
      if (isNewCreation) {
        try {
          const fallbackMsg = { from: "ai", text: fallbackAnswers[messageText], time: new Date().toISOString() };
          const finishedMessages = [...updatedMessages, fallbackMsg];
          const dbRes = await api.post("/chatsessions", { title: generatedTitle, messages: finishedMessages });
          const realId = dbRes.data.data.id;
          // IMPORTANT: Update both ID and messages in one go to prevent search failures
          setChatSessions(prev => prev.map(s => s.id === currentId ? { ...s, id: realId, messages: finishedMessages } : s));
          setActiveSessionId(realId);
          activeIdRef.current = realId; 
        } catch (dbErr) {
          console.error("Chat save error:", dbErr);
          // Still show the answer even if DB save fails
          const fallbackMsg = { from: "ai", text: fallbackAnswers[messageText], time: new Date().toISOString() };
          const finishedMessages = [...updatedMessages, fallbackMsg];
          setChatSessions(prev => prev.map(s => s.id === currentId ? { ...s, messages: finishedMessages } : s));
        }
      } else {
        const fallbackMsg = { from: "ai", text: fallbackAnswers[messageText], time: new Date().toISOString() };
        const finishedMessages = [...updatedMessages, fallbackMsg];
        setChatSessions(prev => prev.map(s => s.id === currentId ? { ...s, messages: finishedMessages, updatedAt: new Date().toISOString() } : s));
        api.put(`/chatsessions/${currentId}`, { messages: finishedMessages }).catch(() => {});
      }
      return;
    }

    // ── Normal AI flow ──
    setTypingSessionIds(prev => ({ ...prev, [currentId]: true }));
    const controller = new AbortController();
    abortControllersRef.current[currentId] = controller;

    // Save to DB immediately so chat appears in history even before AI responds
    // If it's a completely new/unsaved session (ID starts with new-), save it to DB
    // Otherwise, it was already created by startNewChat, so we just update it
    if (isNewCreation && currentId.startsWith("new-")) {
      try {
        const dbRes = await api.post("/chatsessions", { title: generatedTitle, messages: updatedMessages });
        const realId = dbRes.data.data.id;
        setChatSessions(prev => prev.map(s => s.id === currentId ? { ...s, id: realId, messages: updatedMessages } : s));
        setActiveSessionId(realId);
        activeIdRef.current = realId; 
        currentId = realId;
      } catch (dbErr) {
        console.error("Chat save error:", dbErr);
      }
    } else {
      // It's either an existing DB session or one created by startNewChat
      // Just update messages and title if it's the first message
      setChatSessions(prev => prev.map(s => 
        s.id === currentId ? { ...s, title: generatedTitle, messages: updatedMessages } : s
      ));
      api.put(`/chatsessions/${currentId}`, { 
        title: generatedTitle, 
        messages: updatedMessages 
      }).catch(() => {});
    }

    try {
      const response = await api.post("/chat", { message: messageText, context: {} }, { signal: controller.signal });

      const aiText = response.data?.response || response.data?.text || "Sorry, I couldn't generate a response.";
      const aiMsg = { from: "ai", text: aiText, time: new Date().toISOString() };
      const finalMessages = [...updatedMessages, aiMsg];

      setChatSessions(prev => prev.map(s => s.id === currentId ? { ...s, messages: finalMessages, updatedAt: new Date().toISOString() } : s));
      await api.put(`/chatsessions/${currentId}`, { messages: finalMessages });

      if (window.location.pathname !== "/chatbot") {
        toast.success("Gyaani AI: I've answered your question!", { icon: "🤖", duration: 5000 });
      }
    } catch (error) {
      if (error.name === "CanceledError" || error.code === "ERR_CANCELED") return;
      console.error("Gyaani AI error:", error);
      const errorMsg = error.response?.status === 401
        ? "Please log in to use the AI assistant."
        : "Sorry, I couldn't connect to the AI service. Make sure LM Studio is running with the Qwen model loaded.";
      const errMsg = { from: "ai", text: errorMsg, time: new Date().toISOString() };
      const finalMsgWithErr = [...updatedMessages, errMsg];
      setChatSessions(prev => prev.map(s => s.id === currentId ? { ...s, messages: finalMsgWithErr } : s));
      api.put(`/chatsessions/${currentId}`, { messages: finalMsgWithErr }).catch(() => {});
    } finally {
      setTypingSessionIds(prev => ({ ...prev, [currentId]: false }));
      delete abortControllersRef.current[currentId];
    }
  }, [user, aiStatus]);

  return (
    <ChatContext.Provider value={{
      chatSessions,
      setChatSessions,
      activeSessionId,
      messages,
      isTyping: typingSessionIds[activeSessionId] || false,
      typingSessionIds,
      aiStatus,
      aiModels,
      isLoadingHistory,
      sendMessage,
      cancelChat,
      startNewChat,
      deleteChat,
      renameChat,
      switchActiveSession,
      clearChat: startNewChat
    }}>
      {children}
    </ChatContext.Provider>
  );
};
