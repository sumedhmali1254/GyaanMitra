import React from "react";

const SubjectCard = ({ subject, onRemove }) => {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getPriorityClass = (priority) => `priority-badge priority-${priority}`;

  return (
    <div className="subject-card">
      {/* Card Header with Title and Close Button */}
      <div className="subject-header">
        <h5 className="subject-title">{subject.subject}</h5>
        <button
          className="btn-close"
          onClick={onRemove}
          title="Remove subject"
          aria-label="Remove subject"
        >
          <i className="bi bi-x-lg"></i>
        </button>
      </div>

      {/* Subject Details */}
      <div className="subject-details">
        {/* Exam Date */}
        <div className="detail-row">
          <i className="bi bi-calendar-event icon-primary"></i>
          <div>
            <span>{formatDate(subject.examDate)}</span>
            <span className="meta-text"> • {subject.daysLeft} days</span>
          </div>
        </div>

        {/* Chapters */}
        <div className="detail-row">
          <i className="bi bi-book-half icon-primary"></i>
          <span>{subject.chapters} chapters</span>
        </div>

        {/* Priority Badge */}
        <div className="subject-priority-wrapper">
          <div className={getPriorityClass(subject.priority)}>
            {subject.priority.toUpperCase()}
          </div>
        </div>

        {/* Additional Info Based on Mode */}
        <div className="subject-meta">
          {subject.beginnerMode ? (
            <>
              <div className="meta-row">
                <strong>Familiarity:</strong>
                <span>
                  {subject.familiarity.charAt(0).toUpperCase() +
                    subject.familiarity.slice(1)}
                </span>
              </div>
              <div className="meta-row">
                <strong>Syllabus:</strong>
                <span>
                  {subject.syllabusSize.charAt(0).toUpperCase() +
                    subject.syllabusSize.slice(1)}
                </span>
              </div>
            </>
          ) : (
            <div className="meta-grid">
              <div>
                <strong>Difficulty:</strong> {subject.difficulty}/10
              </div>
              <div>
                <strong>Past Score:</strong> {subject.pastScore}%
              </div>
              <div className="meta-row">
                <strong>Completion:</strong> {subject.completion}%
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubjectCard;
