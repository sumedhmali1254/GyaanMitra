import React from 'react';

const QuizCard = ({ question, options, onSelect, selectedOption, showResult, correctAnswer, questionIndex }) => {
  const getOptionStyle = (opt) => {
    if (!showResult) {
      return selectedOption === opt 
        ? { background: 'var(--gradient-primary)', borderColor: 'var(--primary)', color: 'white' }
        : { background: 'var(--bg-secondary)', borderColor: 'rgba(255,255,255,0.1)', color: 'var(--text-primary)' };
    }
    
    if (opt === correctAnswer) {
      return { background: 'rgba(34, 197, 94, 0.2)', borderColor: 'var(--success)', color: 'var(--success)' };
    }
    
    if (opt === selectedOption && opt !== correctAnswer) {
      return { background: 'rgba(239, 68, 68, 0.2)', borderColor: 'var(--danger)', color: 'var(--danger)' };
    }
    
    return { background: 'var(--bg-secondary)', borderColor: 'rgba(255,255,255,0.1)', color: 'var(--text-muted)' };
  };

  return (
    <div className="card mb-4" style={{ padding: '1.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
      <div className="d-flex align-items-start gap-3 mb-4">
        <div 
          className="d-flex align-items-center justify-content-center flex-shrink-0"
          style={{ 
            width: '40px', 
            height: '40px', 
            background: 'var(--gradient-primary)',
            borderRadius: 'var(--radius-lg)'
          }}
        >
          <span className="text-white fw-bold fs-5">{questionIndex}</span>
        </div>
        <p className="mb-0" style={{ color: 'var(--text-primary)', fontSize: '1.125rem', fontWeight: '500' }}>
          {question}
        </p>
      </div>
      
      <div className="d-grid shadow-sm" style={{ border: '1px solid rgba(0,0,0,0.05)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        {options.map((opt, idx) => (
          <button
            key={idx}
            className="btn p-3 px-4 text-start"
            onClick={() => !showResult && onSelect(opt)}
            disabled={showResult}
            style={{
              ...getOptionStyle(opt),
              border: 'none',
              borderBottom: idx === options.length - 1 ? 'none' : '1px solid rgba(0,0,0,0.05)',
              borderRadius: '0',
              transition: 'all 0.2s ease',
              fontSize: '1rem',
              minHeight: '65px'
            }}
          >
            <div className="d-flex align-items-center">
              <span 
                className="d-flex align-items-center justify-content-center me-3"
                style={{ 
                  width: '28px', 
                  height: '28px', 
                  background: selectedOption === opt || (showResult && opt === correctAnswer) 
                    ? 'rgba(255,255,255,0.2)' 
                    : 'rgba(255,255,255,0.1)',
                  borderRadius: '50%',
                  fontSize: '0.875rem',
                  fontWeight: '600'
                }}
              >
                {String.fromCharCode(65 + idx)}
              </span>
              <span>{opt}</span>
              {showResult && opt === correctAnswer && (
                <i className="bi bi-check-circle-fill ms-auto" style={{ color: 'var(--success)' }}></i>
              )}
              {showResult && selectedOption === opt && opt !== correctAnswer && (
                <i className="bi bi-x-circle-fill ms-auto" style={{ color: 'var(--danger)' }}></i>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuizCard;

