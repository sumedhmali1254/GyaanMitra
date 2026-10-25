import React, {
  createContext,
  useState,
  useEffect,
  useRef,
  useContext,
  useCallback,
} from "react";
import { SettingsContext } from "./SettingsContext";
import { AuthContext } from "./AuthContext";

const MUSIC_STORAGE_KEY = "gyaanmitra_music_state";

const getTrackDuration = (track) => {
  const [minutes, seconds] = (track?.duration || "0:00").split(":").map(Number);
  return Number.isFinite(minutes) && Number.isFinite(seconds)
    ? minutes * 60 + seconds
    : 0;
};

const readSavedMusic = () => {
  try {
    return JSON.parse(localStorage.getItem(MUSIC_STORAGE_KEY) || "null");
  } catch (error) {
    console.error("Unable to restore music state:", error);
    return null;
  }
};

const noop = () => {};
const EMPTY_MUSIC_CONTEXT = {
  isPlaying: false,
  setIsPlaying: noop,
  volume: 0,
  setVolume: noop,
  changeVolume: noop,
  current: null,
  setCurrent: noop,
  progress: 0,
  setProgress: noop,
  currentTime: 0,
  duration: 0,
  seekTo: noop,
  seekBy: noop,
  shuffle: false,
  setShuffle: noop,
  repeat: "none",
  setRepeat: noop,
  tracks: [],
  nextTrack: noop,
  prevTrack: noop,
  togglePlay: noop,
  playTrack: noop,
  toggleLike: noop,
  likedSongs: [],
  history: [],
  isMuted: false,
  setIsMuted: noop,
  hasStarted: false,
  showMiniPlayer: false,
  setShowMiniPlayer: noop,
};

export const MusicContext = createContext(EMPTY_MUSIC_CONTEXT);

