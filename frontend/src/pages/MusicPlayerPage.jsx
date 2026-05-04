import React from 'react';
import MusicPlayer from '../components/MusicPlayer';

const MusicPlayerPage = () => {
  return (
    <div className="page-container" style={{ height: 'calc(100vh - 120px)' }}>
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Music Player</h1>
        <p className="page-subtitle">Relax and focus with study music</p>
      </div>
      
      <MusicPlayer />
    </div>
  );
};

export default MusicPlayerPage;

