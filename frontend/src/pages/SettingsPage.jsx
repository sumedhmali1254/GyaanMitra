import React, { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { useSettings } from "../context/SettingsContext";
import { useNotifications } from "../context/NotificationContext";
import toast from "react-hot-toast";
import ConfirmationModal from "../components/ConfirmationModal";
import api from "../services/api";
import ProfilePage from "./ProfilePage";

const SettingsSection = ({ title, description, children }) => (
  <div className="settings-section mb-4 p-4 p-md-4 bg-white border rounded-4 shadow-sm" style={{ border: '1px solid #e2e8f0 !important' }}>
    <h5 className="fw-bold mb-2" style={{ color: 'var(--text-primary)', fontSize: '1.25rem' }}>{title}</h5>
    {description && (
      <p
        style={{
          color: "#64748b",
          fontSize: "0.95rem",
          marginBottom: "2rem",
          maxWidth: '800px'
        }}
      >
        {description}
      </p>
    )}
    <div className="settings-section-content">
      {children}
    </div>
  </div>
);

const SettingsPage = () => {
  const { theme, changeTheme } = useTheme();
  const { addNotification, removeNotification } = useNotifications();
  const {
    activeTab,
    setActiveTab,
    syllabusData,
    addSyllabusData,
    updateSyllabusData,
    removeSyllabusData,
    clearSyllabusData,
    flashcardsPerChapter,
    setFlashcardsPerChapter,
    preferredFlashcardSource,
    setPreferredFlashcardSource,
    notificationPrefs,
    updateNotificationPrefs,
    isExtracting,
    extractPDF,
    cancelExtraction,
    isBulkGenerating,
    bulkGenerateFlashcards,
    cancelBulkGenerate
  } = useSettings();

  const [modalConfig, setModalConfig] = useState({
    show: false,
    title: "",
    message: "",
    onConfirm: () => { },
    type: "primary",
    confirmText: "Confirm"
  });

  const openModal = (config) => setModalConfig({ ...config, show: true });
  const closeModal = () => setModalConfig({ ...modalConfig, show: false });

  const [profile, setProfile] = useState({
    name: "Student User",
    email: "student@example.com",
    phone: "+1 (555) 000-0000",
    language: "English",
  });

  const location = useLocation();
  const [localSource, setLocalSource] = useState(preferredFlashcardSource);
  const [manageTab, setManageTab] = useState('pdf');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam && setActiveTab) {
      setActiveTab(tabParam);
    }
  }, [location, setActiveTab]);

  useEffect(() => {
    setLocalSource(preferredFlashcardSource);
  }, [preferredFlashcardSource]);

  const handleSaveFlashcardSource = () => {
    setPreferredFlashcardSource(localSource);
    toast.success(`Source preference saved as ${localSource.toUpperCase()}!`);
  };


  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfile({ ...profile, [name]: value });
  };

  const handleNotificationChange = (e) => {
    const { name, checked } = e.target;
    updateNotificationPrefs({ [name]: checked });
  };


  const handleSaveProfile = () => {
    toast.success("Profile settings saved successfully!");
  };

  // ----- PDF Upload State -----
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleExtractPDF = async () => {
    addNotification({
      id: "pdf-extract-buffer",
      type: "loading",
      title: "Extracting Syllabus",
      message: `Reading and extracting chapters from your PDF. This may take a minute...`,
    });

    const success = await extractPDF(selectedFile);

    removeNotification("pdf-extract-buffer");

    if (success) {
      addNotification({
        type: "success",
        title: "Syllabus Extracted",
        message: "Your PDF syllabus has been successfully extracted and saved!",
        icon: "bi-check-circle-fill"
      });
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } else {
      addNotification({
        type: "error",
        title: "Extraction Failed",
        message: "Could not extract syllabus from the PDF. Please try again.",
        icon: "bi-exclamation-octagon"
      });
    }
  };


  // ----- Manual Entry State -----
  const [manualCourseParams, setManualCourseParams] = useState({ courseTitle: "", numChapters: 1 });
  const [manualChapters, setManualChapters] = useState([{ name: "", topics: "", id: `ch_${Math.random().toString(36).substr(2, 9)}` }]);
  const [editingCourseIndex, setEditingCourseIndex] = useState(null);
  const [lastDeletedChapter, setLastDeletedChapter] = useState(null);

  const generateUniqueId = () => `ch_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;

  const handleAdjustChapters = (delta) => {
    const currentCount = manualChapters.length;
    const targetCount = Math.max(1, Math.min(50, currentCount + delta));

    if (targetCount === currentCount) return;

    setManualCourseParams(prev => ({ ...prev, numChapters: targetCount }));

    setManualChapters(prev => {
      if (targetCount > prev.length) {
        // Sequentially ADD
        const diff = targetCount - prev.length;
        const newChapters = Array.from({ length: diff }, () => ({
          name: "",
          topics: "",
          id: generateUniqueId()
        }));
        return [...prev, ...newChapters];
      } else if (targetCount < prev.length) {
        // Save to buffer before removing
        const deleted = prev[prev.length - 1];
        setLastDeletedChapter(deleted);
        return prev.slice(0, targetCount);
      }
      return prev;
    });
  };

  const handleUndoDelete = () => {
    if (!lastDeletedChapter) return;

    setManualChapters(prev => {
      const updated = [...prev, lastDeletedChapter];
      setManualCourseParams(params => ({ ...params, numChapters: updated.length }));
      return updated;
    });

    setLastDeletedChapter(null);
    toast.success("Chapter restored!");
  };

  const handleCancelEdit = () => {
    setEditingCourseIndex(null);
    setManualCourseParams({ courseTitle: "", numChapters: 1 });
    setManualChapters([{ name: "", topics: "", id: generateUniqueId() }]);
    setLastDeletedChapter(null);
    setActiveTab('manage');
    toast("Edit cancelled.", { icon: 'ℹ️' });
  };

  const handleManualChapterChange = (id, field, value) => {
    setManualChapters(prev => prev.map(ch => ch.id === id ? { ...ch, [field]: value } : ch));
  };

  const handleSaveManualData = () => {
    if (!manualCourseParams.courseTitle) {
      toast.error('Please enter a course title.');
      return;
    }
    let originalSource = 'manual';
    if (editingCourseIndex !== null) {
      originalSource = syllabusData[editingCourseIndex].source || 'manual';
    }

    const newCourse = {
      courseTitle: manualCourseParams.courseTitle,
      chapters: manualChapters,
      source: originalSource
    };

    if (editingCourseIndex !== null) {
      updateSyllabusData(editingCourseIndex, newCourse);
      toast.success(`Updated ${manualCourseParams.courseTitle} successfully!`);
      setEditingCourseIndex(null);

      // NEW: Automatically return user to the correct category in Manage Data
      setActiveTab('manage');
      setManageTab(originalSource);
    } else {
      addSyllabusData(newCourse);
      toast.success(`Success! Added "${manualCourseParams.courseTitle}" and its chapters.`);
    }

    // Reset the form to blank for next subject entry
    setManualCourseParams({ courseTitle: "", numChapters: 1 });
    setManualChapters([{ name: "", topics: "", id: generateUniqueId() }]);
    setLastDeletedChapter(null);
  };

  const handleBulkGenerate = async (force = false) => {
    // Force save the source if it's different
    if (localSource !== preferredFlashcardSource) {
      setPreferredFlashcardSource(localSource);
    }

    addNotification({
      id: "flashcard-buffer",
      type: "loading",
      title: "Generating Flashcards",
      message: `${force ? "Re-generating" : "Syncing"} your ${localSource.toUpperCase()} syllabus. This may take a while...`,
    });

    const result = await bulkGenerateFlashcards(localSource, flashcardsPerChapter, force);

    removeNotification("flashcard-buffer");

    if (result.success) {
      addNotification({
        type: "success",
        title: "Flashcards Ready",
        message: result.summary,
        icon: "bi-check-circle"
      });
    } else if (!result.cancelled) {
      addNotification({
        type: "error",
        title: "Generation Failed",
        message: result.message || "Failed to connect to AI service.",
        icon: "bi-exclamation-octagon"
      });
    }
  };



  return (
    <div className="page-container">
      <style>
        {`
          .manual-chapters-list input::placeholder, 
          .manual-chapters-list textarea::placeholder {
            color: #94a3b8 !important;
            opacity: 0.7 !important;
            font-weight: 400 !important;
          }
          input:focus, textarea:focus {
            outline: none !important;
            box-shadow: none !important;
            border-color: #795548 !important;
          }
        `}
      </style>
      <ConfirmationModal
        show={modalConfig.show}
        onClose={closeModal}
        onConfirm={modalConfig.onConfirm}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        confirmText={modalConfig.confirmText}
      />
      <div className="page-header mb-5">
        <h1 className="page-title">
          {activeTab === 'profile' ? 'Profile Settings' :
            activeTab === 'notifications' ? 'Notifications' :
              activeTab === 'flashcards' ? 'Flashcard Preferences' :
                activeTab === 'pdf' ? 'Upload Syllabus PDF' :
                  activeTab === 'manual' ? (editingCourseIndex !== null ? 'Edit Course Structure' : 'Manual Course Entry') :
                    'Manage Saved Data'
          }
        </h1>
        <p className="page-subtitle">Configure your preferences and global study data</p>
      </div>

      <div className="row">
        {/* Main Content Area (Full width since sub-sidebar handles navigation) */}
        <div className="col-lg-12">

          {/* PROFILE */}
          {activeTab === "profile" && (
            <ProfilePage isEmbedded={true} />
          )}



          {/* NOTIFICATIONS */}
          {activeTab === "notifications" && (
            <div className="animate-fade-in">
              <SettingsSection
                title="Application Notifications"
                description="Manage your system alerts and connection preferences in one place."
              >
                {/* 1. Global Toggle */}
                <div className="notification-options mb-4">
                  <div className="d-flex align-items-center justify-content-between p-4 rounded-4" style={{ background: 'rgba(121, 85, 72, 0.03)', border: '1px solid rgba(121, 85, 72, 0.08)' }}>
                    <div>
                      <h6 className="fw-bold mb-1" style={{ color: '#5d4037', fontSize: '1.05rem' }}>Master Notification Switch</h6>
                      <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>Allow GyaanMitra to send you real-time session updates and student alerts.</p>
                    </div>
                    <div className="form-check form-switch fs-4">
                      <input className="form-check-input" type="checkbox" name="enableAll" checked={notificationPrefs.enableAll !== false} onChange={handleNotificationChange} style={{ cursor: "pointer", accentColor: "#795548" }} />
                    </div>
                  </div>
                </div>

                {/* 2. Primary Save Action */}
                <div className="d-flex justify-content-end mb-5" style={{ paddingRight: '1.5rem' }}>
                  <button
                    onClick={() => toast.success('Preferences saved!')}
                    className="btn shadow-sm d-flex align-items-center justify-content-center"
                    style={{
                      background: '#795548',
                      color: 'white',
                      height: '42px',
                      minWidth: '190px',
                      borderRadius: "50rem",
                      fontWeight: "700",
                      fontSize: '0.9rem',
                      border: 'none',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <i className="bi bi-shield-check me-2 fs-6"></i> Save Preferences
                  </button>
                </div>

                <hr className="mb-4 border-0" style={{ height: '1px', background: 'linear-gradient(to right, transparent, rgba(121, 85, 72, 0.1), transparent)' }} />

                {/* 3. Diagnostic Area */}
                <div className="simulation-area">
                  <h6 className="fw-bold mb-3 small text-uppercase tracking-wider" style={{ color: '#ac9c96', letterSpacing: '1px' }}>Diagnostic Tools</h6>
                  <div
                    className="d-flex flex-column flex-md-row align-items-center justify-content-between p-4 rounded-4"
                    style={{
                      background: 'linear-gradient(135deg, rgba(121, 85, 72, 0.05) 0%, rgba(121, 85, 72, 0.02) 100%)',
                      border: '1px solid rgba(121, 85, 72, 0.15)',
                      boxShadow: '0 4px 20px rgba(121, 85, 72, 0.05)'
                    }}
                  >
                    <div className="d-flex flex-column flex-md-row align-items-center gap-4 mb-3 mb-md-0 text-center text-md-start">
                      <div className="d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: '52px', height: '52px', background: 'white', borderRadius: '14px', boxShadow: '0 8px 15px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9' }}>
                        <i className="bi bi-chat-dots-fill fs-4" style={{ color: '#795548' }}></i>
                      </div>
                      <div>
                        <h6 className="fw-bold mb-1" style={{ color: '#5d4037', fontSize: '0.95rem' }}>Simulate System Message</h6>
                        <p className="text-muted mb-0" style={{ maxWidth: '350px', fontSize: '0.825rem' }}>Instantly push a test alert to verify connectivity is active.</p>
                      </div>
                    </div>
                    <button
                      className="btn btn-primary shadow-sm d-flex align-items-center justify-content-center text-white"
                      style={{
                        background: '#795548',
                        border: 'none',
                        fontWeight: '700',
                        height: '42px',
                        minWidth: '190px',
                        borderRadius: '50rem',
                        fontSize: '0.9rem',
                        transition: 'all 0.2s ease'
                      }}
                      onClick={() => {
                        addNotification({
                          type: "info",
                          title: "Diagnostic Alert",
                          message: "The system connectivity test was successful.",
                          icon: "bi-check-circle-fill"
                        });
                      }}
                    >
                      <i className="bi bi-send-fill me-2"></i> Send System Test
                    </button>
                  </div>
                </div>
              </SettingsSection>
            </div>
          )}


          {/* FLASHCARDS */}
          {activeTab === "flashcards" && (
            <div className="animate-fade-in">
              <SettingsSection
                title="Flashcard Generation"
                description="Manage how cards are generated for your syllabus. Settings are applied per-chapter."
              >
                <div className="row g-0 mb-3 align-items-center">
                  <div className="col-md-6 pe-md-5 border-end" style={{ borderColor: 'rgba(0,0,0,0.08) !important' }}>
                    <div className="h-100 pb-3">
                      <h6 className="fw-bold mb-3" style={{ color: '#5d4037', fontSize: '0.9rem' }}>1. Set Density</h6>
                      <div className="input-group mb-2 shadow-sm" style={{ maxWidth: '280px' }}>
                        <span className="input-group-text bg-white border-end-0" style={{ color: '#795548' }}><i className="bi bi-stack"></i></span>
                        <input
                          type="number"
                          className="form-control border-start-0"
                          min="1"
                          max="30"
                          value={flashcardsPerChapter}
                          onChange={(e) => setFlashcardsPerChapter(parseInt(e.target.value) || 1)}
                        />
                      </div>
                      <p className="text-muted" style={{ fontSize: '0.8rem' }}>Cards to generate **per chapter**.</p>
                    </div>
                  </div>
                  <div className="col-md-6 ps-md-5">
                    <div className="h-100 pb-3">
                      <h6 className="fw-bold mb-3" style={{ color: '#5d4037', fontSize: '0.9rem' }}>2. Preferred Source</h6>
                      <div className="d-flex flex-column gap-2" style={{ maxWidth: '300px' }}>
                        <div className="btn-group shadow-none border rounded p-1" style={{ background: 'white' }}>
                          <button
                            className="btn btn-sm"
                            style={{
                              background: localSource === 'pdf' ? '#795548' : 'transparent',
                              color: localSource === 'pdf' ? 'white' : '#64748b',
                              border: 'none',
                              fontWeight: '600'
                            }}
                            onClick={() => setLocalSource('pdf')}
                          >
                            PDFs
                          </button>
                          <button
                            className="btn btn-sm"
                            style={{
                              background: localSource === 'manual' ? '#795548' : 'transparent',
                              color: localSource === 'manual' ? 'white' : '#64748b',
                              border: 'none',
                              fontWeight: '600'
                            }}
                            onClick={() => setLocalSource('manual')}
                          >
                            Manual
                          </button>
                        </div>
                        {localSource !== preferredFlashcardSource && (
                          <button
                            className="btn btn-sm w-100 animate-fade-in shadow-sm"
                            style={{ background: '#5d4037', color: 'white', fontWeight: '600', border: 'none' }}
                            onClick={handleSaveFlashcardSource}
                          >
                            <i className="bi bi-save me-2"></i>Save Preference
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="py-3 px-1 mb-4 border-top border-bottom" style={{ borderColor: 'rgba(0,0,0,0.03)' }}>
                  <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
                    <div>
                      <h6 className="fw-bold mb-1" style={{ fontSize: '0.9rem' }}>Force Refresh All?</h6>
                      <p className="text-muted small mb-0">Re-generate all <strong>{localSource.toUpperCase()}</strong> cards based on new density.</p>
                    </div>
                    <div className="d-flex gap-2 align-items-center">
                      {isBulkGenerating && (
                        <button
                          className="btn btn-outline-secondary btn-sm px-3 py-2"
                          onClick={cancelBulkGenerate}
                        >
                          <i className="bi bi-x-circle me-1"></i>Cancel
                        </button>
                      )}
                      <button
                        className="btn btn-outline-danger btn-sm px-4 py-2"
                        disabled={isBulkGenerating}
                        onClick={() => openModal({
                          title: "Force Refresh All?",
                          message: `Warning: This will DELETE all existing cards for your ${localSource.toUpperCase()} subjects and recreate ${flashcardsPerChapter} cards per chapter. This cannot be undone.`,
                          onConfirm: () => handleBulkGenerate(true),
                          type: "danger",
                          confirmText: "Refresh All"
                        })}
                      >
                        {isBulkGenerating ? <><span className="spinner-border spinner-border-sm me-2"></span>Generating...</> : <><i className="bi bi-lightning-charge-fill me-2"></i>Force Refresh</>}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="alert alert-warning border-0 d-flex align-items-center" style={{ background: 'rgba(255, 193, 7, 0.1)' }}>
                  <i className="bi bi-shield-lock-fill me-3 fs-3 text-warning"></i>
                  <div className="small text-dark">
                    <strong>Persistence Guarantee:</strong> Previously generated cards will never be overwritten. New cards are only created for chapters that are currently empty.
                  </div>
                </div>
              </SettingsSection>
            </div>

          )}

          {/* STUDY DATA: PDF UPLOAD */}
          {activeTab === "pdf" && (
            <div className="animate-fade-in">
              <SettingsSection title="Upload PDF Syllabus" description="Our AI model will read the PDF to extract chapters and topics.">
                <div
                  className="text-center p-5 mb-4"
                  style={{
                    background: 'rgba(121, 85, 72, 0.03)',
                    border: '2px dashed rgba(121, 85, 72, 0.2)',
                    borderRadius: 'var(--radius-xl)',
                  }}
                >
                  <i className="bi bi-cloud-arrow-up" style={{ fontSize: '3rem', color: '#795548' }}></i>
                  <h5 className="mt-3" style={{ color: 'var(--text-primary)' }}>Select a Syllabus PDF</h5>
                  <p className="small mb-4" style={{ color: 'var(--text-secondary)' }}>Supported formats: .pdf up to 10MB</p>

                  <input
                    type="file"
                    accept=".pdf"
                    className="d-none"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                  />

                  <button
                    className="btn btn-outline-primary px-4"
                    onClick={() => fileInputRef.current.click()}
                  >
                    Browse Files
                  </button>

                  {selectedFile && (
                    <div className="mt-4 p-3 rounded" style={{ background: 'var(--bg-card)', border: '1px solid #e2e8f0', display: 'inline-block', textAlign: 'left' }}>
                      <div className="d-flex align-items-center">
                        <i className="bi bi-file-earmark-pdf-fill text-danger fs-4 me-3"></i>
                        <div>
                          <div className="fw-bold" style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{selectedFile.name}</div>
                          <div className="text-muted" style={{ fontSize: '0.75rem' }}>{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</div>
                        </div>
                        <i className="bi bi-x ms-4 cursor-pointer text-muted" onClick={() => setSelectedFile(null)}></i>
                      </div>
                    </div>
                  )}

                </div>

                <div className="d-flex justify-content-end gap-2">
                  {isExtracting && (
                    <button
                      className="btn btn-outline-danger px-4 py-2"
                      onClick={cancelExtraction}
                    >
                      <i className="bi bi-x-circle me-2"></i>Cancel
                    </button>
                  )}
                  <button
                    className="btn btn-primary px-5 py-2"
                    onClick={handleExtractPDF}
                    disabled={!selectedFile || isExtracting}
                  >
                    {isExtracting ? (
                      <><span className="spinner-border spinner-border-sm me-2"></span>Extracting...</>
                    ) : (
                      <><i className="bi bi-magic me-2"></i>Extract & Save Data</>
                    )}
                  </button>
                </div>
              </SettingsSection>
            </div>
          )}

          {/* STUDY DATA: MANUAL ENTRY */}
          {activeTab === "manual" && (
            <div className="animate-fade-in">
              <SettingsSection
                title={<><i className="bi bi-keyboard-fill me-2" style={{ color: '#795548' }}></i>{editingCourseIndex !== null ? 'Edit existing' : 'Manual'} Syllabus Constructor</>}
                description="Craft your study plan manually by defining chapters and key learning topics for the AI model to process."
              >

                <div className="row g-4 mb-4">
                  <div className="col-lg-8">
                    <div className="form-group">
                      <label className="form-label fw-bold small text-uppercase tracking-wider" style={{ color: '#64748b' }}>
                        Subject / Course Title
                      </label>
                      <div className="input-group shadow-sm">
                        <span className="input-group-text bg-white border-end-0">
                          <i className="bi bi-mortarboard" style={{ color: '#795548' }}></i>
                        </span>
                        <input
                          type="text"
                          className="form-control border-start-0 ps-0"
                          placeholder="e.g. Advanced Quantum Physics"
                          value={manualCourseParams.courseTitle}
                          onChange={(e) => setManualCourseParams({ ...manualCourseParams, courseTitle: e.target.value })}
                          style={{ height: '3rem' }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="col-lg-4">
                    <div className="form-group">
                      <label className="form-label fw-bold small text-uppercase tracking-wider" style={{ color: '#64748b' }}>
                        Total Chapters
                      </label>
                      <div className="d-flex gap-2 align-items-center">
                        <div className="input-group shadow-sm overflow-hidden" style={{ borderRadius: '0.75rem', maxWidth: '220px' }}>
                          <button
                            className="btn bg-white border-end"
                            onClick={() => handleAdjustChapters(-1)}
                            style={{ color: '#795548', minWidth: '45px', border: '1px solid #e2e8f0' }}
                          >
                            <i className="bi bi-dash-lg"></i>
                          </button>
                          <input
                            type="number"
                            className="form-control border-0 text-center fw-bold bg-white"
                            readOnly
                            value={manualCourseParams.numChapters}
                            style={{ height: '3rem', fontSize: '1.1rem', color: '#1e293b' }}
                          />
                          <button
                            className="btn bg-white border-start"
                            onClick={() => handleAdjustChapters(1)}
                            style={{ color: '#795548', minWidth: '45px', border: '1px solid #e2e8f0' }}
                          >
                            <i className="bi bi-plus-lg"></i>
                          </button>
                        </div>

                        {lastDeletedChapter && (
                          <button
                            className="btn btn-sm px-3 py-2 ms-2 animate-fade-in"
                            onClick={handleUndoDelete}
                            style={{
                              background: 'rgba(121, 85, 72, 0.08)',
                              color: '#795548',
                              border: '1px dashed #795548',
                              borderRadius: '10px',
                              fontWeight: '700',
                              fontSize: '0.8rem',
                              transition: '0.2s'
                            }}
                          >
                            <i className="bi bi-arrow-counterclockwise me-1"></i> Undo
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <hr className="mb-4" />

                <div className="manual-chapters-list">
                  {manualChapters.map((chapter, index) => (
                    <div
                      key={chapter.id}
                      className={`animate-fade-in ${index < manualChapters.length - 1 ? 'mb-5' : 'mb-2'}`}
                      style={{
                        borderBottom: index < manualChapters.length - 1 ? '1px solid rgba(121, 85, 72, 0.15)' : 'none',
                        paddingBottom: index < manualChapters.length - 1 ? '2rem' : '0'
                      }}
                    >
                      <div className="d-flex align-items-center mb-4">
                        <div
                          className="d-flex align-items-center justify-content-center me-3"
                          style={{
                            width: '32px',
                            height: '32px',
                            background: '#795548',
                            color: 'white',
                            borderRadius: '50%',
                            fontWeight: '700',
                            fontSize: '0.85rem',
                            boxShadow: '0 4px 10px rgba(121, 85, 72, 0.2)'
                          }}
                        >
                          {index + 1}
                        </div>
                        <span className="fw-bold mb-0" style={{ color: '#1e293b', fontSize: '0.95rem' }}>
                          Chapter {index + 1}
                        </span>
                      </div>

                      <div className="row g-4">
                        {/* Chapter Title Line */}
                        <div className="col-12">
                          <div className="form-group">
                            <label className="form-label fw-bold text-dark-emphasis mb-2 small text-uppercase">
                              Chapter Title
                            </label>
                            <div className="input-group">
                              <span className="input-group-text bg-white border-end-0">
                                <i className="bi bi-tag-fill text-muted"></i>
                              </span>
                              <input
                                type="text"
                                className="form-control border-start-0 ps-0 fw-semibold"
                                placeholder={`e.g. Chapter ${index + 1}: Foundations of Physics`}
                                value={chapter.name}
                                onChange={(e) => handleManualChapterChange(chapter.id, 'name', e.target.value)}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Topics Next Line */}
                        <div className="col-12 mt-3">
                          <div className="form-group">
                            <label className="form-label fw-bold text-dark-emphasis mb-2 small text-uppercase">
                              Topics Covered (Mention below)
                            </label>
                            <div className="input-group">
                              <span className="input-group-text bg-white border-end-0 align-items-start pt-3">
                                <i className="bi bi-list-task" style={{ color: '#795548' }}></i>
                              </span>
                              <textarea
                                className="form-control border-start-0 ps-0"
                                rows="3"
                                placeholder="Type topics here, separated by commas..."
                                value={chapter.topics}
                                onChange={(e) => handleManualChapterChange(chapter.id, 'topics', e.target.value)}
                                style={{
                                  resize: 'vertical',
                                  minHeight: '100px',
                                  paddingTop: '0.75rem'
                                }}
                              ></textarea>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="d-flex justify-content-end gap-3 pt-4">
                  {editingCourseIndex !== null && (
                    <button
                      className="btn btn-outline-secondary px-5 py-3 fw-bold shadow-sm"
                      onClick={handleCancelEdit}
                      style={{
                        fontSize: '1.05rem',
                        letterSpacing: '0.3px',
                        borderRadius: '12px',
                        border: '1px solid rgba(0,0,0,0.1)',
                        color: '#64748b',
                        background: '#f8fafc'
                      }}
                    >
                      <i className="bi bi-x-circle me-2"></i> Cancel
                    </button>
                  )}
                  <button
                    className="btn btn-primary px-5 py-3 fw-bold shadow-sm"
                    onClick={handleSaveManualData}
                    style={{ fontSize: '1.05rem', letterSpacing: '0.3px', borderRadius: '12px' }}
                  >
                    <i className="bi bi-check2-circle me-2"></i> {editingCourseIndex !== null ? 'Update Course Structure' : 'Save Course Structure'}
                  </button>
                </div>
              </SettingsSection>
            </div>
          )}

          {/* STUDY DATA: MANAGE */}
          {activeTab === "manage" && (
            <div className="animate-fade-in">
              <SettingsSection title="Saved Courses" description="View and remove global study data. This data is available in the Quiz Generator auto-mode.">
                <ul className="nav nav-tabs mb-4 border-0" style={{ gap: '10px' }}>
                  <li className="nav-item">
                    <button
                      className="nav-link border-0 rounded-pill px-4 py-2"
                      style={{
                        background: manageTab === 'pdf' ? '#795548' : 'rgba(121, 85, 72, 0.05)',
                        color: manageTab === 'pdf' ? 'white' : '#795548',
                        fontWeight: '600',
                        transition: '0.2s'
                      }}
                      onClick={() => setManageTab('pdf')}
                    >
                      <i className="bi bi-file-earmark-pdf me-2"></i>PDF Uploads
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      className="nav-link border-0 rounded-pill px-4 py-2"
                      style={{
                        background: manageTab === 'manual' ? '#795548' : 'rgba(121, 85, 72, 0.05)',
                        color: manageTab === 'manual' ? 'white' : '#795548',
                        fontWeight: '600',
                        transition: '0.2s'
                      }}
                      onClick={() => setManageTab('manual')}
                    >
                      <i className="bi bi-keyboard me-2"></i>Manual Entry
                    </button>
                  </li>
                </ul>

                {syllabusData.filter(d => d.source === manageTab).length === 0 ? (
                  <div className="text-center p-5 text-muted">
                    <i className="bi bi-database-x fs-1 mb-3 d-block"></i>
                    <p>No {manageTab === 'pdf' ? 'PDF' : 'manual'} study data saved yet.</p>
                  </div>
                ) : (
                  <div className="row g-3">
                    {syllabusData.map((course, index) => {
                      if (course.source !== manageTab) return null;
                      return (
                        <div className="col-md-6" key={index}>
                          <div className="p-4 rounded h-100 position-relative animate-fade-in" style={{ background: 'white', border: '1px solid rgba(121, 85, 72, 0.1)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                            <div className="position-absolute" style={{ top: '1rem', right: '1rem', display: 'flex', gap: '8px' }}>
                              <button
                                className="btn btn-sm"
                                style={{
                                  border: '1px solid #795548',
                                  color: '#795548',
                                  background: 'transparent',
                                  transition: '0.2s'
                                }}
                                onClick={() => {
                                  setEditingCourseIndex(index);
                                  setManualCourseParams({ courseTitle: course.courseTitle, numChapters: course.chapters?.length || 1 });

                                  // Re-map IDs to ensure no collisions with old saved data
                                  setManualChapters(course.chapters?.length
                                    ? course.chapters.map(ch => ({ ...ch, id: generateUniqueId() }))
                                    : [{ name: "", topics: "", id: generateUniqueId() }]
                                  );

                                  if (setActiveTab) setActiveTab('manual');
                                }}
                                title="Edit Course"
                              >
                                <i className="bi bi-pencil"></i>
                              </button>
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => {
                                  openModal({
                                    title: "Delete Course",
                                    message: `Are you sure you want to delete this course from ${manageTab}? This action cannot be undone.`,
                                    type: "danger",
                                    confirmText: "Delete Course",
                                    onConfirm: () => {
                                      removeSyllabusData(index);
                                      toast.success('Removed course.');
                                      closeModal();
                                    }
                                  });
                                }}
                                title="Delete Course"
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            </div>
                            <h5 className="fw-bold text-dark pe-5" style={{ color: 'var(--text-primary)' }}>{course.courseTitle}</h5>
                            <p className="text-muted small mb-3">
                              {course.chapters?.length || 0} Chapters Available
                            </p>
                            <div style={{ maxHeight: '120px', overflowY: 'auto' }} className="pe-2 custom-scrollbar">
                              {course.chapters?.map((ch, i) => (
                                <div key={i} className="mb-2">
                                  <span className="badge bg-secondary me-2">Ch {i + 1}</span>
                                  <span className="text-dark small" style={{ color: 'var(--text-primary)' }}>{ch.name}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div className="col-12 text-end mt-4">
                      <button className="btn btn-outline-danger" onClick={() => {
                        openModal({
                          title: "Clear All Data",
                          message: `Are you sure you want to wipe all ${manageTab} data? This action cannot be undone.`,
                          type: "danger",
                          confirmText: "Clear All",
                          onConfirm: () => {
                            clearSyllabusData();
                            toast.success('All data wiped.');
                            closeModal();
                          }
                        });
                      }}>
                        Clear All Data
                      </button>
                    </div>
                  </div>
                )}
              </SettingsSection>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