export const MusicProvider = ({ children }) => {
  const { musicSettings, updateMusicSettings } = useContext(SettingsContext);
  const { user, loading: authLoading } = useContext(AuthContext);
  const [restoredMusic] = useState(readSavedMusic);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volumeOverride, setVolumeOverride] = useState(
    restoredMusic?.volume === undefined ? null : Number(restoredMusic.volume),
  );
  const volume = volumeOverride ?? (Number(musicSettings.volume) || 0);
  const [progress, setProgress] = useState(restoredMusic?.progress ?? 0);
  const [duration, setDuration] = useState(restoredMusic?.duration ?? 0);
  const [shuffle, setShuffle] = useState(restoredMusic?.shuffle ?? false);
  const [repeat, setRepeat] = useState(restoredMusic?.repeat || "none");
  const [isMuted, setIsMuted] = useState(restoredMusic?.isMuted ?? false);
  const [likedSongs, setLikedSongs] = useState(restoredMusic?.likedSongs || []);
  const [history, setHistory] = useState(restoredMusic?.history || []);
  const [currentTime, setCurrentTime] = useState(restoredMusic?.currentTime ?? 0);
  const [showMiniPlayer, setShowMiniPlayer] = useState(
    restoredMusic?.showMiniPlayer ?? false,
  );
  const [hasStarted, setHasStarted] = useState(restoredMusic?.hasStarted ?? false);
  const pendingSeekRef = useRef(restoredMusic?.currentTime ?? 0);
  const activeTrackRef = useRef(restoredMusic?.track || null);

  const changeVolume = useCallback(
    (value) => {
      const nextVolume = Math.min(100, Math.max(0, Number(value) || 0));
      setVolumeOverride(nextVolume);
      if (nextVolume !== Number(musicSettings.volume)) {
        updateMusicSettings({ volume: nextVolume });
      }
    },
    [musicSettings.volume, updateMusicSettings],
  );

  const audioRef = useRef(null);

  const staticTracks = [
    {
      id: "s-1",
      title: "Deep Space Focus",
      artist: "Stellar Sounds",
      category: "focus",
      duration: "6:12",
      cover: "bi-music-note-beamed",
      url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    },
    {
      id: "s-2",
      title: "Ocean Waves & Lofi",
      artist: "Chill Study",
      category: "ambient",
      duration: "7:05",
      cover: "bi-water",
      url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    },
    {
      id: "s-3",
      title: "Midnight Coding",
      artist: "Tech Beats",
      category: "lofi",
      duration: "5:44",
      cover: "bi-moon-stars",
      url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    },
    {
      id: "s-4",
      title: "Rainy Cafe",
      artist: "Ambient Vibes",
      category: "ambient",
      duration: "5:02",
      cover: "bi-cloud-rain",
      url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    },
    {
      id: "s-5",
      title: "Productivity Boost",
      artist: "Focus Flow",
      category: "focus",
      duration: "5:53",
      cover: "bi-activity",
      url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
    },
    {
      id: "s-6",
      title: "Morning Dew",
      artist: "Nature Sounds",
      category: "ambient",
      duration: "6:45",
      cover: "bi-tree",
      url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3",
    },
    {
      id: "s-7",
      title: "Zen Garden",
      artist: "Relaxation",
      category: "ambient",
      duration: "8:10",
      cover: "bi-flower1",
      url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3",
    },
    {
      id: "s-8",
      title: "Library Whispers",
      artist: "Study AM",
      category: "focus",
      duration: "7:22",
      cover: "bi-book",
      url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
    },
    {
      id: "s-9",
      title: "Urban Study",
      artist: "City Lofi",
      category: "lofi",
      duration: "5:30",
      cover: "bi-building",
      url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3",
    },
    {
      id: "s-10",
      title: "Brainwaves Alpha",
      artist: "Cognitive Focus",
      category: "focus",
      duration: "9:00",
      cover: "bi-soundwave",
      url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3",
    },
    {
      id: "s-11",
      title: "Acoustic Sunset",
      artist: "Guitar Chill",
      category: "ambient",
      duration: "4:55",
      cover: "bi-music-note",
      url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3",
    },
    {
      id: "s-12",
      title: "Deep Work Flow",
      artist: "Synthwave",
      category: "focus",
      duration: "6:20",
      cover: "bi-vinyl",
      url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3",
    },
    {
      id: "s-13",
      title: "Classical Study",
      artist: "Mozart & Bach",
      category: "focus",
      duration: "10:15",
      cover: "bi-play-circle",
      url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3",
    },
    {
      id: "s-14",
      title: "Binaural Beats",
      artist: "Mind Focus",
      category: "focus",
      duration: "8:40",
      cover: "bi-headphones",
      url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3",
    },
    {
      id: "s-15",
      title: "Starry Night",
      artist: "Ambient Piano",
      category: "ambient",
      duration: "5:50",
      cover: "bi-stars",
      url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3",
    },
  ];

  const [tracks, setTracks] = useState(() => {
    const savedTrack = restoredMusic?.track;
    if (
      savedTrack?.url &&
      !staticTracks.some((track) => track.id === savedTrack.id)
    ) {
      return [...staticTracks, savedTrack];
    }
    return staticTracks;
  });
  const [current, setCurrent] = useState(() => {
    const savedTrackId = restoredMusic?.track?.id;
    if (savedTrackId === undefined) return null;
    const savedTrackIndex = tracks.findIndex((track) => track.id === savedTrackId);
    return savedTrackIndex >= 0 ? savedTrackIndex : null;
  });

  useEffect(() => {
    if (authLoading || user) return;
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
  }, [authLoading, user]);

  const selectTrack = useCallback((index, autoplay = true) => {
    const track = tracks[index];
    if (!track) return;
    activeTrackRef.current = track;
    pendingSeekRef.current = 0;
    setCurrent(index);
    setCurrentTime(0);
    setProgress(0);
    setDuration(getTrackDuration(track));
    setHasStarted(true);
    setShowMiniPlayer(true);
    setIsPlaying(autoplay);
  }, [tracks]);

  useEffect(() => {
    if (current === null || !tracks[current]) return;
    activeTrackRef.current = tracks[current];
  }, [current, tracks]);

  useEffect(() => {
    try {
      localStorage.setItem(
        MUSIC_STORAGE_KEY,
        JSON.stringify({
          isPlaying,
          volume,
          progress,
          duration,
          currentTime,
          shuffle,
          repeat,
          isMuted,
          likedSongs,
          history,
          showMiniPlayer,
          hasStarted,
          track: activeTrackRef.current,
        }),
      );
    } catch (error) {
      console.error("Unable to save music state:", error);
    }
  }, [
    isPlaying,
    volume,
    progress,
    duration,
    currentTime,
    shuffle,
    repeat,
    isMuted,
    likedSongs,
    history,
    showMiniPlayer,
    hasStarted,
  ]);

  useEffect(() => {
    const fetchJamendoAPI = async () => {
      try {
        const jamendoClientId = import.meta.env.VITE_JAMENDO_CLIENT_ID;
        if (!jamendoClientId) return;

        const queries = [
          { tag: "lofi", limit: 30, category: "lofi" },
          { tag: "hindi", limit: 20, category: "hindi" },
          { tag: "english", limit: 20, category: "english" },
          { tag: "ambient", limit: 20, category: "ambient" },
        ];

        const bannedWords = [
          "naked",
          "sex",
          "porn",
          "fuck",
          "shit",
          "bitch",
          "ass",
          "vulgar",
        ];
        const requests = await Promise.allSettled(
          queries.map(async (query) => {
            const params = new URLSearchParams({
              client_id: jamendoClientId,
              format: "json",
              limit: String(query.limit),
              tags: query.tag,
              audioformat: "mp32",
              include: "musicinfo",
            });
            const response = await fetch(
              `https://api.jamendo.com/v3.0/tracks/?${params}`,
              { signal: AbortSignal.timeout(12000) },
            );
            if (!response.ok) {
              throw new Error(`Jamendo ${query.tag} request failed (${response.status}).`);
            }
            const data = await response.json();
            return (data.results || [])
              .filter((track) => {
                const title = (track.name || "").toLowerCase();
                const artist = (track.artist_name || "").toLowerCase();
                return (
                  track.audio &&
                  Number.isFinite(Number(track.duration)) &&
                  Number(track.duration) > 0 &&
                  !bannedWords.some(
                    (word) => title.includes(word) || artist.includes(word),
                  )
                );
              })
              .map((track) => {
                const minutes = Math.floor(track.duration / 60);
                const seconds = track.duration % 60;
                return {
                  id: track.id,
                  title: track.name || "Unknown Track",
                  artist: track.artist_name || "Jamendo Artist",
                  duration: `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`,
                  cover: "bi-music-note-list",
                  url: track.audio,
                  poster: track.image || track.album_image || null,
                  category: query.category,
                  language: query.tag === "hindi" ? "Hindi" : "English",
                };
              });
          }),
        );
        const apiTracks = requests.flatMap((result) => {
          if (result.status === "fulfilled") return result.value;
          console.warn("A Jamendo track category could not be loaded:", result.reason);
          return [];
        });
        if (apiTracks.length > 0) {
          setTracks((existingTracks) => {
            const existingIds = new Set(existingTracks.map((track) => track.id));
            return [
              ...existingTracks,
              ...apiTracks.filter((track) => !existingIds.has(track.id)),
            ];
          });
        }
      } catch (error) {
        console.error("Unable to load Jamendo tracks; using the built-in playlist.", error);
      }
    };

    fetchJamendoAPI();
  }, []);

  const nextTrack = useCallback(() => {
    if (tracks.length === 0) return;
    if (current === null) {
      selectTrack(0);
      return;
    }
    if (shuffle && tracks.length > 1) {
      const candidates = tracks.map((_, index) => index).filter((index) => index !== current);
      selectTrack(candidates[Math.floor(Math.random() * candidates.length)]);
      return;
    }
    if (current === tracks.length - 1 && repeat === "none") {
      setIsPlaying(false);
      return;
    }
    selectTrack((current + 1) % tracks.length);
  }, [current, repeat, selectTrack, shuffle, tracks]);

  const prevTrack = useCallback(() => {
    if (tracks.length === 0) return;
    if (current === null) {
      selectTrack(0);
      return;
    }
    if (currentTime > 3 && audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      setProgress(0);
      return;
    }
    selectTrack((current - 1 + tracks.length) % tracks.length);
  }, [current, currentTime, selectTrack, tracks]);

  const handleEnded = useCallback(() => {
    if (repeat === "one" && audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      setProgress(0);
      audioRef.current.play().catch((error) => {
        console.warn("Unable to replay the current track:", error);
        setIsPlaying(false);
      });
      return;
    }
    nextTrack();
  }, [nextTrack, repeat]);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current
          .play()
          .catch((error) => {
            if (error.name !== "NotAllowedError") {
              console.error("Music playback failed:", error);
            }
            setIsPlaying(false);
          });
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, current]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume / 100;
    }
  }, [volume, current, isMuted]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const currentProgress =
        (audioRef.current.currentTime / audioRef.current.duration) * 100;
      setProgress(currentProgress || 0);
      setCurrentTime(audioRef.current.currentTime || 0);
    }
  };

  const seekTo = useCallback((time) => {
    const audio = audioRef.current;
    const mediaDuration =
      Number.isFinite(audio?.duration) && audio.duration > 0
        ? audio.duration
        : duration || getTrackDuration(tracks[current]);
    if (!Number.isFinite(mediaDuration) || mediaDuration <= 0) return;
    const nextTime = Math.min(mediaDuration, Math.max(0, Number(time) || 0));
    if (audio && audio.readyState >= 1 && Number.isFinite(audio.duration)) {
      audio.currentTime = nextTime;
    }
    pendingSeekRef.current = nextTime;
    setCurrentTime(nextTime);
    setProgress((nextTime / mediaDuration) * 100);
  }, [current, duration, tracks]);

  const togglePlay = () => {
    if (current === null) {
      activeTrackRef.current = tracks[0] || null;
      setCurrent(0);
      setHasStarted(true);
    }
    setShowMiniPlayer(true);
    setIsPlaying(!isPlaying);
  };

  const playTrack = (index) => {
    if (!tracks[index]) return;
    selectTrack(index);

    // Add to history
    const track = tracks[index];
    setHistory((prev) => {
      const filtered = prev.filter((t) => t.id !== track.id);
      return [track, ...filtered].slice(0, 50);
    });
  };

  const toggleLike = (track) => {
    setLikedSongs((prev) => {
      const isLiked = prev.some((t) => t.id === track.id);
      if (isLiked) {
        return prev.filter((t) => t.id !== track.id);
      } else {
        return [track, ...prev];
      }
    });
  };

  return (
    <MusicContext.Provider
      value={{
        isPlaying,
        setIsPlaying,
        volume,
        setVolume: changeVolume,
        changeVolume,
        current,
        setCurrent,
        progress,
        setProgress,
        currentTime,
        duration,
        seekTo,
        seekBy: (seconds) => seekTo(currentTime + seconds),
        shuffle,
        setShuffle,
        repeat,
        setRepeat,
        tracks,
        nextTrack,
        prevTrack,
        togglePlay,
        playTrack,
        toggleLike,
        likedSongs,
        history,
        isMuted,
        setIsMuted,
        hasStarted,
        showMiniPlayer,
        setShowMiniPlayer,
      }}
    >
      {current !== null && (
        <audio
          ref={audioRef}
          src={tracks[current].url}
          onLoadedMetadata={() => {
            if (audioRef.current) {
              const loadedDuration = audioRef.current.duration;
              const resolvedDuration = Number.isFinite(loadedDuration)
                ? loadedDuration
                : getTrackDuration(tracks[current]);
              setDuration(resolvedDuration);
              if (pendingSeekRef.current > 0) {
                audioRef.current.currentTime = Math.min(
                  pendingSeekRef.current,
                  resolvedDuration || pendingSeekRef.current,
                );
              }
              pendingSeekRef.current = 0;
            }
          }}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          onError={(event) => {
            console.error("The selected music track could not be played.", event.currentTarget.error);
            setIsPlaying(false);
          }}
        />
      )}
      {children}
    </MusicContext.Provider>
  );
};
