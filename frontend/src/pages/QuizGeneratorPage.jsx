import React, { useState, useEffect, useContext, useMemo, useRef } from 'react';
import QuizCard from '../components/QuizCard';
import { useSettings } from '../context/SettingsContext';
import { AuthContext } from '../context/AuthContext';
import toast from 'react-hot-toast';
import api from "../services/api";
import ConfirmationModal from '../components/ConfirmationModal';

const QuizGeneratorPage = () => {
  const { syllabusData } = useSettings();
  const { user } = useContext(AuthContext);
  const userId = user?.id || user?._id || "guest";
  const quizAbortRef = useRef(null);

  // LocalStorage keys
  const QUIZ_HISTORY_KEY = `gyaanmitra_quiz_history_${userId}`;
  const QUIZ_STATE_KEY = `gyaanmitra_quiz_state_${userId}`;

  // Source toggle
  const [sourceFilter, setSourceFilter] = useState('manual');
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [selectedChapters, setSelectedChapters] = useState([]);

  const [level, setLevel] = useState('medium');
  const [numQuestions, setNumQuestions] = useState(5);
  const [timePerQuestion, setTimePerQuestion] = useState('');

  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubjectsDropdownOpen, setIsSubjectsDropdownOpen] = useState(false);
  const [isChaptersDropdownOpen, setIsChaptersDropdownOpen] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [activeSubjectTab, setActiveSubjectTab] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Resume logic
  const [hasSavedState, setHasSavedState] = useState(false);

  // Memory-cached quiz history for the current user
  const quizHistory = useMemo(() => {
    try {
      const saved = localStorage.getItem(QUIZ_HISTORY_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  }, [userId, QUIZ_HISTORY_KEY, showResult]); // refresh history when a quiz is submitted/showResult changes

  // Filter the syllabus globally based on the toggle source
  const filteredSyllabus = syllabusData.filter(s => {
    if (sourceFilter === 'manual') {
      return !s.source || s.source === 'manual';
    }
    return s.source === 'pdf';
  });

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (userId === "guest") return;
    
    if (questions.length > 0 && !showResult) {
      const stateToSave = {
        questions,
        currentQuestion,
        selectedAnswers,
        timeRemaining
      };
      localStorage.setItem(QUIZ_STATE_KEY, JSON.stringify(stateToSave));
    } else if (showResult) {
      localStorage.removeItem(QUIZ_STATE_KEY);
    }
  }, [questions, currentQuestion, selectedAnswers, showResult, timeRemaining, userId, QUIZ_STATE_KEY]);


  // Timer logic
  useEffect(() => {
    let timerId;
    if (questions.length > 0 && !showResult && timeRemaining !== null && timeRemaining > 0) {
      timerId = setInterval(() => {
        setTimeRemaining(prev => prev - 1);
      }, 1000);
    } else if (timeRemaining === 0 && !showResult && questions.length > 0) {
      submit();
    }
    return () => clearInterval(timerId);
  }, [questions, showResult, timeRemaining]);

  // Check on mount
  useEffect(() => {
    const saved = localStorage.getItem(QUIZ_STATE_KEY);
    if (saved) {
      setHasSavedState(true);
    } else {
      setHasSavedState(false);
    }
  }, [userId, QUIZ_STATE_KEY]);

  const resumeQuiz = () => {
    const saved = localStorage.getItem(QUIZ_STATE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      setQuestions(parsed.questions);
      setCurrentQuestion(parsed.currentQuestion);
      setSelectedAnswers(parsed.selectedAnswers);
      setTimeRemaining(parsed.timeRemaining !== undefined ? parsed.timeRemaining : null);
      setHasSavedState(false);
      toast.success('Quiz resumed!');
    }
  };

  const clearSavedQuiz = () => {
    localStorage.removeItem(QUIZ_STATE_KEY);
    setHasSavedState(false);
  };

  const handleSourceChange = (newSource) => {
    setSourceFilter(newSource);
    setSelectedSubjects([]);
    setSelectedChapters([]);
  };

  const toggleSubject = (idx) => {
    setSelectedSubjects(prev => {
      let newS = prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx];
      if (newS.length > 0 && (!activeSubjectTab || !newS.includes(activeSubjectTab))) {
        setActiveSubjectTab(newS[0]);
      } else if (newS.length === 0) {
        setActiveSubjectTab(null);
      }
      return newS;
    });
    setSelectedChapters([]); // reset chapters on subject change
  };

  const toggleChapter = (chId) => {
    setSelectedChapters(prev =>
      prev.includes(chId) ? prev.filter(id => id !== chId) : [...prev, chId]
    );
  };

  const validChapters = [];
  selectedSubjects.forEach(idx => {
    const subject = filteredSyllabus[idx];
    if (subject?.chapters) {
      let displayIdx = 1;
      subject.chapters.forEach(ch => {
        if (ch.name && ch.name.trim() !== '' && ch.topics && ch.topics.trim() !== '') {
          validChapters.push({
            ...ch,
            displayNum: displayIdx++,
            compositeId: `${idx}-${ch.id}`,
            courseTitle: subject.courseTitle,
            subjectIdx: idx
          });
        }
      });
    }
  });

  const currentTabChapters = validChapters.filter(ch => ch.subjectIdx === activeSubjectTab).map(ch => ch.compositeId);
  const isAllSelectedInTab = currentTabChapters.length > 0 && currentTabChapters.every(id => selectedChapters.includes(id));

  const handleSelectAll = (global = true) => {
    if (global) {
      if (selectedChapters.length === validChapters.length && validChapters.length > 0) {
        setSelectedChapters([]);
      } else {
        setSelectedChapters(validChapters.map(ch => ch.compositeId));
      }
    } else {
      if (isAllSelectedInTab && currentTabChapters.length > 0) {
        setSelectedChapters(prev => prev.filter(id => !currentTabChapters.includes(id)));
      } else {
        const newSelection = new Set([...selectedChapters, ...currentTabChapters]);
        setSelectedChapters(Array.from(newSelection));
      }
    }
  };

  const generate = async () => {
    if (selectedSubjects.length === 0) {
      toast.error('Please select at least one subject from your Settings data.');
      return;
    }
    if (selectedChapters.length === 0) {
      toast.error('Please select at least one chapter.');
      return;
    }

    const currentChapters = validChapters.filter(ch => selectedChapters.includes(ch.compositeId));
    const finalCourseTitle = Array.from(new Set(currentChapters.map(ch => ch.courseTitle))).join(', ');
    const finalModules = currentChapters.map(ch => ch.name);
    const finalTopics = currentChapters.map(ch => ch.topics);
    
    // Build context strings so the AI knows EXACTLY how to source each chapter
    const chapterContexts = currentChapters.map(ch => `${ch.courseTitle} - CH ${ch.displayNum}`).join('\n');

    if (!finalCourseTitle || !finalModules || !finalTopics || !numQuestions) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsGenerating(true);
    const controller = new AbortController();
    quizAbortRef.current = controller;
    let tid = toast.loading('Generating AI Quiz...');
    try {
      const response = await api.post('/quiz/generate', {
        courseTitle: finalCourseTitle,
        moduleNames: finalModules,
        topics: finalTopics,
        difficulty: level,
        numQuestions,
        timeLimit: timePerQuestion ? parseInt(timePerQuestion) * numQuestions : undefined,
        chapterContexts
      }, { signal: controller.signal });

      const data = response.data;

      if (data.success && data.quiz) {
        // Build a label like "Mathematics - Ch 1, Ch 3" from selected chapters
        const chapterLabel = Array.from(new Set(currentChapters.map(ch => ch.courseTitle))).join(', ');

        const mappedQuestions = data.quiz.map(q => ({
          question: q.question,
          options: q.options,
          answer: q.correctAnswer || q.answer,
          explanation: q.explanation || "No explanation provided.",
          chapterSource: chapterLabel
        }));

        setQuestions(mappedQuestions);
        setSelectedAnswers({});
        setCurrentQuestion(0);
        setShowResult(false);
        setScore(null);
        setHasSavedState(false);
        setTimeRemaining(timePerQuestion ? parseInt(timePerQuestion) * numQuestions * 60 : null);
        localStorage.removeItem(QUIZ_STATE_KEY); // Clear old state
        toast.success('Quiz generated successfully!', { id: tid });
      } else {
        toast.error(data.message || 'Failed to generate quiz', { id: tid });
      }
    } catch (error) {
      if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
        toast.error('Quiz generation cancelled.', { id: tid });
      } else {
        console.error('Error:', error);
        toast.error('Error calling the AI service. Is the backend running and LM Studio active?', { id: tid });
      }
    } finally {
      setIsGenerating(false);
      quizAbortRef.current = null;
    }
  };

  const handleSelect = (opt) => {
    setSelectedAnswers({ ...selectedAnswers, [currentQuestion]: opt });
  };

  const nextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const prevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const submit = async () => {
    let correct = 0;
    questions.forEach((q, idx) => {
      const uAnswer = selectedAnswers[idx];
      // Normalize comparison
      if (uAnswer && q.answer && uAnswer.trim() === q.answer.trim()) {
        correct++;
      }
    });

    const subjectNames = questions[0]?.chapterSource || selectedSubjects.map(idx => filteredSyllabus[idx]?.courseTitle).filter(Boolean).join(', ') || 'Unknown Subject';

    // 1. Save to Backend (New)
    try {
      await api.post("/quiz/result", {
        courseTitle: subjectNames,
        score: correct,
        totalQuestions: questions.length,
        difficulty: level
      });
    } catch (err) {
      console.error("Failed to save quiz result to backend:", err);
      toast.error("Cloud sync failed, results saved locally.");
    }

    // 2. Local Backup (Existing logic)
    const historyItem = {
      date: new Date().toISOString(),
      score: correct,
      total: questions.length,
      subject: subjectNames,
      questions: questions,
      selectedAnswers: selectedAnswers
    };
    const pastHistory = JSON.parse(localStorage.getItem(QUIZ_HISTORY_KEY) || '[]');
    localStorage.setItem(QUIZ_HISTORY_KEY, JSON.stringify([historyItem, ...pastHistory]));

    setScore(correct);
    setShowResult(true);
    localStorage.removeItem(QUIZ_STATE_KEY); 
  };

  const cancelQuiz = () => {
    setShowCancelModal(true);
  };

  const confirmCancelQuiz = () => {
    restartQuiz();
    localStorage.removeItem(QUIZ_STATE_KEY);
    setShowCancelModal(false);
  };

  const restartQuiz = () => {
    setQuestions([]);
    setSelectedAnswers({});
    setCurrentQuestion(0);
    setScore(null);
    setShowResult(false);
    setHasSavedState(false);
    setTimeRemaining(null);
  };

  const minRequiredAnswers = Math.max(1, Math.ceil(questions.length * 0.1));
  const answeredCount = Object.keys(selectedAnswers).length;
  const canSubmit = answeredCount >= minRequiredAnswers;

  const formatTime = (seconds) => {
    if (seconds === null) return '';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="page-container">
      <div className="page-header mb-4">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h1 className="page-title">AI Quiz Generator</h1>
            <p className="page-subtitle">Test your knowledge with custom AI-generated quizzes</p>
          </div>
          <button className="btn btn-outline-primary fw-bold px-4 shadow-sm" onClick={() => setShowHistory(true)}>
            <i className="bi bi-clock-history me-2"></i> Quiz History
          </button>
        </div>
      </div>

      {showHistory && (
        <div className="modal-overlay" onClick={() => setShowHistory(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1060, padding: '1rem', animation: 'fadeIn 200ms ease-out' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--bg-primary, white)', borderRadius: '20px', boxShadow: '0 25px 50px rgba(0,0,0,0.15)', border: '1px solid rgba(0,0,0,0.08)', maxWidth: '800px', width: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', animation: 'slideUp 300ms cubic-bezier(0.4, 0, 0.2, 1)' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem 2rem', borderBottom: '1px solid rgba(0,0,0,0.05)', background: 'linear-gradient(135deg, rgba(121, 85, 72, 0.05) 0%, rgba(121, 85, 72, 0.02) 100%)', borderTopLeftRadius: '20px', borderTopRightRadius: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <i className="bi bi-clock-history text-primary"></i> Quiz History
              </h2>
              <button 
                onClick={() => setShowHistory(false)} 
                style={{ width: '32px', height: '32px', border: 'none', background: 'rgba(0,0,0,0.05)', borderRadius: '50%', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <i className="bi bi-x"></i>
              </button>
            </div>

            <div style={{ padding: '2rem', overflowY: 'auto' }}>
              {quizHistory.length === 0 ? (
                <div className="text-center p-5">
                  <i className="bi bi-inbox fs-1 text-muted d-block mb-3"></i>
                  <p className="text-muted">You haven't taken any quizzes yet!</p>
                </div>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {quizHistory.map((q, i) => {
                    const isSuccess = q.score >= q.total * 0.6;
                    const performanceColor = isSuccess ? '#10b981' : '#ef4444';
                    const performanceBg = isSuccess ? '#dcfce7' : '#fee2e2';

                    return (
                      <div key={i} className="animate-fade-in" style={{ 
                        background: 'white', 
                        borderRadius: '20px', 
                        padding: '1.25rem 1.5rem', 
                        border: '1px solid rgba(0,0,0,0.04)',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.01)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        cursor: 'pointer',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -2px rgba(0,0,0,0.02)';
                        e.currentTarget.style.borderColor = 'rgba(121, 85, 72, 0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.01)';
                        e.currentTarget.style.borderColor = 'rgba(0,0,0,0.04)';
                      }}
                      onClick={() => { setShowHistory(false); setSelectedReport(q); }}
                    >
                      {/* Left accent bar */}
                      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: performanceColor }}></div>
                      
                      <div style={{ flex: 1, paddingLeft: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8' }}>
                            <i className="bi bi-calendar3 me-1"></i> {new Date(q.date).toLocaleDateString()}
                          </span>
                        </div>
                        
                        <h4 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#1e293b', letterSpacing: '-0.3px' }}>{q.subject}</h4>
                        <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                          <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                             <i className="bi bi-clock me-1"></i> {new Date(q.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <button 
                            className="btn py-1 px-3" 
                            style={{ 
                              background: '#795548', 
                              color: 'white', 
                              fontSize: '0.75rem', 
                              fontWeight: 700, 
                              borderRadius: '20px', 
                              border: 'none',
                              boxShadow: '0 4px 10px rgba(121, 85, 72, 0.2)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                             View Report <i className="bi bi-arrow-right"></i>
                          </button>
                        </div>
                      </div>

                      <div style={{ 
                        background: '#f8fafc', padding: '12px 18px', borderRadius: '18px', border: '1.5px solid #f1f5f9',
                        minWidth: '100px', textAlign: 'center', transition: 'all 0.2s ease'
                      }}>
                        <div style={{ fontSize: '0.6rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>Score</div>
                        <div style={{ fontSize: '1.35rem', fontWeight: 900, color: performanceColor }}>
                          {q.score}<span style={{ fontSize: '0.9rem', color: '#cbd5e1', marginLeft: '2px' }}>/{q.total}</span>
                        </div>
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {selectedReport && (
        <div className="modal-overlay" onClick={() => setSelectedReport(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1060, padding: '1rem', animation: 'fadeIn 200ms ease-out' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--bg-primary, white)', borderRadius: '20px', boxShadow: '0 25px 50px rgba(0,0,0,0.15)', border: '1px solid rgba(0,0,0,0.08)', maxWidth: '850px', width: '100%', maxHeight: '82vh', display: 'flex', flexDirection: 'column', animation: 'slideUp 300ms cubic-bezier(0.4, 0, 0.2, 1)' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem 2rem', borderBottom: '1px solid rgba(0,0,0,0.05)', background: 'linear-gradient(135deg, rgba(121, 85, 72, 0.05) 0%, rgba(121, 85, 72, 0.02) 100%)', borderTopLeftRadius: '20px', borderTopRightRadius: '20px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <i className="bi bi-clipboard-data-fill text-primary" style={{ fontSize: '1.4rem' }}></i> 
                  Results Analysis
                </h2>
                <div style={{ margin: '4px 0 0 2.15rem', color: '#64748b', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.02rem' }}>
                  {selectedReport.subject} • {selectedReport.score}/{selectedReport.total} Correct ({Math.round((selectedReport.score / selectedReport.total) * 100)}%)
                </div>
              </div>
              <button 
                onClick={() => setSelectedReport(null)} 
                style={{ width: '32px', height: '32px', border: 'none', background: 'rgba(0,0,0,0.05)', borderRadius: '50%', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <i className="bi bi-x"></i>
              </button>
            </div>

            {/* Score summary bar */}
            <div style={{ padding: '1rem 2rem', background: 'var(--bg-secondary, #f8fafc)', borderBottom: '1px solid var(--border-color, rgba(0,0,0,0.05))', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e' }}></div>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Correct: {selectedReport.score}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }}></div>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Wrong: {Object.keys(selectedReport.selectedAnswers).length - selectedReport.score}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#94a3b8' }}></div>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Unanswered: {selectedReport.total - Object.keys(selectedReport.selectedAnswers).length}
                </span>
              </div>
              {/* Progress bar */}
              <div style={{ flex: 1, minWidth: '120px', display: 'flex', alignItems: 'center' }}>
                <div style={{ width: '100%', height: '8px', background: 'rgba(0,0,0,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${(selectedReport.score / selectedReport.total) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #22c55e, #16a34a)', borderRadius: '4px', transition: 'width 0.5s ease' }}></div>
                </div>
              </div>
            </div>

            {/* Body — scrollable with custom scrollbar */}
            <div style={{ padding: '2rem', overflowY: 'auto', flex: 1 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {selectedReport.questions.map((q, idx) => {
                  const userAnswer = selectedReport.selectedAnswers[idx];
                  const isCorrect = userAnswer === q.answer;
                  const isUnanswered = !userAnswer;

                  return (
                    <div key={idx} style={{
                      background: 'var(--bg-secondary, #f8fafc)',
                      borderRadius: 'var(--radius-lg, 12px)',
                      border: '1px solid var(--border-color, rgba(0,0,0,0.06))',
                      overflow: 'hidden'
                    }}>
                      {/* Question header strip */}
                      <div style={{
                        padding: '1rem 1.5rem',
                        background: isCorrect
                          ? 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(34,197,94,0.05))'
                          : isUnanswered
                            ? 'linear-gradient(135deg, rgba(148,163,184,0.1), rgba(148,163,184,0.05))'
                            : 'linear-gradient(135deg, rgba(239,68,68,0.1), rgba(239,68,68,0.05))',
                        borderBottom: `2px solid ${isCorrect ? '#22c55e' : isUnanswered ? '#94a3b8' : '#ef4444'}`,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{
                            width: '32px', height: '32px', borderRadius: '50%',
                            background: isCorrect ? '#22c55e' : isUnanswered ? '#94a3b8' : '#ef4444',
                            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 800, fontSize: '0.85rem'
                          }}>
                            {idx + 1}
                          </span>
                          <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                            Question {idx + 1} of {selectedReport.total}
                          </span>
                        </div>
                        <span style={{
                          padding: '0.35rem 0.85rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700,
                          background: isCorrect ? 'rgba(34,197,94,0.15)' : isUnanswered ? 'rgba(148,163,184,0.15)' : 'rgba(239,68,68,0.15)',
                          color: isCorrect ? '#16a34a' : isUnanswered ? '#64748b' : '#dc2626'
                        }}>
                          {isCorrect ? '✓ Correct' : isUnanswered ? '— Skipped' : '✗ Incorrect'}
                        </span>
                      </div>

                      <div style={{ padding: '1.5rem' }}>
                        {/* Chapter source badge */}
                        {q.chapterSource && (
                          <div style={{ marginBottom: '0.75rem' }}>
                            <span style={{ padding: '0.25rem 0.65rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, background: 'rgba(79,70,229,0.1)', color: 'var(--primary, #795548)' }}>
                              <i className="bi bi-bookmark-fill me-1"></i>{q.chapterSource}
                            </span>
                          </div>
                        )}

                        {/* Question text */}
                        <h5 style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '1.05rem', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                          {q.question}
                        </h5>

                        {/* Options grid */}
                        <div className="row g-2" style={{ marginBottom: '1.25rem' }}>
                          {q.options.map((opt, oIdx) => {
                            let optBg = 'white';
                            let optBorder = '1px solid rgba(0,0,0,0.08)';
                            let optIcon = null;

                            if (opt === q.answer) {
                              optBg = 'rgba(34, 197, 94, 0.08)';
                              optBorder = '2px solid #22c55e';
                              optIcon = (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                                  {opt === userAnswer && <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, background: '#22c55e', color: 'white' }}>You Chose</span>}
                                  <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, background: '#dcfce7', color: '#16a34a' }}>
                                    Correct <i className="bi bi-check-circle-fill ms-1"></i>
                                  </span>
                                </div>
                              );
                            } else if (opt === userAnswer && !isCorrect) {
                              optBg = 'rgba(239, 68, 68, 0.08)';
                              optBorder = '2px solid #ef4444';
                              optIcon = (
                                <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, background: '#fef2f2', color: '#dc2626' }}>
                                  Your Answer <i className="bi bi-x-circle-fill ms-1"></i>
                                </span>
                              );
                            }

                            return (
                              <div key={oIdx} className="col-md-6">
                                <div style={{
                                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                  padding: '0.75rem 1rem', borderRadius: 'var(--radius-lg, 10px)',
                                  background: optBg, border: optBorder, minHeight: '48px'
                                }}>
                                  <span style={{
                                    fontSize: '0.9rem', color: 'var(--text-primary)',
                                    fontWeight: opt === q.answer || opt === userAnswer ? 700 : 500
                                  }}>
                                    <span style={{ color: 'var(--text-secondary)', marginRight: '0.5rem', fontWeight: 600 }}>{String.fromCharCode(65 + oIdx)}.</span>
                                    {opt}
                                  </span>
                                  {optIcon}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Explanation */}
                        <div style={{
                          padding: '1rem 1.25rem', borderRadius: 'var(--radius-lg, 10px)',
                          background: 'linear-gradient(135deg, rgba(79,70,229,0.05), rgba(124,58,237,0.03))',
                          border: '1px solid rgba(79,70,229,0.12)'
                        }}>
                          <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <i className="bi bi-lightbulb-fill" style={{ color: 'var(--primary, #795548)', marginTop: '2px', fontSize: '1.1rem' }}></i>
                            <div>
                              <p style={{ margin: '0 0 0.25rem 0', fontWeight: 700, color: 'var(--primary, #795548)', fontSize: '0.85rem' }}>Explanation</p>
                              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.6 }}>
                                {q.explanation}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      )}

      {hasSavedState && !questions.length && !showResult && (
        <div className="alert alert-info d-flex align-items-center justify-content-between mb-4 shadow-sm" style={{ border: '2px solid var(--primary)', borderRadius: '12px' }}>
          <div className="d-flex align-items-center">
            <i className="bi bi-clock-history fs-3 text-primary me-3"></i>
            <div>
              <h5 className="mb-1 text-dark fw-bold">Resume Previous Quiz?</h5>
              <p className="mb-0 text-muted">You have an unfinished quiz in progress.</p>
            </div>
          </div>
          <div>
            <button className="btn btn-outline-danger me-2 shadow-sm" onClick={clearSavedQuiz}>Discard</button>
            <button className="btn btn-primary px-4 shadow-sm" style={{ color: 'white', background: '#795548', border: 'none' }} onClick={resumeQuiz}>Resume Quiz</button>
          </div>
        </div>
      )}

      {!questions.length ? (
        /* Quiz Generator Form */
        <div className="row">
          <div className="col-lg-6">
            <div className="card" style={{ padding: '2rem' }}>

              <div className="d-flex justify-content-between align-items-center mb-4">
                <h5 style={{ color: 'var(--text-primary)', margin: 0 }}>
                  <i className="bi bi-gear me-2" style={{ color: 'var(--primary-light)' }}></i>
                  Configure Your Quiz
                </h5>
                <div className="btn-group" role="group">
                  <input type="radio" className="btn-check" name="btnradiosource" id="source1" checked={sourceFilter === 'manual'} onChange={() => handleSourceChange('manual')} />
                  <label className="btn btn-outline-primary btn-sm px-3" htmlFor="source1">Manual</label>

                  <input type="radio" className="btn-check" name="btnradiosource" id="source2" checked={sourceFilter === 'pdf'} onChange={() => handleSourceChange('pdf')} />
                  <label className="btn btn-outline-primary btn-sm px-3" htmlFor="source2">PDF</label>
                </div>
              </div>

              <div className="mb-4">
                {filteredSyllabus.length === 0 ? (
                  <div className="alert alert-warning small">
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    No {sourceFilter === 'manual' ? "manually added" : "PDF extracted"} syllabus data found. Please go to Settings to add syllabus data.
                  </div>
                ) : (
                  <>
                    <label className="form-label fw-bold mb-3" style={{ color: 'var(--text-secondary)' }}>Select Subjects *</label>
                    <div className="p-3 rounded mb-4" style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.05)' }}>
                      <div
                        className="d-flex justify-content-between align-items-center cursor-pointer mb-2"
                        onClick={() => setIsSubjectsDropdownOpen(!isSubjectsDropdownOpen)}
                      >
                        <label className="form-label fw-bold mb-0" style={{ color: 'var(--text-primary)', cursor: 'pointer' }}>
                          {selectedSubjects.length === 0 ? 'Choose Subjects' : `${selectedSubjects.length} Subject(s) Selected`}
                        </label>
                        <i className={`bi bi-chevron-${isSubjectsDropdownOpen ? 'up' : 'down'} fs-5`} style={{ color: 'var(--text-secondary)' }}></i>
                      </div>

                      {isSubjectsDropdownOpen && (
                        <div className="d-flex flex-column gap-2 mt-3" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                          {filteredSyllabus.map((sub, idx) => (
                            <label key={idx} className="d-flex align-items-center p-2 rounded cursor-pointer border" style={{ background: 'var(--bg-primary)', borderColor: 'rgba(0,0,0,0.1)' }}>
                              <input
                                type="checkbox"
                                className="form-check-input me-3"
                                checked={selectedSubjects.includes(idx)}
                                onChange={() => toggleSubject(idx)}
                                style={{ transform: 'scale(1.2)' }}
                              />
                              <div className="fw-bold" style={{ color: 'var(--text-primary)' }}>{sub.courseTitle}</div>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    {selectedSubjects.length > 0 && validChapters.length > 0 && (
                      <div className="p-3 rounded mb-4" style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.05)' }}>
                        <div
                          className="d-flex justify-content-between align-items-center cursor-pointer mb-2"
                          onClick={() => setIsChaptersDropdownOpen(!isChaptersDropdownOpen)}
                          style={{ cursor: 'pointer' }}
                        >
                          <label className="form-label fw-bold mb-0" style={{ color: 'var(--text-primary)', cursor: 'pointer' }}>Select Chapters for Quiz *</label>
                          <i className={`bi bi-chevron-${isChaptersDropdownOpen ? 'up' : 'down'} fs-5`} style={{ color: 'var(--text-secondary)' }}></i>
                        </div>

                        {isChaptersDropdownOpen && (
                          <>
                            {selectedSubjects.length > 1 && (
                              <div className="d-flex gap-2 mb-3 px-1 pb-2 border-bottom overflow-auto custom-scrollbar">
                                {selectedSubjects.map(idx => (
                                  <button
                                    key={idx}
                                    type="button"
                                    className={`btn btn-sm ${activeSubjectTab === idx ? 'btn-primary' : 'btn-outline-secondary'}`}
                                    style={{ whiteSpace: 'nowrap' }}
                                    onClick={() => setActiveSubjectTab(idx)}
                                  >
                                    {filteredSyllabus[idx]?.courseTitle}
                                  </button>
                                ))}
                              </div>
                            )}

                            <div className="d-flex justify-content-between align-items-center mb-2">
                              <span className="small text-muted fw-bold">
                                {selectedSubjects.length > 1 ? `${filteredSyllabus[activeSubjectTab]?.courseTitle || 'Course'} Chapters:` : 'Chapters:'}
                              </span>
                              <div className="d-flex gap-2">
                                {selectedSubjects.length > 1 && (
                                  <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => handleSelectAll(false)}>
                                    {isAllSelectedInTab ? 'Deselect Tab' : 'Select Tab'}
                                  </button>
                                )}
                                <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => handleSelectAll(true)}>
                                  {selectedChapters.length === validChapters.length && validChapters.length > 0 ? 'Deselect All' : 'Select All'}
                                </button>
                              </div>
                            </div>

                            <div className="d-flex flex-column gap-2" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                              {validChapters
                                .filter(ch => selectedSubjects.length > 1 ? ch.subjectIdx === activeSubjectTab : true)
                                .map(ch => (
                                  <label key={ch.compositeId} className="d-flex align-items-center p-2 rounded cursor-pointer border" style={{ background: 'var(--bg-primary)', borderColor: 'rgba(0,0,0,0.1)' }}>
                                    <input
                                      type="checkbox"
                                      className="form-check-input me-3"
                                      checked={selectedChapters.includes(ch.compositeId)}
                                      onChange={() => toggleChapter(ch.compositeId)}
                                      style={{ transform: 'scale(1.2)' }}
                                    />
                                    <div>
                                      <div className="fw-bold fs-6" style={{ color: 'var(--text-primary)' }}>Chpt {ch.displayNum}: {ch.name}</div>
                                      <div className="small text-truncate" style={{ maxWidth: '300px', color: 'var(--text-secondary)' }}>
                                        {ch.topics}
                                      </div>
                                    </div>
                                  </label>
                                ))}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="row mb-4 g-3">
                <div className="col-md-6">
                  <label className="form-label fw-bold" style={{ color: 'var(--text-secondary)' }}>Number of Questions *</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    className="form-control"
                    value={numQuestions}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (val > 20) {
                        toast.error('Only 20 questions max can be generated', { icon: '⚠️' });
                        setNumQuestions(20);
                      } else {
                        setNumQuestions(e.target.value);
                      }
                    }}
                    style={{ background: 'var(--bg-primary)', border: '1px solid rgba(0,0,0,0.1)', padding: '0.875rem 1rem', borderRadius: 'var(--radius-lg)' }}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-bold" style={{ color: 'var(--text-secondary)' }}>Time Limit <small className="text-muted fw-normal">(Optional)</small></label>
                  <select
                    className="form-select"
                    value={timePerQuestion}
                    onChange={(e) => setTimePerQuestion(e.target.value)}
                    style={{ background: 'var(--bg-primary)', border: '1px solid rgba(0,0,0,0.1)', padding: '0.875rem 1rem', borderRadius: 'var(--radius-lg)' }}
                  >
                    <option value="">No Timer</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(m => (
                      <option key={m} value={m}>{m} {m === 1 ? 'Minute' : 'Minutes'} per question</option>
                    ))}
                  </select>
                  {timePerQuestion && numQuestions && (
                    <div className="mt-1 fw-bold" style={{ color: '#795548', fontSize: '0.72rem' }}>
                      Total Quiz Time: {numQuestions} Questions × {timePerQuestion} {parseInt(timePerQuestion) === 1 ? 'Minute' : 'Minutes'} = {numQuestions * timePerQuestion} Minutes
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-4">
                <label className="form-label fw-bold" style={{ color: 'var(--text-secondary)' }}>Difficulty Level <small className="text-muted fw-normal">(Will determine question types)</small></label>
                <div className="d-flex gap-3">
                  {['easy', 'medium', 'hard'].map((l) => (
                    <button
                      key={l}
                      className={`btn flex-fill py-3 shadow-sm`}
                      onClick={() => setLevel(l)}
                      style={{
                        background: level === l ? '#795548' : 'var(--bg-primary)',
                        color: level === l ? 'white' : 'var(--text-primary)',
                        border: level === l ? 'none' : '1px solid rgba(0,0,0,0.1)',
                        textTransform: 'capitalize',
                        fontWeight: level === l ? '600' : '500'
                      }}
                    >
                      <i className={`bi ${l === 'easy' ? 'bi-emoji-smile' : l === 'medium' ? 'bi-emoji-neutral' : 'bi-emoji-frown'} me-2`}></i>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <div className="d-flex gap-2 mt-3">
                {isGenerating && (
                  <button
                    className="btn py-3 px-4 shadow-sm"
                    onClick={() => {
                      if (quizAbortRef.current) {
                        quizAbortRef.current.abort();
                        quizAbortRef.current = null;
                      }
                    }}
                    style={{
                      background: '#dc2626',
                      color: 'white',
                      border: 'none',
                      fontWeight: 'bold',
                      fontSize: '1.1rem',
                      borderRadius: '0.75rem',
                      minWidth: '120px'
                    }}
                  >
                    <i className="bi bi-x-circle me-2"></i>Cancel
                  </button>
                )}
                <button
                  className="btn flex-fill py-3 shadow-sm"
                  onClick={generate}
                  disabled={isGenerating || filteredSyllabus.length === 0}
                  style={{
                    background: '#795548',
                    color: 'white',
                    border: 'none',
                    fontWeight: 'bold',
                    fontSize: '1.1rem'
                  }}
                >
                  {isGenerating ? (
                    <><span className="spinner-border spinner-border-sm me-2" role="status"></span>Generating AI Quiz...</>
                  ) : (
                    <><i className="bi bi-lightning-charge-fill me-2"></i>Generate AI Quiz</>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="col-lg-6">
            <div className="card" style={{ padding: '2rem', height: '100%' }}>
              <h5 className="mb-4" style={{ color: 'var(--text-primary)' }}>
                <i className="bi bi-info-circle me-2" style={{ color: 'var(--primary-light)' }}></i>
                How It Works
              </h5>

              {[
                { icon: 'bi-1-circle', title: 'Data Entry Modes', desc: 'Use "Manual" or "PDF" toggle to fetch courses you added in the global Settings page.' },
                { icon: 'bi-2-circle', title: 'Chapter Selection & Submitting', desc: `Select specific chapters from the syllabus to get tested on! You must answer at least 10% of generated questions to submit.` },
                { icon: 'bi-3-circle', title: 'State Persistence', desc: 'If you accidentally refresh or lose connection, your current quiz progress is automatically saved locally to resume anytime.' },
                { icon: 'bi-4-circle', title: 'Detailed Results', desc: 'After submission, explore an exhaustive list of all questions with your answers, correct answers, and AI reasoning.' }
              ].map((step, idx) => (
                <div key={idx} className="d-flex align-items-start mb-4">
                  <div
                    className="d-flex align-items-center justify-content-center me-3 shadow-sm"
                    style={{
                      width: '40px',
                      height: '40px',
                      background: 'rgba(121, 85, 72, 0.1)',
                      color: '#795548',
                      borderRadius: 'var(--radius-lg)',
                      flexShrink: 0
                    }}
                  >
                    <i className={`bi ${step.icon} fs-4`}></i>
                  </div>
                  <div>
                    <h6 className="mb-0 fw-bold" style={{ color: 'var(--text-primary)' }}>{step.title}</h6>
                    <small style={{ color: 'var(--text-secondary)' }}>{step.desc}</small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : showResult ? (
        /* Detailed Results View */
        <div className="animate-fade-in">
          <div
            className="card mx-auto mb-5 text-center shadow-lg border-0"
            style={{
              padding: '2.5rem 1.5rem',
              maxWidth: '480px',
              background: 'white',
              borderRadius: '24px',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div 
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '8px',
                background: score >= questions.length * 0.6 ? 'var(--gradient-success)' : 'var(--gradient-warning)'
              }}
            />
            
            <div
              className="d-inline-flex align-items-center justify-content-center mx-auto mb-3 shadow-sm"
              style={{ 
                width: '70px', 
                height: '70px', 
                background: score >= questions.length * 0.6 ? 'var(--success)' : 'var(--warning)', 
                borderRadius: '50%' 
              }}
            >
              <i className={`bi ${score >= questions.length * 0.6 ? 'bi-trophy-fill' : 'bi-emoji-smile-fill'} text-white fs-2`}></i>
            </div>
            
            <h3 className="fw-bolder mb-2" style={{ color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
              Quiz Complete!
            </h3>
            
            <div className="d-flex justify-content-center align-items-baseline mb-2 gap-2">
              <span style={{ fontSize: '3rem', fontWeight: '900', color: score >= questions.length * 0.6 ? 'var(--success)' : 'var(--warning)', lineHeight: 1 }}>
                {score}
              </span>
              <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>
                / {questions.length}
              </span>
            </div>
            
            <p className="mb-4" style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              {score >= questions.length * 0.6 
                ? 'Outstanding work!' 
                : 'Keep practicing to master these topics!'}
            </p>
            
            <div className="d-flex justify-content-center gap-3 flex-wrap mt-2">
              <button 
                className="btn py-2 px-4 shadow-sm fw-bold d-flex align-items-center" 
                style={{ background: 'var(--success)', color: 'white', border: 'none', borderRadius: '12px' }}
                onClick={() => setSelectedReport({ questions, selectedAnswers, score, total: questions.length, subject: selectedSubjects.map(idx => filteredSyllabus[idx]?.courseTitle).join(', ') || 'Mixed Subjects' })}
              >
                <i className="bi bi-file-earmark-text me-2"></i> View Detailed Report
              </button>
              <button 
                className="btn py-2 px-4 shadow-sm fw-bold d-flex align-items-center" 
                onClick={restartQuiz} 
                style={{ background: '#795548', color: 'white', border: 'none', borderRadius: '12px' }}
              >
                <i className="bi bi-arrow-repeat me-2"></i> Retake This Quiz
              </button>
              <button 
                className="btn py-2 px-4 fw-bold shadow-sm d-flex align-items-center" 
                onClick={() => { 
                  setQuestions([]); 
                  setShowResult(false); 
                  setSelectedSubjects([]); 
                  setActiveSubjectTab(0); 
                  setSelectedChapters([]); 
                  setNumQuestions(10); 
                  setTimePerQuestion(''); 
                  setLevel('Medium'); 
                  setShowChapterSelection(false);
                  setSourceFilter('');
                  localStorage.removeItem('gyaanmitra_quiz_state');
                }}
                style={{ border: '2px solid rgba(0,0,0,0.1)', background: 'transparent', color: 'var(--text-primary)', borderRadius: '12px' }}
              >
                <i className="bi bi-plus-lg me-2"></i> New AI Quiz
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Quiz Questions Active */
        <>
          <div className="mb-4">
            <div className="d-flex justify-content-between mb-2">
              <span className="fw-bold" style={{ color: 'var(--text-secondary)' }}>Question {currentQuestion + 1} of {questions.length}</span>
              <div className="d-flex align-items-center gap-4">
                {timeRemaining !== null && (
                  <span className={`fw-bold ${timeRemaining <= 60 ? 'text-danger' : 'text-primary'}`}>
                    <i className="bi bi-stopwatch me-1"></i> {formatTime(timeRemaining)}
                  </span>
                )}
                <span style={{ color: canSubmit ? 'var(--success)' : 'var(--warning)', fontWeight: 'bold' }}>
                  <i className={`bi ${canSubmit ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'} me-2`}></i>
                  {answeredCount} / {questions.length} answered {canSubmit ? '(Ready to Submit!)' : `(Min ${minRequiredAnswers} required)`}
                </span>
              </div>
            </div>
            <div className="progress shadow-sm" style={{ height: '12px', borderRadius: '10px', background: 'rgba(121, 85, 72, 0.1)' }}>
              <div
                className="progress-bar rounded-pill"
                style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%`, background: '#795548' }}
              ></div>
            </div>
          </div>
          <div className="mb-3 text-center">
             {questions[currentQuestion].chapterSource && (
                <span className="badge bg-secondary px-3 py-2 fw-bold text-white shadow-sm" style={{ letterSpacing: '0.5px' }}>
                  <i className="bi bi-bookmark-fill me-2 text-warning"></i> {questions[currentQuestion].chapterSource}
                </span>
             )}
          </div>

          <QuizCard
            question={questions[currentQuestion].question}
            options={questions[currentQuestion].options}
            selectedOption={selectedAnswers[currentQuestion]}
            onSelect={handleSelect}
            showResult={false}
            correctAnswer={questions[currentQuestion].answer}
            questionIndex={currentQuestion + 1}
          />

          <div className="d-flex justify-content-between align-items-center mt-5">
            <button className="btn btn-outline-danger shadow-sm px-4 fw-bold" onClick={cancelQuiz}>
              <i className="bi bi-x-circle me-2"></i> Cancel Quiz
            </button>

            <div className="d-flex gap-2">
              <button
                className="btn btn-outline-warning py-2 px-4 shadow-sm"
                onClick={() => {
                  const curr = { ...selectedAnswers };
                  delete curr[currentQuestion];
                  setSelectedAnswers(curr);
                }}
                disabled={!selectedAnswers[currentQuestion]}
                style={{ fontWeight: 'bold' }}
              >
                <i className="bi bi-eraser-fill me-2"></i> Clear Selection
              </button>

              <button
                className="btn py-2 px-4 shadow-sm text-white"
                onClick={prevQuestion}
                disabled={currentQuestion === 0}
                style={{ background: '#795548', border: 'none', opacity: currentQuestion === 0 ? 0.3 : 1, fontWeight: 'bold' }}
              >
                <i className="bi bi-arrow-left me-2"></i> Prev
              </button>

              {currentQuestion === questions.length - 1 ? (
                <button
                  className="btn py-2 px-5 text-white shadow"
                  onClick={submit}
                  disabled={!canSubmit}
                  style={{
                    background: canSubmit ? 'var(--success)' : 'var(--warning)',
                    color: canSubmit ? 'white' : '#000',
                    border: 'none',
                    fontWeight: 'bold',
                    opacity: !canSubmit ? 0.6 : 1
                  }}
                  title={!canSubmit ? `Answer at least ${minRequiredAnswers} module questions` : "Submit your Quiz"}
                >
                  <i className="bi bi-check2-all me-2"></i> Submit {canSubmit && 'Quiz'}
                </button>
              ) : (
                <button
                  className="btn py-2 px-4 shadow-sm text-white"
                  onClick={nextQuestion}
                  style={{ background: '#795548', border: 'none', fontWeight: 'bold' }}
                >
                  Next <i className="bi bi-arrow-right ms-2"></i>
                </button>
              )}
            </div>
          </div>
        </>
      )}

      <ConfirmationModal
        show={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={confirmCancelQuiz}
        title="Cancel Quiz?"
        message="Are you sure you want to cancel? All your progress will be lost and cannot be recovered."
        confirmText="Yes, Cancel"
        cancelText="Continue Quiz"
        type="danger"
      />
    </div>
  );
};

export default QuizGeneratorPage;
