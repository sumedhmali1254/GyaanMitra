import React from "react";
import { Routes, Route } from "react-router-dom";

import Layout from "../components/Layout";
import LoginPage from "../pages/LoginPage";
import SignupPage from "../pages/SignupPage";
import DashboardPage from "../pages/DashboardPage";
import ChatbotPage from "../pages/ChatbotPage";
import StudyPlannerPage from "../pages/StudyPlannerPage";
import FlashcardsPage from "../pages/FlashcardsPage";
import QuizGeneratorPage from "../pages/QuizGeneratorPage";
import NotesTodoPage from "../pages/NotesTodoPage";
import FocusTimerPage from "../pages/FocusTimerPage";
import AnalyticsDashboardPage from "../pages/AnalyticsDashboardPage";
import MusicPlayerPage from "../pages/MusicPlayerPage";
import SettingsPage from "../pages/SettingsPage";
import ProfilePage from "../pages/ProfilePage";
import ProtectedRoute from "../components/ProtectedRoute";

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<LoginPage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/signup" element={<SignupPage />} />

    <Route
      element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }
    >
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/chatbot" element={<ChatbotPage />} />
      <Route path="/planner" element={<StudyPlannerPage />} />
      <Route path="/flashcards" element={<FlashcardsPage />} />
      <Route path="/quiz" element={<QuizGeneratorPage />} />
      <Route path="/notes" element={<NotesTodoPage />} />
      <Route path="/timer" element={<FocusTimerPage />} />
      <Route path="/analytics" element={<AnalyticsDashboardPage />} />
      <Route path="/music" element={<MusicPlayerPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route index element={<DashboardPage />} />
    </Route>
  </Routes>
);

export default AppRoutes;
