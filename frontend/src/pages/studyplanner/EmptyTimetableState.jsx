import React from "react";

const EmptyTimetableState = ({ onRegenerate }) => {
  return (
    <div className="empty-timetable">
      <div className="empty-icon">
        <i className="bi bi-calendar-week"></i>
      </div>
      <div className="empty-title">No Timetable Yet</div>
      <div className="empty-subtitle">
        Add subjects to your plan and click "Generate Plan" to create your
        personalized weekly timetable.
      </div>
      <button className="btn btn-primary" onClick={onRegenerate}>
        <i className="bi bi-magic"></i> Generate Timetable
      </button>
    </div>
  );
};

export default EmptyTimetableState;
