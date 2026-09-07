import React, { useState, useRef, useEffect } from "react";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
dayjs.extend(customParseFormat);

const GyaanTimePicker = ({ value, onChange, align = "left" }) => {
  const [show, setShow] = useState(false);
  const containerRef = useRef(null);

  // Sync internal state with external value prop
  const [internalTime, setInternalTime] = useState(() => {
    const d = dayjs(value, ["hh:mm A", "h:mm A", "HH:mm", "H:mm"]);
    return d.isValid() ? d : dayjs().hour(6).minute(0);
  });

  useEffect(() => {
    const valid = dayjs(value, ["hh:mm A", "h:mm A", "HH:mm", "H:mm"]);
    if (valid.isValid() && !valid.isSame(internalTime, 'minute')) {
      setInternalTime(valid);
    }
  }, [value]);

  useEffect(() => {
    const click = (e) => { if (containerRef.current && !containerRef.current.contains(e.target)) setShow(false); };
    if (show) document.addEventListener("mousedown", click);
    return () => document.removeEventListener("mousedown", click);
  }, [show]);

  const pushUpdate = (newT) => {
    setInternalTime(newT);
    onChange(newT.format("hh:mm A"));
  };

  const updateHour = (h) => {
    const isPM = internalTime.format("A") === "PM";
    let newH = parseInt(h);
    if (isPM && newH < 12) newH += 12;
    if (!isPM && newH === 12) newH = 0;
    pushUpdate(internalTime.hour(newH));
  };

  const updateMin = (m) => pushUpdate(internalTime.minute(parseInt(m)));
  const updatePeriod = (p) => {
    const h = internalTime.hour();
    let n = internalTime;
    if (p === "AM" && h >= 12) n = internalTime.hour(h - 12);
    else if (p === "PM" && h < 12) n = internalTime.hour(h + 12);
    pushUpdate(n);
  };

  const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
  const minutes = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'));

  return (
    <div className="gyaan-custom-time-picker" ref={containerRef} style={{ position: "relative", width: "100%", maxWidth: "200px" }}>
      <div className="sp-time-input-wrap" onClick={() => setShow(!show)} style={{ 
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px',
        background: '#f8fafc', borderRadius: '12px', border: '1.5px solid #eef2ff', cursor: 'pointer'
      }}>
        <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#1e293b' }}>{internalTime.format("hh:mm A")}</span>
        <i className="bi bi-clock" style={{ color: '#795548', fontSize: '1rem' }}></i>
      </div>

      {show && (
        <div className="time-popover-modern" style={{
          position: "absolute", top: "calc(100% + 8px)", left: align === "left" ? 0 : "auto", right: align === "right" ? 0 : "auto",
          zIndex: 1080, background: "white", borderRadius: "16px", boxShadow: "0 20px 50px rgba(0,0,0,0.15)",
          width: "180px", border: "1px solid #eef2ff", padding: "8px", animation: "sp-pop-in 0.2s"
        }}>
          <div className="d-flex gap-1" style={{ background: '#f8fafc', padding: '4px', borderRadius: '10px' }}>
            {[{ label: 'HH', data: hours, act: (v) => updateHour(v), fmt: 'hh' },
              { label: 'MM', data: minutes, act: (v) => updateMin(v), fmt: 'mm' },
              { label: '', data: ["AM", "PM"], act: (v) => updatePeriod(v), fmt: 'A' }].map((col, idx) => (
              <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: '0.6rem', fontWeight: 900, textAlign: 'center', padding: '2px', color: '#795548' }}>{col.label}</div>
                <div style={{ height: '110px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px', scrollbarWidth: 'none' }}>
                  {col.data.map(v => (
                    <div key={v} onClick={() => col.act(v)} style={{
                      padding: '6px 2px', textAlign: 'center', fontSize: '0.85rem', fontWeight: 700, borderRadius: '6px', cursor: 'pointer',
                      background: internalTime.format(col.fmt) === v ? '#795548' : 'transparent',
                      color: internalTime.format(col.fmt) === v ? 'white' : '#334155'
                    }}>{v}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes sp-pop-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .gyaan-custom-time-picker *::-webkit-scrollbar { width: 0; }
      `}</style>
    </div>
  );
};

export default GyaanTimePicker;
