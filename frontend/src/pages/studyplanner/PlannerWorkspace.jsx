import React from "react";
import GyaanCalendar from "../../components/GyaanCalendar";

const PlannerWorkspace = ({
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
  return (
    <div className="add-subject-form">
      <div className="form-header">
        <h4>
          <i className="bi bi-plus-circle"></i>
          Add New Subject
        </h4>
        <div className="beginner-toggle">
          <label className="switch">
            <input
              type="checkbox"
              checked={beginnerMode}
              onChange={(e) => onBeginnerModeChange(e.target.checked)}
            />
            <span className="slider"></span>
          </label>
          <span>Beginner Mode</span>
        </div>
      </div>

      {mlError && (
        <div className="alert error">
          <i className="bi bi-exclamation-circle"></i>
          {mlError}
        </div>
      )}

      <div className="form-grid">
        <div className="form-group">
          <label>Subject Name *</label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g., Mathematics"
            value={subject}
            onChange={(e) => onSubjectChange(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Exam Date *</label>
          <GyaanCalendar
            value={examDate}
            onChange={onExamDateChange}
          />
        </div>

        <div className="form-group full-width">
          <label>Number of Chapters: {chapters}</label>
          <input
            type="range"
            className="form-range"
            min="1"
            max="50"
            value={chapters}
            onChange={(e) => onChaptersChange(parseInt(e.target.value))}
          />
        </div>

        {!beginnerMode ? (
          <>
            <div className="form-group">
              <label>Difficulty (1-10)</label>
              <input
                type="number"
                className="form-input"
                min="1"
                max="10"
                value={difficulty}
                onChange={(e) => onDifficultyChange(parseInt(e.target.value))}
              />
            </div>

            <div className="form-group">
              <label>Past Score %</label>
              <input
                type="number"
                className="form-input"
                min="0"
                max="100"
                value={pastScore}
                onChange={(e) => onPastScoreChange(parseInt(e.target.value))}
              />
            </div>

            <div className="form-group">
              <label>Completion %</label>
              <input
                type="number"
                className="form-input"
                min="0"
                max="100"
                value={completion}
                onChange={(e) => onCompletionChange(parseInt(e.target.value))}
              />
            </div>
          </>
        ) : (
          <>
            <div className="form-group">
              <label>Familiarity</label>
              <select
                className="form-select"
                value={familiarity}
                onChange={(e) => onFamiliarityChange(e.target.value)}
              >
                <option value="none">None</option>
                <option value="little">Little</option>
                <option value="moderate">Moderate</option>
                <option value="strong">Strong</option>
              </select>
            </div>

            <div className="form-group">
              <label>Syllabus Size</label>
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
          </>
        )}
      </div>

      <div className="form-actions">
        <button
          className="btn-predict"
          onClick={onAIPrediction}
          disabled={mlLoading || !subject || !examDate}
        >
          {mlLoading ? (
            <>
              <i className="bi bi-hourglass-split"></i>
              Analyzing...
            </>
          ) : (
            <>
              <i className="bi bi-robot"></i>
              AI Prediction
            </>
          )}
        </button>

        {priority && (
          <div className="prediction-result">
            <span className={`priority-tag priority-${priority}`}>
              {priority}
            </span>
            <span className="prediction-detail">
              {recommendedHours}h/day • {daysLeft} days left
            </span>
          </div>
        )}

        <button
          className="btn-add"
          onClick={onAddSubject}
          disabled={!subject || !examDate}
        >
          <i className="bi bi-plus-lg"></i>
          Add Subject
        </button>
      </div>
    </div>
  );
};

export default PlannerWorkspace;
