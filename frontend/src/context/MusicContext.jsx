import React, { createContext, useState, useEffect, useRef, useContext } from "react";
import { SettingsContext } from "./SettingsContext";

export const MusicContext = createContext();

export const MusicProvider = ({ children }) => {
  const { musicSettings, updateMusicSettings } = useContext(SettingsContext);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(musicSettings.volume);
  const [current, setCurrent] = useState(null);
  const [progress, setProgress] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState("none");
  const [isMuted, setIsMuted] = useState(false);
  const [likedSongs, setLikedSongs] = useState([]);
  const [history, setHistory] = useState([]);

  // Sync volume with SettingsContext (debounced via SettingsContext's own sync)
  useEffect(() => {
    if (volume !== musicSettings.volume) {
      updateMusicSettings({ volume });
    }
  }, [volume]);

  // Restore settings on load
  useEffect(() => {
    if (musicSettings.volume !== undefined) {
      setVolume(musicSettings.volume);
    }
  }, [musicSettings.volume]);

  const [currentTime, setCurrentTime] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [showMiniPlayer, setShowMiniPlayer] = useState(false);
  
  const audioRef = useRef(null);

  const staticTracks = [
    { id: 's-1', title: "Deep Space Focus", artist: "Stellar Sounds", category: "focus", duration: "6:12", cover: "bi-music-note-beamed", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
    { id: 's-2', title: "Ocean Waves & Lofi", artist: "Chill Study", category: "ambient", duration: "7:05", cover: "bi-water", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
    { id: 's-3', title: "Midnight Coding", artist: "Tech Beats", category: "lofi", duration: "5:44", cover: "bi-moon-stars", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" },
    { id: 's-4', title: "Rainy Cafe", artist: "Ambient Vibes", category: "ambient", duration: "5:02", cover: "bi-cloud-rain", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3" },
    { id: 's-5', title: "Productivity Boost", artist: "Focus Flow", category: "focus", duration: "5:53", cover: "bi-activity", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3" },
    { id: 's-6', title: "Morning Dew", artist: "Nature Sounds", category: "ambient", duration: "6:45", cover: "bi-tree", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3" },
    { id: 's-7', title: "Zen Garden", artist: "Relaxation", category: "ambient", duration: "8:10", cover: "bi-flower1", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3" },
    { id: 's-8', title: "Library Whispers", artist: "Study AM", category: "focus", duration: "7:22", cover: "bi-book", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3" },
    { id: 's-9', title: "Urban Study", artist: "City Lofi", category: "lofi", duration: "5:30", cover: "bi-building", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3" },
    { id: 's-10', title: "Brainwaves Alpha", artist: "Cognitive Focus", category: "focus", duration: "9:00", cover: "bi-soundwave", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3" },
    { id: 's-11', title: "Acoustic Sunset", artist: "Guitar Chill", category: "ambient", duration: "4:55", cover: "bi-music-note", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3" },
    { id: 's-12', title: "Deep Work Flow", artist: "Synthwave", category: "focus", duration: "6:20", cover: "bi-vinyl", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3" },
    { id: 's-13', title: "Classical Study", artist: "Mozart & Bach", category: "focus", duration: "10:15", cover: "bi-play-circle", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3" },
    { id: 's-14', title: "Binaural Beats", artist: "Mind Focus", category: "focus", duration: "8:40", cover: "bi-headphones", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3" },
    { id: 's-15', title: "Starry Night", artist: "Ambient Piano", category: "ambient", duration: "5:50", cover: "bi-stars", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3" }
  ];

  const [tracks, setTracks] = useState(staticTracks);

  useEffect(() => {
    const fetchJamendoAPI = async () => {
      try {
        const jamendoClientId = import.meta.env.VITE_JAMENDO_CLIENT_ID;
        if (!jamendoClientId) return;

        const queries = [
          { tag: 'lofi', limit: 30, category: 'lofi' },
          { tag: 'hindi', limit: 20, category: 'hindi' },
          { tag: 'english', limit: 20, category: 'english' },
          { tag: 'ambient', limit: 20, category: 'ambient' }
        ];

        const bannedWords = ["naked", "sex", "porn", "fuck", "shit", "bitch", "ass", "vulgar"];
        let allApiTracks = [];
        
        for (const query of queries) {
          try {
            const response = await fetch(`https://api.jamendo.com/v3.0/tracks/?client_id=${jamendoClientId}&format=json&limit=${query.limit}&tags=${query.tag}&audioformat=mp32&include=musicinfo`);
            const data = await response.json();
            
            if (data.results) {
              const mapped = data.results
                .filter(track => {
                  const title = (track.name || "").toLowerCase();
                  const artist = (track.artist_name || "").toLowerCase();
                  return !bannedWords.some(word => title.includes(word) || artist.includes(word));
                })
                .map((track) => {
                  const minutes = Math.floor(track.duration / 60);
                  const seconds = track.duration % 60;
                  return {
                    id: track.id,
                    title: track.name || "Unknown Track",
                    artist: track.artist_name || "Jamendo Artist",
                    duration: `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`, 
                    cover: "bi-music-note-list",
                    url: track.audio,
                    poster: track.image || track.album_image || null,
                    category: query.category,
                    language: query.tag === 'hindi' ? 'Hindi' : 'English'
                  };
                });
              allApiTracks = [...allApiTracks, ...mapped];
            }
          } catch (e) {
            console.error(`Failed to fetch ${query.tag}`, e);
          }
        }

        if (allApiTracks.length > 0) {
          setTracks(allApiTracks);
          setCurrent(null);
          setProgress(0);
          setCurrentTime(0);
          setHasStarted(false);
          setIsPlaying(false);
        }
      } catch (err) {
        console.error("Network error hitting Jamendo. Using fallback tracks.");
      }
    };

    fetchJamendoAPI();
  }, []);

  const nextTrack = () => {
    if (current === null) {
      setCurrent(0);
      setHasStarted(true);
      setShowMiniPlayer(true);
      return;
    }
    setCurrent((c) => (c + 1) % tracks.length);
    setProgress(0);
    setCurrentTime(0);
    setHasStarted(true);
    setShowMiniPlayer(true);
  };

  const prevTrack = () => {
    if (current === null) {
      setCurrent(0);
      setHasStarted(true);
      setShowMiniPlayer(true);
      return;
    }
    setCurrent((c) => (c - 1 + tracks.length) % tracks.length);
    setProgress(0);
    setCurrentTime(0);
    setHasStarted(true);
    setShowMiniPlayer(true);
  };

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(e => console.log("Audio play blocked by browser:", e));
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
      const currentProgress = (audioRef.current.currentTime / audioRef.current.duration) * 100;
      setProgress(currentProgress || 0);
      setCurrentTime(audioRef.current.currentTime || 0);
    }
  };

  const togglePlay = () => {
    if (current === null) {
      setCurrent(0);
      setHasStarted(true);
    }
    setShowMiniPlayer(true);
    setIsPlaying(!isPlaying);
  };

  const playTrack = (index) => {
    setCurrent(index);
    setIsPlaying(true);
    setHasStarted(true);
    setShowMiniPlayer(true);
    
    // Add to history
    const track = tracks[index];
    setHistory(prev => {
      const filtered = prev.filter(t => t.id !== track.id);
      return [track, ...filtered].slice(0, 50);
    });
  };

  const toggleLike = (track) => {
    setLikedSongs(prev => {
      const isLiked = prev.some(t => t.id === track.id);
      if (isLiked) {
        return prev.filter(t => t.id !== track.id);
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
        setVolume,
        current,
        setCurrent,
        progress,
        setProgress,
        currentTime,
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
          onTimeUpdate={handleTimeUpdate}
          onEnded={nextTrack}
        />
      )}
      {children}
    </MusicContext.Provider>
  );
};
