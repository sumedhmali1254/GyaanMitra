import React, { useState, useEffect } from "react";
import "./NoteModal.css";
import api from "../services/api";
import toast from "react-hot-toast";

const NotesTodoPage = () => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState("");
  const [category, setCategory] = useState("study");
  const [filter, setFilter] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const response = await api.get("/notes");
      if (response.data.success) {
        setNotes(response.data.data);
      }
    } catch (error) {
      console.warn("Notes sync deferred - server unreachable or no data yet.", error.message);
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { value: "study", label: "Study", icon: "bi-book", color: "primary" },
    {
      value: "assignment",
      label: "Assignment",
      icon: "bi-file-text",
      color: "warning",
    },
    {
      value: "personal",
      label: "Personal",
      icon: "bi-person",
      color: "success",
    },
    { value: "reminder", label: "Reminder", icon: "bi-bell", color: "info" },
  ];

  const addNote = async () => {
    if (!newNote.trim()) return;
    
    const tid = toast.loading("Saving note...");
    try {
      const response = await api.post("/notes", {
        text: newNote,
        category: category
      });
      
      if (response.data.success) {
        setNotes([response.data.data, ...notes]);
        setNewNote("");
        setShowAddModal(false);
        toast.success("Note added!", { id: tid });
      }
    } catch (error) {
      toast.error("Failed to save note", { id: tid });
    }
  };

  const toggleDone = async (id) => {
    const note = notes.find(n => n.id === id);
    if (!note) return;

    try {
      const response = await api.put(`/notes/${id}`, {
        done: !note.done
      });
      if (response.data.success) {
        setNotes(notes.map(n => n.id === id ? response.data.data : n));
      }
    } catch (error) {
      toast.error("Update failed");
    }
  };

  const togglePin = async (id) => {
    const note = notes.find(n => n.id === id);
    if (!note) return;

    try {
      const response = await api.put(`/notes/${id}`, {
        pinned: !note.pinned
      });
      if (response.data.success) {
        setNotes(notes.map(n => n.id === id ? response.data.data : n));
      }
    } catch (error) {
      toast.error("Update failed");
    }
  };

  const deleteNote = async (id) => {
    const tid = toast.loading("Deleting...");
    try {
      const response = await api.delete(`/notes/${id}`);
      if (response.data.success) {
        setNotes(notes.filter((note) => note.id !== id));
        toast.success("Note deleted", { id: tid });
      }
    } catch (error) {
      toast.error("Delete failed", { id: tid });
    }
  };

  const filteredNotes = notes.filter((note) => {
    if (filter === "all") return true;
    if (filter === "completed") return note.done;
    if (filter === "pending") return !note.done;
    return note.category === filter;
  });

  const pinnedNotes = filteredNotes.filter((n) => n.pinned);
  const regularNotes = filteredNotes.filter((n) => !n.pinned);

  const getCategoryStyle = (cat) => {
    const catObj = categories.find((c) => c.value === cat);
    return {
      background: `var(--${catObj?.color || 'primary'})`,
      color: "white",
    };
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h1 className="page-title">Notes & To-Do</h1>
            <p className="page-subtitle">Organize your tasks and study notes</p>
          </div>
          <button
            className="btn"
            onClick={() => setShowAddModal(true)}
            style={{ background: "var(--gradient-primary)", color: "white" }}
          >
            <i className="bi bi-plus-lg me-2"></i>
            Add Note
          </button>
        </div>
      </div>

      {loading ? (
        <div className="notes-skeleton-container py-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="card mb-3 skeleton-note shimmer"
              style={{ padding: "1.5rem", height: "80px", border: "none", background: "var(--bg-secondary)" }}
            />
          ))}
          <p className="text-center text-muted small mt-2">Syncing your digital notebook...</p>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="row g-3 mb-4">
            <div className="col-6 col-md-3">
              <div className="stat-card" style={{ padding: "1rem" }}>
                <div className="d-flex align-items-center gap-3">
                  <div
                    className="stat-icon primary"
                    style={{ width: "40px", height: "40px", fontSize: "1rem" }}
                  >
                    <i className="bi bi-list-check"></i>
                  </div>
                  <div>
                    <div className="stat-value" style={{ fontSize: "1.5rem" }}>
                      {notes.length}
                    </div>
                    <div className="stat-label" style={{ fontSize: "0.75rem" }}>
                      Total
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="stat-card" style={{ padding: "1rem" }}>
                <div className="d-flex align-items-center gap-3">
                  <div
                    className="stat-icon success"
                    style={{ width: "40px", height: "40px", fontSize: "1rem" }}
                  >
                    <i className="bi bi-check-circle"></i>
                  </div>
                  <div>
                    <div className="stat-value" style={{ fontSize: "1.5rem" }}>
                      {notes.filter((n) => n.done).length}
                    </div>
                    <div className="stat-label" style={{ fontSize: "0.75rem" }}>
                      Completed
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="stat-card" style={{ padding: "1rem" }}>
                <div className="d-flex align-items-center gap-3">
                  <div
                    className="stat-icon warning"
                    style={{ width: "40px", height: "40px", fontSize: "1rem" }}
                  >
                    <i className="bi bi-hourglass-split"></i>
                  </div>
                  <div>
                    <div className="stat-value" style={{ fontSize: "1.5rem" }}>
                      {notes.filter((n) => !n.done).length}
                    </div>
                    <div className="stat-label" style={{ fontSize: "0.75rem" }}>
                      Pending
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="stat-card" style={{ padding: "1rem" }}>
                <div className="d-flex align-items-center gap-3">
                  <div
                    className="stat-icon info"
                    style={{ width: "40px", height: "40px", fontSize: "1rem" }}
                  >
                    <i className="bi bi-pin-angle"></i>
                  </div>
                  <div>
                    <div className="stat-value" style={{ fontSize: "1.5rem" }}>
                      {notes.filter((n) => n.pinned).length}
                    </div>
                    <div className="stat-label" style={{ fontSize: "0.75rem" }}>
                      Pinned
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="d-flex gap-2 flex-wrap mb-4">
            {[
              { value: "all", label: "All", icon: "bi-grid" },
              { value: "pending", label: "Pending", icon: "bi-clock" },
              { value: "completed", label: "Completed", icon: "bi-check2-circle" },
              ...categories,
            ].map((f) => (
              <button
                key={f.value}
                className={`btn py-2 px-3`}
                onClick={() => setFilter(f.value)}
                style={{
                  background:
                    filter === f.value
                      ? "var(--gradient-primary)"
                      : "var(--bg-secondary)",
                  border:
                    filter === f.value ? "none" : "1px solid rgba(255,255,255,0.1)",
                  color: filter === f.value ? "white" : "var(--text-primary)",
                  fontSize: "0.875rem",
                  transition: 'all 0.2s ease'
                }}
              >
                <i className={`bi ${f.icon} me-1`}></i>
                {f.label}
              </button>
            ))}
          </div>

          {/* Notes List */}
          {filteredNotes.length === 0 ? (
            <div className="text-center py-5">
              <i
                className="bi bi-journal-text"
                style={{ fontSize: "4rem", color: "var(--text-muted)" }}
              ></i>
              <p className="mt-3" style={{ color: "var(--text-muted)" }}>
                No notes yet. Add your first note!
              </p>
            </div>
          ) : (
            <>
              {/* Pinned Notes */}
              {pinnedNotes.length > 0 && (
                <div className="mb-4">
                  <h6 className="mb-3" style={{ color: "var(--text-muted)" }}>
                    <i className="bi bi-pin-angle me-2"></i>Pinned
                  </h6>
                  {pinnedNotes.map((note) => (
                    <NoteItem
                      key={note.id}
                      note={note}
                      onToggle={() => toggleDone(note.id)}
                      onPin={() => togglePin(note.id)}
                      onDelete={() => deleteNote(note.id)}
                      getCategoryStyle={getCategoryStyle}
                    />
                  ))}
                </div>
              )}

              {/* Regular Notes */}
              {regularNotes.map((note) => (
                <NoteItem
                  key={note.id}
                  note={note}
                  onToggle={() => toggleDone(note.id)}
                  onPin={() => togglePin(note.id)}
                  onDelete={() => deleteNote(note.id)}
                  getCategoryStyle={getCategoryStyle}
                />
              ))}
            </>
          )}
        </>
      )}

      {/* Add Note Modal */}
      {showAddModal && (
        <div className="note-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="note-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="note-modal-header">
              <h2>
                <i className="bi bi-journal-plus"></i>
                Add New Note
              </h2>
              <button className="modal-close-fab" onClick={() => setShowAddModal(false)}>
                <i className="bi bi-x"></i>
              </button>
            </div>
            <div className="note-modal-body">
              <div className="note-form-group">
                <label className="note-form-label">Note Content</label>
                <textarea
                  className="note-textarea"
                  placeholder="Analyze the physics of electromagnetic waves..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="note-form-group">
                <label className="note-form-label">Category</label>
                <div className="note-category-grid">
                  {categories.map((cat) => (
                    <div
                      key={cat.value}
                      className={`note-category-option ${category === cat.value ? "active" : ""}`}
                      onClick={() => setCategory(cat.value)}
                    >
                      <i className={`bi ${cat.icon}`}></i>
                      <span>{cat.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="note-modal-footer">
              <button className="note-btn note-btn-primary w-100" onClick={addNote}>
                <i className="bi bi-check-lg me-2"></i>
                Create Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const NoteItem = ({ note, onToggle, onPin, onDelete, getCategoryStyle }) => {
  return (
    <div
      className="card mb-3 animate-fade-in"
      style={{
        padding: "1rem 1.25rem",
        borderLeft: note.done
          ? "3px solid var(--success)"
          : "3px solid var(--primary)",
        opacity: note.done ? 0.7 : 1,
      }}
    >
      <div className="d-flex align-items-center">
        <div className="form-check me-3" style={{ transform: "scale(1.3)" }}>
          <input
            type="checkbox"
            checked={note.done}
            onChange={onToggle}
            className="form-check-input"
            style={{
              background: note.done ? "var(--success)" : "var(--bg-primary)",
              borderColor: "rgba(255,255,255,0.2)",
              cursor: 'pointer'
            }}
          />
        </div>

        <div className="flex-grow-1" style={{ cursor: 'pointer' }} onClick={onToggle}>
          <span
            style={{
              textDecoration: note.done ? "line-through" : "",
              color: note.done ? "var(--text-muted)" : "var(--text-primary)",
              fontSize: "1rem",
            }}
          >
            {note.text}
          </span>
          <span
            className="badge ms-2"
            style={{
              ...getCategoryStyle(note.category),
              fontSize: "0.7rem",
            }}
          >
            {note.category}
          </span>
        </div>

        <div className="d-flex gap-2">
          <button
            className="btn btn-sm"
            onClick={onPin}
            style={{
              background: "transparent",
              color: note.pinned ? "var(--warning)" : "var(--text-muted)",
            }}
          >
            <i className={`bi ${note.pinned ? "bi-pin-fill" : "bi-pin"}`}></i>
          </button>
          <button
            className="btn btn-sm"
            onClick={onDelete}
            style={{
              background: "transparent",
              color: "var(--danger)",
            }}
          >
            <i className="bi bi-trash"></i>
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotesTodoPage;
