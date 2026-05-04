import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AuthContext } from './AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';

export const SettingsContext = createContext();

export const useSettings = () => {
  return useContext(SettingsContext);
};

export const SettingsProvider = ({ children }) => {
  const { user, token } = useContext(AuthContext);
  const isInitialMount = useRef(true);
  
  const [syllabusData, setSyllabusData] = useState([]);
  const [flashcardsPerChapter, setFlashcardsPerChapter] = useState(5);
  const [preferredFlashcardSource, setPreferredFlashcardSource] = useState('pdf');
  const [notificationPrefs, setNotificationPrefs] = useState({ enableAll: true, showDummy: true });
  const [timerSettings, setTimerSettings] = useState({ focusDuration: 25, breakDuration: 5, autoStart: false });
  const [musicSettings, setMusicSettings] = useState({ lastVibe: 'lofi', volume: 50 });
  const [activeTab, setActiveTab] = useState('pdf');
  const [loading, setLoading] = useState(false);

  // PDF extraction state — lives in context so it survives page navigation
  const [isExtracting, setIsExtracting] = useState(false);
  const extractAbortRef = useRef(null);

  const extractPDF = useCallback(async (file) => {
    if (!file) {
      toast.error('Please select a PDF file first.');
      return false;
    }

    const formData = new FormData();
    formData.append('file', file);

    setIsExtracting(true);
    const controller = new AbortController();
    extractAbortRef.current = controller;
    const tid = toast.loading('Extracting syllabus from PDF... This may take a minute.');

    try {
      const response = await api.post('/settings/extract-syllabus', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        signal: controller.signal
      });
      const data = response.data;

      if (data.success && data.data) {
        setSyllabusData(prev => [...prev, { ...data.data, source: 'pdf' }]);
        toast.success(`Successfully extracted ${data.data.courseTitle}!`, { id: tid });
        return true;
      } else {
        toast.error(data.message || 'Error extracting PDF', { id: tid });
        return false;
      }
    } catch (error) {
      if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
        toast.error('Extraction cancelled.', { id: tid });
        return false;
      }
      console.error(error);
      const msg = error.response?.data?.message || 'Failed to connect to the server. Make sure LM Studio is running.';
      toast.error(msg, { id: tid });
      return false;
    } finally {
      setIsExtracting(false);
      extractAbortRef.current = null;
    }
  }, []);

  const cancelExtraction = useCallback(() => {
    if (extractAbortRef.current) {
      extractAbortRef.current.abort();
      extractAbortRef.current = null;
    }
  }, []);

  // Flashcard bulk generation state — lives in context so it survives page nav
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);
  const bulkAbortRef = useRef(null);

  const bulkGenerateFlashcards = useCallback(async (source, count, force = false) => {
    setIsBulkGenerating(true);
    const action = force ? "Re-generating" : "Syncing";
    const controller = new AbortController();
    bulkAbortRef.current = controller;
    const tid = toast.loading(`${action} your ${source.toUpperCase()} syllabus...`);

    try {
      const response = await api.post('/flashcards/generate-all-ai', {
        source,
        syllabusData,
        count,
        force
      }, { signal: controller.signal });

      if (response.data.success) {
        toast.success(response.data.message, { id: tid });
        const summary = force
          ? `Successfully recreated ${response.data.details.chaptersProcessed} chapters.`
          : `Processed: ${response.data.details.chaptersProcessed} new, Skipped: ${response.data.details.chaptersSkipped} existing.`;
        toast.success(summary);
        return { success: true, summary };
      } else {
        toast.error(response.data.message, { id: tid });
        return { success: false, message: response.data.message };
      }
    } catch (error) {
      if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
        toast.error('Generation cancelled.', { id: tid });
        return { success: false, cancelled: true };
      }
      console.error(error);
      toast.error('Bulk generation failed', { id: tid });
      return { success: false, message: 'Failed to connect to AI service.' };
    } finally {
      setIsBulkGenerating(false);
      bulkAbortRef.current = null;
    }
  }, [syllabusData]);

  const cancelBulkGenerate = useCallback(() => {
    if (bulkAbortRef.current) {
      bulkAbortRef.current.abort();
      bulkAbortRef.current = null;
    }
  }, []);

  // Load data from backend when token is available
  const fetchSettings = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await api.get('/settings');
      if (res.data.success && res.data.data) {
        const d = res.data.data;
        if (d.syllabusData) setSyllabusData(d.syllabusData);
        if (d.flashcardsPerChapter) setFlashcardsPerChapter(d.flashcardsPerChapter);
        if (d.preferredFlashcardSource) setPreferredFlashcardSource(d.preferredFlashcardSource);
        if (d.notificationPrefs) setNotificationPrefs(d.notificationPrefs);
        if (d.timer) setTimerSettings(d.timer);
        if (d.music) setMusicSettings(d.music);
      }
    } catch (error) {
      console.error("Error loading settings from DB:", error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchSettings();
    } else {
      // Reset to defaults if logged out
      setSyllabusData([]);
      setFlashcardsPerChapter(5);
      setPreferredFlashcardSource('pdf');
      setNotificationPrefs({ enableAll: true, showDummy: true });
      setTimerSettings({ focusDuration: 25, breakDuration: 5, autoStart: false });
      setMusicSettings({ lastVibe: 'lofi', volume: 50 });
    }
  }, [token, fetchSettings]);

  // Function to save to DB
  const saveSettings = async (updates) => {
    if (!token) return;
    try {
      await api.post('/settings', updates);
    } catch (error) {
      console.error("Error saving settings to DB:", error);
    }
  };

  // Automated sync when specific states change (after initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    if (token) {
      const timeoutId = setTimeout(() => {
         saveSettings({
           syllabusData,
           flashcardsPerChapter,
           preferredFlashcardSource,
           notificationPrefs,
           timer: timerSettings,
           music: musicSettings
         });
      }, 500); // Debounce to prevent too many DB writes
      
      return () => clearTimeout(timeoutId);
    }
  }, [syllabusData, flashcardsPerChapter, preferredFlashcardSource, notificationPrefs, timerSettings, musicSettings, token]);


  // Add new course syllabus (from manual entry or PDF)
  const addSyllabusData = (newCourse) => {
    setSyllabusData(prev => [...prev, newCourse]);
  };

  const updateSyllabusData = (index, updatedCourse) => {
    setSyllabusData(prev => {
      const newData = [...prev];
      newData[index] = updatedCourse;
      return newData;
    });
  };

  const removeSyllabusData = (index) => {
    setSyllabusData(prev => prev.filter((_, i) => i !== index));
  };

  const clearSyllabusData = () => {
    setSyllabusData([]);
  };

  const updateTimerSettings = (newSettings) => {
    setTimerSettings(prev => ({ ...prev, ...newSettings }));
  };

  const updateMusicSettings = (newSettings) => {
    setMusicSettings(prev => ({ ...prev, ...newSettings }));
  };

  const updateNotificationPrefs = (newPrefs) => {
    setNotificationPrefs(prev => ({ ...prev, ...newPrefs }));
  };

  const value = {
    syllabusData,
    addSyllabusData,
    updateSyllabusData,
    removeSyllabusData,
    clearSyllabusData,
    activeTab,
    setActiveTab,
    flashcardsPerChapter,
    setFlashcardsPerChapter,
    preferredFlashcardSource,
    setPreferredFlashcardSource,
    notificationPrefs,
    updateNotificationPrefs,
    timerSettings,
    updateTimerSettings,
    musicSettings,
    updateMusicSettings,
    loading,
    isExtracting,
    extractPDF,
    cancelExtraction,
    isBulkGenerating,
    bulkGenerateFlashcards,
    cancelBulkGenerate
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};
