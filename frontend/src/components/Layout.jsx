import React, { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import SubSidebar from "./SubSidebar";
import SettingsSubSidebar from "./SettingsSubSidebar";
import ChatSubSidebar from "./ChatSubSidebar";
import Header from "./Header";
import { PlannerProvider } from "../context/PlannerContext";
import { useTimer } from "../context/TimerContext";
import "./Header.css";
import "./SubSidebar.css";

const Layout = () => {
  const { isAlarmActive } = useTimer();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const location = useLocation();

  const isPlannerPage = location.pathname === "/planner";
  const isSettingsPage = location.pathname === "/settings";
  const isChatbotPage = location.pathname === "/chatbot";

  useEffect(() => {
    setSidebarOpen(false);
  }, [location]);

  const getPageTitle = () => {
    const path = location.pathname;
    const titles = {
      "/dashboard": "Dashboard",
      "/chatbot": "AI Chatbot",
      "/planner": "Study Planner",
      "/flashcards": "Flashcards",
      "/quiz": "Quiz Generator",
      "/notes": "Notes & To-Do",
      "/timer": "Focus Timer",
      "/analytics": "Analytics Dashboard",
      "/music": "Music Player",
      "/profile": "My Profile",
      "/settings": "Settings",
    };
    return titles[path] || "Gyaan Mitra";
  };

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const toggleSidebarExpanded = () => setSidebarExpanded(!sidebarExpanded);
  const closeSidebar = () => setSidebarOpen(false);

  const content = (
    <div className="planner-container">
      {isPlannerPage && <SubSidebar />}
      {isSettingsPage && <SettingsSubSidebar />}
      {isChatbotPage && <ChatSubSidebar />}
      <main
        className={`page-content ${(isPlannerPage || isSettingsPage || isChatbotPage) ? "planner-page-active" : ""}`}
      >
        <Outlet />
      </main>
    </div>
  );

  return (
    <div className={`app-container ${isAlarmActive ? "timer-alarm-active" : ""}`}>
      {sidebarOpen && (
        <div className="sidebar-overlay mobile-open" onClick={closeSidebar}></div>
      )}

      <Sidebar
        isOpen={sidebarOpen}
        isExpanded={sidebarExpanded}
        onClose={closeSidebar}
        onToggle={toggleSidebarExpanded}
      />

      <div className={`main-wrapper ${!sidebarExpanded ? "sidebar-collapsed" : ""}`}>
        <Header
          sidebarOpen={sidebarOpen}
          toggleSidebar={toggleSidebar}
          getPageTitle={getPageTitle()}
        />

        {isPlannerPage ? (
          <PlannerProvider>{content}</PlannerProvider>
        ) : (
          content
        )}
      </div>
    </div>
  );
};

export default Layout;
