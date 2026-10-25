import React, { useContext } from "react";
import { MusicContext } from "../context/MusicContext";
import { SettingsContext } from "../context/SettingsContext";

const MusicPlayer = () => {
  const { musicSettings, updateMusicSettings } = useContext(SettingsContext);
  const {
    isPlaying,
    volume,
    changeVolume,
    current,
    progress,
    currentTime,
    duration,
    seekTo,
    seekBy,
    shuffle,
    setShuffle,
    repeat,
    setRepeat,
    tracks,
    nextTrack,
    prevTrack,
    togglePlay,
    playTrack,
    isMuted,
    setIsMuted,
    hasStarted,
  } = useContext(MusicContext);

  const activeCategory = musicSettings.lastVibe || "all";

  const handleCategoryChange = (catId) => {
    updateMusicSettings({ lastVibe: catId });
  };

  const categories = [
    { id: "all", label: "All", icon: "bi-music-note-list" },
    { id: "lofi", label: "Lo-Fi", icon: "bi-disc" },
    { id: "hindi", label: "Hindi", icon: "bi-translate" },
    { id: "english", label: "English", icon: "bi-translate" },
    { id: "ambient", label: "Ambient", icon: "bi-cloud" },
  ];

  const currentTrack = hasStarted && current !== null ? tracks[current] : tracks[0];
  const trackDuration =
    duration ||
    (() => {
      const [minutes, seconds] = (currentTrack?.duration || "0:00").split(":").map(Number);
      return minutes * 60 + seconds;
    })();
  const formatTime = (time) =>
    `${Math.floor(time / 60)}:${Math.floor(time % 60).toString().padStart(2, "0")}`;

  return (
    <div className="d-flex flex-column h-100">
      {/* Player Controls - Restored Simpler Design */}
      <div className="card mb-4 border shadow-sm" style={{ padding: "1.5rem", background: "white" }}>
        <div className="row align-items-center">
          {/* Album Art */}
          <div className="col-md-4 mb-3 mb-md-0">
            <div className="d-flex align-items-center gap-3">
              <div
                className="rounded d-flex align-items-center justify-content-center shadow-sm"
                style={{
                  width: "80px",
                  height: "80px",
                  background: "var(--gradient-primary)",
                  flexShrink: 0,
                  overflow: "hidden",
                }}
              >
                {currentTrack.poster ? (
                  <img src={currentTrack.poster} alt="Cover" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <i className={`bi ${currentTrack.cover} text-white`} style={{ fontSize: "2rem" }}></i>
                )}
              </div>
              <div>
                <h5 className="mb-0 fw-bold text-dark text-truncate" style={{ maxWidth: "200px" }}>
                  {currentTrack.title}
                </h5>
                <p className="mb-1 text-muted small text-truncate" style={{ maxWidth: "200px" }}>
                  {currentTrack.artist}
                </p>
                <span className="badge bg-light text-muted fw-normal" style={{ fontSize: "0.75rem" }}>
                  {formatTime(trackDuration)}
                </span>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="col-md-5 text-center">
            <div className="d-flex justify-content-center align-items-center gap-3 mb-3">
              <button
                className="btn btn-link p-0 text-muted"
                onClick={() => setShuffle(!shuffle)}
                style={{ color: shuffle ? "var(--primary)" : "" }}
              >
                <i className="bi bi-shuffle fs-5"></i>
              </button>
              <button className="btn btn-link p-0 text-dark" onClick={prevTrack}>
                <i className="bi bi-skip-backward-fill fs-3"></i>
              </button>
              <button
                className="btn d-flex align-items-center justify-content-center shadow"
                onClick={togglePlay}
                style={{ width: "55px", height: "55px", background: "var(--gradient-primary)", borderRadius: "50%", color: "white" }}
              >
                <i className={`bi ${isPlaying ? "bi-pause-fill" : "bi-play-fill"} fs-2`}></i>
              </button>
              <button className="btn btn-link p-0 text-dark" onClick={nextTrack}>
                <i className="bi bi-skip-forward-fill fs-3"></i>
              </button>
              <button
                className="btn btn-link p-0 text-muted"
                onClick={() =>
                  setRepeat(
                    repeat === "none" ? "all" : repeat === "all" ? "one" : "none",
                  )
                }
                title={`Repeat ${repeat}`}
                style={{ color: repeat !== "none" ? "var(--primary)" : "" }}
              >
                <i className={`bi ${repeat === "one" ? "bi-repeat-1" : "bi-repeat"} fs-5`}></i>
              </button>
            </div>

            {/* Progress Bar */}
            <div className="d-flex align-items-center gap-2 px-3">
              <span className="text-muted small" style={{ width: "35px" }}>
                {formatTime(currentTime)}
              </span>
              <button
                className="btn btn-link p-0 text-muted music-seek-button"
                onClick={() => seekBy(-10)}
                aria-label="Back 10 seconds"
                title="Back 10 seconds"
              >
                <i className="bi bi-rewind-fill"></i>
              </button>
              <input
                aria-label="Seek music"
                className="music-seek-range flex-grow-1"
                type="range"
                min="0"
                max={trackDuration || 1}
                step="0.5"
                value={Math.min(currentTime, trackDuration || currentTime)}
                onChange={(event) => seekTo(Number(event.target.value))}
                style={{ "--music-progress": `${progress}%` }}
              />
              <button
                className="btn btn-link p-0 text-muted music-seek-button"
                onClick={() => seekBy(10)}
                aria-label="Forward 10 seconds"
                title="Forward 10 seconds"
              >
                <i className="bi bi-fast-forward-fill"></i>
              </button>
              <span className="text-muted small" style={{ width: "35px" }}>
                {formatTime(trackDuration)}
              </span>
            </div>
          </div>

          {/* Volume */}
          <div className="col-md-3">
            <div className="d-flex align-items-center justify-content-end gap-3 pe-3">
              <button 
                className="btn btn-link p-0 text-muted" 
                onClick={() => setIsMuted(!isMuted)}
                style={{ transition: 'color 0.2s' }}
              >
                <i className={`bi ${isMuted ? "bi-volume-mute-fill text-danger" : "bi-volume-down-fill"} fs-4`}></i>
              </button>
              <input
                type="range"
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  changeVolume(e.target.value);
                  if (isMuted) setIsMuted(false);
                }}
                className="form-range music-volume-range"
                style={{ width: "100px", accentColor: "#795548" }}
              />
              <i className="bi bi-volume-up-fill text-muted fs-4"></i>
            </div>
          </div>
        </div>
      </div>

      {/* Playlist */}
      <div className="card flex-grow-1 border shadow-sm" style={{ background: "white", padding: "1.5rem", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {/* Categories */}
        <div className="d-flex gap-2 mb-4 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryChange(cat.id)}
              className="btn btn-sm py-2 px-3 rounded-pill"
              style={{
                background: activeCategory === cat.id ? "var(--gradient-primary)" : "#f8f9fa",
                border: "none",
                color: activeCategory === cat.id ? "white" : "#6c757d",
                fontSize: "0.85rem",
                fontWeight: "500",
                transition: "all 0.2s"
              }}
            >
              <i className={`bi ${cat.icon} me-2`}></i>
              {cat.label}
            </button>
          ))}
        </div>

        {/* Track List Table */}
        <div className="flex-grow-1 custom-music-scroll" style={{ overflowY: "auto", paddingRight: "10px" }}>
          <table className="table table-hover align-middle mb-0" style={{ tableLayout: "fixed" }}>
            <thead>
              <tr className="text-muted small">
                <th className="border-0" style={{ width: "50px" }}>#</th>
                <th className="border-0" style={{ width: "45%" }}>Track</th>
                <th className="border-0 d-none d-md-table-cell" style={{ width: "35%" }}>Artist</th>
                <th className="border-0 text-end pe-4" style={{ width: "80px" }}>Duration</th>
              </tr>
            </thead>
            <tbody>
              {tracks.filter(t => activeCategory === "all" || t.category === activeCategory).map((track, idx) => {
                const globalIndex = tracks.findIndex(gt => gt.id === track.id);
                return (
                  <tr
                    key={track.id}
                    onClick={() => playTrack(globalIndex)}
                    style={{ cursor: "pointer" }}
                    className={current === globalIndex ? "table-light" : ""}
                  >
                    <td className="border-0 text-muted" style={{ width: "40px" }}>
                      {current === globalIndex && isPlaying ? (
                        <i className="bi bi-play-fill text-primary fs-5"></i>
                      ) : (
                        idx + 1
                      )}
                    </td>
                    <td className="border-0">
                      <div className="d-flex align-items-center gap-2">
                        <img 
                          src={track.poster || "https://via.placeholder.com/40"} 
                          alt="" 
                          className="rounded" 
                          style={{ width: "35px", height: "35px", objectFit: "cover" }} 
                        />
                        <div className="text-truncate" style={{ maxWidth: "200px" }}>
                          <span className={`fw-semibold ${current === globalIndex ? "text-primary" : "text-dark"}`}>
                            {track.title}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="border-0 text-muted d-none d-md-table-cell text-truncate">
                      {track.artist}
                    </td>
                    <td className="border-0 text-muted text-end small pe-4">
                      {track.duration}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <style>{`
        .custom-music-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .custom-music-scroll::-webkit-scrollbar-track {
          background: rgba(0,0,0,0.02);
          border-radius: 10px;
        }
        .custom-music-scroll::-webkit-scrollbar-thumb {
          background: rgba(121, 85, 72, 0.2);
          border-radius: 10px;
        }
        .custom-music-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(121, 85, 72, 0.4);
        }
        .table-light {
          background-color: rgba(121, 85, 72, 0.05) !important;
        }
      `}</style>
    </div>
  );
};

export default MusicPlayer;
