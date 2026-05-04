import React, { useState } from "react";
import "./AddSubjectModal.css";
import GyaanCalendar from "../../components/GyaanCalendar";
import { useSettings } from "../../context/SettingsContext";

const AddSubjectModal = ({
  isOpen,
  onClose,
  beginnerMode,
  onBeginnerModeChange,
  subject,
  examDate,
  chapters,
  familiarity,
  syllabusSize,
  difficulty,
  pastScore,
  completion,
  priority,
  recommendedHours,
  daysLeft,
  confidence,
  mlLoading,
  mlError,
  onSubjectChange,
  onExamDateChange,
  onChaptersChange,
  onFamiliarityChange,
  onSyllabusSizeChange,
  onDifficultyChange,
  onPastScoreChange,
  onCompletionChange,
  onAIPrediction,
  onAddSubject,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            <i className="bi bi-plus-circle-fill"></i>
            Add New Subject
          </h2>
          <button className="modal-close-fab" onClick={onClose} aria-label="Close modal">
            <i className="bi bi-x"></i>
          </button>
        </div>

        <div className="modal-body">
          {mlError && (
            <div className="alert alert-error">
              <i className="bi bi-exclamation-circle"></i>
              <span>{mlError}</span>
            </div>
          )}

          <div className="form-section">
            <div className="form-section-header">
              <h3>Basic Information</h3>
              <div className="beginner-toggle">
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={beginnerMode}
                    onChange={(e) => onBeginnerModeChange(e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
                <span className="toggle-label">Beginner Mode</span>
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">
                  Subject Name <span className="required">*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g., Mathematics, Physics"
                  value={subject}
                  onChange={(e) => onSubjectChange(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Exam Date <span className="required">*</span>
                </label>
                <GyaanCalendar
                  value={examDate}
                  onChange={onExamDateChange}
                />
              </div>
            </div>

            <div className="form-group full-width">
              <label className="form-label">
                Number of Chapters: <span className="value">{chapters}</span>
              </label>
              <input
                type="range"
                className="form-range"
                min="1"
                max="50"
                value={chapters}
                onChange={(e) => onChaptersChange(parseInt(e.target.value))}
              />
            </div>
          </div>

          {!beginnerMode ? (
            <div className="form-section">
              <h3>Advanced Details</h3>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Difficulty (1-10)</label>
                  <div className="input-with-value">
                    <input
                      type="number"
                      className="form-input"
                      min="1"
                      max="10"
                      value={difficulty}
                      onChange={(e) =>
                        onDifficultyChange(parseInt(e.target.value))
                      }
                    />
                    <span className="value-badge">{difficulty}/10</span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Past Score (%)</label>
                  <div className="input-with-value">
                    <input
                      type="number"
                      className="form-input"
                      min="0"
                      max="100"
                      value={pastScore}
                      onChange={(e) =>
                        onPastScoreChange(parseInt(e.target.value))
                      }
                    />
                    <span className="value-badge">{pastScore}%</span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Completion (%)</label>
                  <div className="input-with-value">
                    <input
                      type="number"
                      className="form-input"
                      min="0"
                      max="100"
                      value={completion}
                      onChange={(e) =>
                        onCompletionChange(parseInt(e.target.value))
                      }
                    />
                    <span className="value-badge">{completion}%</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="form-section">
              <h3>Beginner Details</h3>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Familiarity</label>
                  <select
                    className="form-select"
                    value={familiarity}
                    onChange={(e) => onFamiliarityChange(e.target.value)}
                  >
                    <option value="none">Never studied</option>
                    <option value="basic">Basic knowledge</option>
                    <option value="moderate">Moderate knowledge</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Syllabus Size</label>
                  <select
                    className="form-select"
                    value={syllabusSize}
                    onChange={(e) => onSyllabusSizeChange(e.target.value)}
                  >
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button
            className="btn btn-primary"
            onClick={onAIPrediction}
            disabled={mlLoading}
          >
            {mlLoading ? (
              <>
                <span className="spinner"></span>
                Analyzing...
              </>
            ) : (
              <>
                <i className="bi bi-lightning-fill"></i>
                Get AI Prediction
              </>
            )}
          </button>
          <button className="btn btn-success" onClick={onAddSubject}>
            <i className="bi bi-check-circle"></i>
            Add Subject
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddSubjectModal;
