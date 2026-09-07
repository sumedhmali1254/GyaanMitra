import React from "react";
import "./PlannerSidebar.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import { CCalendar } from "@coreui/react-pro";

const PlannerSidebar = ({
  isOpen,
  onToggle,
  stats,
  priority,
  recommendedHours,
  subjectsCount,
  onGeneratePlan,
  planLoading,
  onClearPlan,
  aiRecommendations = [],
  onShowAdvisor,
}) => {
  const alertCount = aiRecommendations.length;
  return (
    <aside className={`planner-sidebar-shell ${isOpen ? "open" : "collapsed"}`}>
      <button
        className="planner-sidebar-toggle"
        onClick={onToggle}
        type="button"
        aria-label={
          isOpen ? "Collapse planner sidebar" : "Expand planner sidebar"
        }
      >
        <i
          className={`bi ${isOpen ? "bi-chevron-left" : "bi-chevron-right"}`}
        ></i>
      </button>

      {isOpen && (
        <div className="planner-sidebar-content">
          {/* Stats first */}
          <div className="stats-cards p-3">
            <div className="stat-card mb-3">
              <div className="d-flex align-items-center">
                <i className="bi bi-book me-3 text-primary fs-4"></i>
                <div>
                  <div className="fw-bold fs-4">{subjectsCount}</div>
                  <div className="text-muted small">Subjects</div>
                </div>
              </div>
            </div>

            <div className="stat-card mb-3">
              <div className="d-flex align-items-center">
                <i className="bi bi-clock-history me-3 text-success fs-4"></i>
                <div>
                  <div className="fw-bold fs-4">{stats.totalSessions}</div>
                  <div className="text-muted small">Sessions</div>
                </div>
              </div>
            </div>

            <div className="stat-card mb-3">
              <div className="d-flex align-items-center">
                <i className="bi bi-hourglass-split me-3 text-warning fs-4"></i>
                <div>
                  <div className="fw-bold fs-4">
                    {stats.totalHours.toFixed(1)}h
                  </div>
                  <div className="text-muted small">Planned</div>
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="d-flex align-items-center">
                <i className="bi bi-exclamation-triangle me-3 text-danger fs-4"></i>
                <div>
                  <div className="fw-bold fs-4">{stats.highPriority}</div>
                  <div className="text-muted small">High Priority</div>
                </div>
              </div>
            </div>
          </div>

          {/* AI Card */}
          <div className="ai-card p-3 mb-3 mx-3">
            <div className="d-flex align-items-center mb-2">
              <i className="bi bi-robot me-2"></i>
              <small className="text-uppercase fw-bold text-muted">
                AI Rec
              </small>
            </div>

            <div
              className={`priority-badge priority-${priority} mb-2 px-3 py-2 rounded-pill small fw-bold`}
            >
              {priority.toUpperCase()}
            </div>

            <div className="d-flex align-items-center justify-content-between">
              <div className="fw-bold text-primary">{recommendedHours}h/day</div>
              {alertCount > 0 && (
                <div 
                  className="badge bg-danger rounded-pill" 
                  style={{ fontSize: '0.65rem', cursor: 'pointer' }}
                  onClick={onShowAdvisor}
                >
                  {alertCount} ALERT{alertCount > 1 ? 'S' : ''}
                </div>
              )}
            </div>
          </div>

          {/* AI Advisor Quick View */}
          {alertCount > 0 && (
            <div className="advisor-quick-view px-3 mb-3">
              <div className="p-3 bg-white border rounded-3 position-relative" style={{ borderLeft: '4px solid #ef4444' }}>
                <h6 className="fw-bold small mb-2 d-flex align-items-center">
                  <i className="bi bi-shield-exclamation text-danger me-2"></i>
                  Advisor Alerts
                </h6>
                <div style={{ maxHeight: '100px', overflowY: 'auto', marginBottom: '10px' }}>
                  {aiRecommendations.slice(0, 3).map((rec, i) => (
                    <div key={i} className="text-muted extra-small mb-1 d-flex align-items-center">
                      <i className="bi bi-dot text-danger fs-4"></i>
                      <span className="text-truncate">{rec.subjectName}</span>
                    </div>
                  ))}
                  {alertCount > 3 && (
                    <div className="text-muted extra-small ps-3">+{alertCount - 3} more...</div>
                  )}
                </div>
                <button 
                  className="btn btn-sm btn-light w-100 border fw-bold text-primary" 
                  style={{ fontSize: '0.7rem' }}
                  onClick={onShowAdvisor}
                >
                  Review All Advice
                </button>
              </div>
            </div>
          )}

          {/* Calendar */}
          <div className="planner-calendar-wrap px-3 mb-3">
            <div className="planner-calendar-card p-3">
              <h6 className="fw-bold mb-3">Study Calendar</h6>
              <div className="d-flex justify-content-center">
                <CCalendar
                  className="border rounded planner-calendar"
                  locale="en-US"
                  startDate="2024-02-13"
                />
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="sidebar-actions p-3">
            <button
              className="btn btn-primary w-100 mb-2"
              onClick={onGeneratePlan}
              disabled={planLoading || subjectsCount === 0}
            >
              {planLoading ? (
                <>
                  <i className="bi bi-hourglass-split me-2"></i>
                  Generating...
                </>
              ) : (
                <>
                  <i className="bi bi-magic me-2"></i>
                  Generate Plan
                </>
              )}
            </button>

            <button
              className="btn btn-outline-secondary w-100"
              onClick={onClearPlan}
              disabled={subjectsCount === 0}
            >
              <i className="bi bi-trash me-2"></i>
              Clear Plan
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};

export default PlannerSidebar;
