import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useSettings } from "../context/SettingsContext";
import toast from "react-hot-toast";
import api from "../services/api";

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
        setAllFlashcards(Array.isArray(response.data.flashcards) ? response.data.flashcards : []);
      }
    } catch (error) {
      console.warn("Flashcards fetching paused - check server connectivity or card existence.", error.message);
    }
  };

  const toggleCard = (id) => {
    setFlippedCards(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const tabList = (syllabusData || [])
    .filter(s => s.source === preferredFlashcardSource)
    .map(s => s.courseTitle);

  useEffect(() => {
    if (tabList.length > 0 && (!activeSubjectId || !tabList.includes(activeSubjectId))) {
      setActiveSubjectId(tabList[0]);
    }
  }, [tabList, activeSubjectId]);

  const subjectCards = allFlashcards.filter(c => c.subject === activeSubjectId);
  const activeSyllabus = (syllabusData || []).find(s => s.courseTitle === activeSubjectId);

  const orderedChapters = activeSyllabus?.chapters || [];
  const processedCardIds = new Set();
  const finalGroups = [];

  // 1. Group by Syllabus Order
  orderedChapters.forEach((ch, idx) => {
    const chFormatted = `Ch ${idx + 1}: ${ch.name}`;
    const matchingCards = subjectCards.filter(c => {
      const cardCh = c.chapter || "";
      const chName = ch.name || "";
      const isMatch = cardCh === chFormatted || cardCh === chName || (chName && cardCh.includes(chName));
      if (isMatch) processedCardIds.add(c.id);
      return isMatch;
    });

    if (matchingCards.length > 0) {
      finalGroups.push({ title: chFormatted, cards: matchingCards });
    }
  });

  // 2. Catch Orphaned Cards
  const orphanedCards = subjectCards.filter(c => !processedCardIds.has(c.id));
  if (orphanedCards.length > 0) {
    const orphanedGroups = orphanedCards.reduce((acc, card) => {
      const chName = card.chapter || "Uncategorized";
      if (!acc[chName]) acc[chName] = [];
      acc[chName].push(card);
      return acc;
    }, {});

    Object.entries(orphanedGroups).forEach(([title, cards]) => {
      finalGroups.push({ title, cards });
    });
  }

  return (
    <div className="page-container" style={{ minHeight: '100vh', paddingBottom: '5rem' }}>
      <div className="page-header mb-5">
        <div className="d-flex justify-content-between align-items-end mb-4 flex-wrap gap-3">
          <div>
            <h1 className="page-title fw-bold mb-1">Flashcards</h1>
            <p className="page-subtitle text-muted small">Viewing your <strong>{preferredFlashcardSource?.toUpperCase()}</strong> collection</p>
          </div>
        </div>

        <div className="d-flex gap-2 overflow-auto pb-2 scroll-hide flex-nowrap" style={{ whiteSpace: 'nowrap' }}>
          {tabList.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveSubjectId(tab)}
              className={`btn px-4 py-2 rounded-pill fw-bold transition-all text-nowrap flex-shrink-0 ${activeSubjectId === tab ? 'btn-primary shadow-sm' : 'btn-light text-muted border'}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="animate-fade-in">
        {finalGroups.length > 0 ? (
          finalGroups.map((group, idx) => (
            <div key={idx} className="mb-5">
              <div className="mb-4">
                <div className="d-flex align-items-center justify-content-between">
                  <h5 className="fw-bold mb-0 text-dark-emphasis">{group.title}</h5>
                  <span className="badge rounded-pill bg-light text-muted border px-3 py-2">{group.cards.length} Cards</span>
                </div>
                <div className="mt-2 w-100 bg-secondary" style={{ height: '2px', opacity: 0.1 }}></div>
              </div>
              <div className="row g-4">
                {group.cards.map(card => (
                  <div className="col-md-6 col-lg-4" key={card.id}>
                    <Flashcard card={card} flipped={flippedCards[card.id]} onToggle={() => toggleCard(card.id)} />
                  </div>
                ))}
              </div>
            </div>
          ))
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

const Flashcard = ({ card, flipped, onToggle }) => (
  <div className="flashcard-container" style={{ height: '300px' }} onClick={onToggle}>
    <div className={`flashcard ${flipped ? 'flipped' : ''}`}>
      <div className="flashcard-front shadow-sm d-flex flex-column justify-content-center align-items-center">
        <h5 className="text-white mb-0 px-3 fw-bold text-center" style={{ lineHeight: 1.5 }}>{card.question}</h5>
        <div className="position-absolute bottom-0 start-0 w-100 pb-3 text-center">
          <span className="text-white-50" style={{ fontSize: '0.65rem', letterSpacing: '2px', fontWeight: 'bold' }}><i className="bi bi-arrow-repeat me-1"></i>CLICK TO REVEAL</span>
        </div>
      </div>
      <div className="flashcard-back shadow-sm">
        <span className="text-primary small mb-3 text-uppercase fw-bold ls-wide" style={{ fontSize: '0.7rem' }}>The Insight</span>
        <p className="text-dark mb-0 fs-6 fw-bold px-2">{card.answer}</p>
        <div className="position-absolute bottom-0 start-0 w-100 pb-4">
          <div className="bg-white border d-inline-block px-3 py-1 rounded-pill text-muted shadow-sm" style={{ fontSize: '0.65rem', fontWeight: '800', letterSpacing: '0.5px' }}>
            {card.chapter?.toUpperCase() || "GENERAL"}
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default FlashcardsPage;
