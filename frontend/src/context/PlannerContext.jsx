import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from "react";
import { AuthContext } from "./AuthContext";
import api from "../services/api";

const PlannerContext = createContext(null);

export const usePlanner = () => useContext(PlannerContext);

export const PlannerProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const userId = user?.id || user?._id || "guest";

  // State
  const [subjects, setSubjects] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [aiRecommendations, setAiRecommendations] = useState([]);
  
  // User prefs
  const [priority, setPriority] = useState("normal");
  const [recommendedHours, setRecommendedHours] = useState(2);
  const [planLoading, setPlanLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [editingSubjectId, setEditingSubjectId] = useState(null);
  const [showAIAdvisorModal, setShowAIAdvisorModal] = useState(false);

  // Load data when component mounts and user is authenticated
  useEffect(() => {
    if (userId === "guest") {
      setSubjects([]);
      setSessions([]);
      setAiRecommendations([]);
      return;
    }

    const loadPlannerData = async () => {
      try {
        const [subjectsRes, sessionsRes, recommendationsRes] = await Promise.all([
          api.get("/planner/subjects"),
          api.get("/planner/sessions"),
          api.get("/planner/recommendations")
        ]);
        
        setSubjects(subjectsRes.data || []);
        setSessions(sessionsRes.data || []);
        setAiRecommendations(recommendationsRes.data || []);
      } catch (error) {
        console.error("Error loading planner data from DB:", error);
      }
    };

    loadPlannerData();
  }, [userId]);

  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today);
    monday.setDate(diff);
    return monday;
  });

  const goToDate = useCallback((date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    setSelectedDate(d);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d);
    monday.setDate(diff);
    setCurrentWeekStart(monday);
  }, []);

  const stats = useMemo(() => ({
    totalSessions: sessions.length,
    completedSessions: sessions.filter((s) => s.completed).length,
    totalHours: sessions.reduce((sum, s) => sum + (s.duration || 1), 0),
    highPriority: sessions.filter((s) => s.priority === "high").length,
  }), [sessions]);

  // Database-backed methods
  const addSubject = useCallback(async (subjectPayload) => {
    if (userId === "guest") return;
    try {
      const { data } = await api.post("/planner/subjects", { ...subjectPayload, id: Date.now().toString() });
      setSubjects((prev) => [...prev, data]);
    } catch (error) {
      console.error("Failed to add subject to database:", error);
    }
  }, [userId]);

  const updateSubject = useCallback(async (id, subjectPayload) => {
    setSubjects(prev => prev.map(s => s.id === id ? { ...s, ...subjectPayload } : s));
    if (userId === "guest") return;
    try {
      await api.put(`/planner/subjects/${id}`, subjectPayload);
    } catch (error) {
      console.error("Failed to update subject in database:", error);
    }
  }, [userId]);

  const removeSubject = useCallback(async (id) => {
    setSubjects((prev) => prev.filter((s) => s.id !== id));
    if (userId === "guest") return;
    try {
      await api.delete(`/planner/subjects/${id}`);
    } catch (error) {
      console.error("Failed to delete subject from database:", error);
    }
  }, [userId]);

  const saveRecommendations = useCallback(async (recommendations) => {
    setAiRecommendations(recommendations);
    if (userId === "guest") return;
    try {
      await api.post("/planner/recommendations/bulk", { recommendations });
    } catch (error) {
      console.error("Failed to save recommendations to database:", error);
    }
  }, [userId]);

  const generateStudyPlan = useCallback(async (inputs) => {
    setPlanLoading(true);
    try {
      const { data: plan } = await api.post("/planner/generate", inputs);
      const recommendations = plan.alerts || [];
      setAiRecommendations(recommendations);
      if (recommendations.length > 0) {
        setShowAIAdvisorModal(true);
        if (userId !== "guest") {
          await api.post("/planner/recommendations/bulk", { recommendations });
        }
      }
    } catch (error) {
      console.error("Failed to generate study plan:", error);
    } finally {
      setPlanLoading(false);
    }
  }, [userId]);

  const saveSessions = useCallback(async (newSessions) => {
    // Optimistically update
    setSessions(newSessions);
    if (userId === "guest") return;
    try {
      await api.post("/planner/sessions/bulk", { sessions: newSessions });
    } catch (error) {
      console.error("Failed to save sessions to database:", error);
    }
  }, [userId]);

  const clearSessions = useCallback(async () => {
    setSessions([]);
    if (userId === "guest") return;
    try {
      await api.delete("/planner/sessions");
    } catch (error) {
      console.error("Failed to clear sessions from database:", error);
    }
  }, [userId]);

  const toggleSessionComplete = useCallback(async (id) => {
    let newStatus = false;
    setSessions(prev => prev.map(s => {
      if (s.id === id) {
        newStatus = !s.completed;
        return { ...s, completed: newStatus };
      }
      return s;
    }));

    if (userId === "guest") return;
    try {
      await api.put(`/planner/sessions/${id}`, { completed: newStatus });
    } catch (error) {
      console.error("Failed to update session status in database:", error);
    }
  }, [userId]);

  const value = useMemo(() => ({
    subjects, setSubjects, addSubject, updateSubject, removeSubject,
    sessions, setSessions: saveSessions, clearSessions, toggleSessionComplete,
    currentWeekStart, setCurrentWeekStart, goToDate,
    selectedDate, setSelectedDate,
    stats, priority, setPriority,
    recommendedHours, setRecommendedHours,
    planLoading, setPlanLoading,
    editingSubjectId, setEditingSubjectId,
    aiRecommendations, setAiRecommendations, saveRecommendations,
    showAIAdvisorModal, setShowAIAdvisorModal, generateStudyPlan
  }), [subjects, sessions, currentWeekStart, selectedDate, stats, priority, recommendedHours, planLoading, goToDate, addSubject, updateSubject, removeSubject, saveSessions, clearSessions, toggleSessionComplete, editingSubjectId, aiRecommendations, showAIAdvisorModal, saveRecommendations, generateStudyPlan]);

  return (
    <PlannerContext.Provider value={value}>
      {children}
    </PlannerContext.Provider>
  );
};

export default PlannerContext;
