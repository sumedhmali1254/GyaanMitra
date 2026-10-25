import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useSettings } from "../context/SettingsContext";
import api from "../services/api";

const chapterColors = [
  { gradient: "linear-gradient(135deg, #5d4037 0%, #795548 100%)", tint: "rgba(121, 85, 72, 0.12)", accent: "#795548" },
  { gradient: "linear-gradient(135deg, #795548 0%, #8d6e63 100%)", tint: "rgba(141, 110, 99, 0.12)", accent: "#8d6e63" },
  { gradient: "linear-gradient(135deg, #6d5148 0%, #a1887f 100%)", tint: "rgba(161, 136, 127, 0.14)", accent: "#8d6e63" },
  { gradient: "linear-gradient(135deg, #5d4037 0%, #8d6e63 100%)", tint: "rgba(93, 64, 55, 0.10)", accent: "#5d4037" },
  { gradient: "linear-gradient(135deg, #795548 0%, #a1887f 100%)", tint: "rgba(121, 85, 72, 0.10)", accent: "#795548" },
  { gradient: "linear-gradient(135deg, #6d5148 0%, #b08968 100%)", tint: "rgba(176, 137, 104, 0.12)", accent: "#8d6e63" },
];

const FlashcardsPage = () => {
  const { syllabusData, preferredFlashcardSource } = useSettings();
  const [activeSubjectId, setActiveSubjectId] = useState(null);
  const [allFlashcards, setAllFlashcards] = useState([]);
  const [flippedCards, setFlippedCards] = useState({});

  useEffect(() => {
    fetchFlashcards();
  }, [preferredFlashcardSource]);

  const fetchFlashcards = async () => {
    try {
      const response = await api.get(`/flashcards?source=${preferredFlashcardSource}`);
      if (response.data.success) {
        setAllFlashcards(response.data.flashcards);
      }
    } catch (error) {
      console.warn("Flashcards fetching paused - check server connectivity or card existence.", error.message);
      // We don't show a toast error here to keep the UI clean if cards aren't generated or server is down temporarily
    } finally {
      // Ensure we keep the empty state if there's an error
    }
  };

  const toggleCard = (id) => {
    setFlippedCards(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Filter subjects by the persistent source from Settings
  const tabList = useMemo(
    () => [
      ...new Set(
        syllabusData
          .filter((syllabus) =>
            preferredFlashcardSource === "all" ||
            syllabus.source === preferredFlashcardSource,
          )
          .map((syllabus) => syllabus.courseTitle)
          .filter(Boolean),
      ),
    ],
    [syllabusData, preferredFlashcardSource],
  );

  useEffect(() => {
    if (tabList.length > 0 && (!activeSubjectId || !tabList.includes(activeSubjectId))) {
      setActiveSubjectId(tabList[0]);
    }
  }, [tabList, activeSubjectId]);

  const subjectCards = allFlashcards.filter(c => c.subject === activeSubjectId);
  const chapterIndexFor = (chapterName, source) => {
    const course = syllabusData.find(
      (item) =>
        item.courseTitle === activeSubjectId &&
        (!source || item.source === source),
    );
    const chapterIndex = course?.chapters?.findIndex(
      (item) => item.name === chapterName,
    );
    return chapterIndex >= 0 ? chapterIndex + 1 : null;
  };

  // Group by chapter
  const cardsByChapter = subjectCards.reduce((acc, card) => {
    const key = `${card.source}:${card.chapter}`;
    if (!acc[key]) acc[key] = { name: card.chapter, source: card.source, cards: [] };
    acc[key].cards.push(card);
    return acc;
  }, {});
  const orderedChapterGroups = Object.entries(cardsByChapter)
    .map(([key, group]) => ({
      key,
      ...group,
      chapterNumber: chapterIndexFor(group.name, group.source),
    }))
    .sort((a, b) => {
      if (a.chapterNumber === null) return b.chapterNumber === null ? 0 : 1;
      if (b.chapterNumber === null) return -1;
      return a.chapterNumber - b.chapterNumber;
    });

  return (
    <div className="page-container" style={{ minHeight: '100vh', paddingBottom: '5rem' }}>
      <div className="page-header mb-5">
        <div className="d-flex justify-content-between align-items-end mb-4 flex-wrap gap-3">
          <div>
            <h1 className="page-title fw-bold mb-1">Flashcards</h1>
            <p className="page-subtitle text-muted small">Viewing your <strong>{preferredFlashcardSource.toUpperCase()}</strong> collection</p>
          </div>
        </div>

        {/* Dynamic Subject Tabs */}
        <div className="d-flex gap-2 flex-wrap">
          {tabList.map((tab) => {
            const hasFlashcards = allFlashcards.some((flashcard) => flashcard.subject === tab);
            return (
            <button
              key={tab}
              onClick={() => setActiveSubjectId(tab)}
              className={`btn px-4 py-2 rounded-pill fw-bold transition-all ${activeSubjectId === tab ? 'btn-primary shadow-sm' : 'btn-light text-muted border'}`}
              style={{ whiteSpace: "normal", overflowWrap: "anywhere", maxWidth: "100%" }}
              aria-label={`${tab}: ${hasFlashcards ? "flashcards available" : "no flashcards generated"}`}
            >
              {tab}
              <span
                className="ms-2 d-inline-flex align-items-center justify-content-center"
                style={{
                  width: "18px",
                  height: "18px",
                  borderRadius: "50%",
                  background: hasFlashcards ? "rgba(56, 102, 65, 0.14)" : "rgba(121, 85, 72, 0.12)",
                  color: hasFlashcards ? "var(--success)" : "var(--primary)",
                  fontSize: "0.68rem",
                  lineHeight: 1,
                  verticalAlign: "middle",
                }}
                title={hasFlashcards ? "Flashcards available" : "No flashcards generated"}
                aria-hidden="true"
              >
                <i className={`bi ${hasFlashcards ? "bi-check-lg" : "bi-x-lg"}`}></i>
              </span>
            </button>
            );
          })}
        </div>
      </div>

      <div className="animate-fade-in">
        {orderedChapterGroups.length > 0 ? (
          orderedChapterGroups.map((chapterGroup, groupIndex) => {
            const chapterNumber = chapterGroup.chapterNumber;
            const chapterColor = chapterColors[((chapterNumber || groupIndex + 1) - 1) % chapterColors.length];
            return (
            <div
              key={chapterGroup.key}
              className="mb-5 animate-fade-in"
              style={{ animationDelay: `${Math.min(groupIndex * 70, 350)}ms` }}
            >
              <div className="mb-4">
                <div className="d-flex align-items-center justify-content-between">
                  <h5 className="fw-bold mb-0 text-dark-emphasis">
                    {chapterNumber ? `${chapterNumber}. ` : ""}
                    {chapterGroup.name}
                  </h5>
                  <span className="badge rounded-pill bg-light text-muted border px-3 py-2">{chapterGroup.cards.length} Cards</span>
                </div>
                <div className="mt-2 w-100 bg-secondary" style={{ height: '2px', opacity: 0.1 }}></div>
              </div>
              <div className="row g-4">
                {chapterGroup.cards.map((card, cardIndex) => (
                  <div
                    className="col-md-6 col-lg-4 animate-slide-up"
                    key={card.id}
                    style={{ animationDelay: `${Math.min(cardIndex * 60, 300)}ms` }}
                  >
                    <Flashcard
                      card={card}
                      colors={chapterColor}
                      flipped={flippedCards[card.id]}
                      onToggle={() => toggleCard(card.id)}
                    />
                  </div>
                ))}
              </div>
            </div>
            );
          })
        ) : (
          <div className="text-center py-5 mt-4">
            <div className="mb-3 text-muted" style={{ opacity: 0.5 }}>
              <i className="bi bi-stack" style={{ fontSize: '3.5rem' }}></i>
            </div>
            <h5 className="fw-medium text-dark-emphasis mb-2">Flashcards have not been generated yet.</h5>
            <p className="text-muted">
              For configuration and more details, please visit the <Link to="/settings" className="text-decoration-none fw-bold text-primary">Settings</Link> page.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const Flashcard = ({ card, colors, flipped, onToggle }) => (
  <div className="flashcard-container" style={{ height: '300px' }} onClick={onToggle}>
    <div className={`flashcard ${flipped ? 'flipped' : ''}`}>
      <div
        className="flashcard-front shadow-sm d-flex flex-column justify-content-center align-items-center"
        style={{
          background: colors.gradient,
          border: "none",
          boxShadow: `0 12px 28px ${colors.accent}35`,
        }}
      >
        <h5
          className="text-white mb-0 px-3 fw-bold text-center"
          style={{
            lineHeight: 1.55,
            fontSize: "clamp(1rem, 1.4vw, 1.25rem)",
            letterSpacing: "0.01em",
            overflowWrap: "anywhere",
          }}
        >
          {card.question}
        </h5>
        <div className="position-absolute bottom-0 start-0 w-100 pb-3 text-center">
          <span className="text-white-50" style={{ fontSize: '0.65rem', letterSpacing: '2px', fontWeight: 'bold' }}><i className="bi bi-arrow-repeat me-1"></i>CLICK TO REVEAL</span>
        </div>
      </div>
      <div
        className="flashcard-back shadow-sm"
        style={{
          background: `linear-gradient(145deg, ${colors.tint}, var(--bg-card, #ffffff))`,
          border: `1px solid ${colors.accent}45`,
          boxShadow: `0 12px 28px ${colors.accent}20`,
        }}
      >
        <span
          className="small mb-3 text-uppercase fw-bold ls-wide"
          style={{ color: colors.accent, fontSize: "0.72rem", letterSpacing: "0.12em" }}
        >
          The Insight
        </span>
        <p
          className="mb-0 fw-semibold px-2"
          style={{
            color: "var(--text-primary)",
            fontSize: "clamp(0.95rem, 1.2vw, 1.1rem)",
            lineHeight: 1.65,
            overflowWrap: "anywhere",
          }}
        >
          {card.answer}
        </p>
      </div>
    </div>
  </div>
);

export default FlashcardsPage;
