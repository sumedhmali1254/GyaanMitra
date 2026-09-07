import React, { useState, useRef, useEffect } from "react";
import dayjs from "dayjs";

const GyaanCalendar = ({ value, onChange, minDate = dayjs(), placeholder = "Select Date" }) => {
  const [show, setShow] = useState(false);
  const [isUpside, setIsUpside] = useState(false);
  const [viewDate, setViewDate] = useState(value ? dayjs(value) : dayjs());
  const containerRef = useRef(null);
  const popoverRef = useRef(null);

  useEffect(() => {
    if (show && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setIsUpside(spaceBelow < 300);
    }
  }, [show]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setShow(false);
      }
    };
    if (show) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [show]);

  const daysInMonth = viewDate.daysInMonth();
  const startDay = viewDate.startOf("month").day();
  const currentMonthName = viewDate.format("MMMM YYYY");

  const days = [];
  for (let i = 0; i < (startDay === 0 ? 6 : startDay - 1); i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const handleDateClick = (day) => {
    const selected = viewDate.date(day).startOf('day');
    const minDay = dayjs(minDate).startOf('day');
    
    if (selected.isBefore(minDay)) return;

    onChange(selected.format("YYYY-MM-DD"));
    setShow(false);
  };

  const changeMonth = (offset) => {
    setViewDate(viewDate.add(offset, "month"));
  };

  return (
    <div className="gyaan-custom-calendar" ref={containerRef} style={{ position: "relative" }}>
      <div className="sp-input-with-icon" onClick={() => setShow(!show)}>
        <input
          type="text"
          className="sp-input"
          value={value ? dayjs(value).format("DD/MM/YYYY") : ""}
          placeholder={placeholder}
          readOnly
          style={{ cursor: "pointer", height: '42px' }}
        />
        <i className="bi bi-calendar-event sp-input-icon"></i>
      </div>

      {show && (
        <div className="calendar-popover" ref={popoverRef} style={{
          position: "absolute",
          [isUpside ? "bottom" : "top"]: "calc(100% + 8px)",
          left: 0,
          zIndex: 1050,
          background: "white",
          borderRadius: "16px",
          boxShadow: "0 25px 50px -12px rgba(121, 85, 72, 0.25)",
          padding: "20px",
          width: "300px",
          border: "1px solid #eef2ff",
          animation: "sp-fade-in 0.2s ease-out"
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', padding: '0 4px' }}>
            <button onClick={() => changeMonth(-1)} className="cal-btn"><i className="bi bi-chevron-left"></i></button>
            <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1e293b', letterSpacing: '-0.2px' }}>{currentMonthName}</span>
            <button onClick={() => changeMonth(1)} className="cal-btn"><i className="bi bi-chevron-right"></i></button>
          </div>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(7, 1fr)', 
            gap: '4px', 
            textAlign: 'center' 
          }}>
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
              <span key={`wd-${i}`} style={{ 
                fontSize: '0.7rem', 
                color: '#94a3b8', 
                fontWeight: 700, 
                paddingBottom: '10px',
                textTransform: 'uppercase'
              }}>{d}</span>
            ))}
            {days.map((day, idx) => {
              const currentDayObj = day ? viewDate.date(day).startOf('day') : null;
              const minDayObj = dayjs(minDate).startOf('day');
              const isDisabled = currentDayObj && currentDayObj.isBefore(minDayObj);
              const isSelected = currentDayObj && currentDayObj.format("YYYY-MM-DD") === value;
              const isToday = currentDayObj && currentDayObj.format("YYYY-MM-DD") === dayjs().format("YYYY-MM-DD");

              return (
                <div 
                  key={`day-${idx}`}
                  onClick={() => day && !isDisabled && handleDateClick(day)}
                  className={`cal-day ${day ? (isDisabled ? 'disabled' : 'active') : 'empty'} ${isSelected ? 'selected' : ''}`}
                  style={{
                    height: '34px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: (day && !isDisabled) ? 'pointer' : 'default',
                    fontSize: '0.85rem',
                    borderRadius: '10px',
                    transition: '0.2s all ease',
                    color: day ? (isDisabled ? '#cbd5e1' : '#334155') : 'transparent',
                    opacity: isDisabled ? 0.6 : 1,
                    fontWeight: isSelected ? '700' : '500',
                    background: isSelected ? '#795548' : 'transparent',
                    border: isToday ? '1px solid #795548' : 'none'
                  }}
                >
                  {day}
                </div>
              );
            })}
          </div>

          <div style={{ 
            marginTop: '16px', 
            paddingTop: '12px', 
            borderTop: '1.5px solid #f1f5f9',
            display: 'flex',
            justifyContent: 'center'
          }}>
            <button 
              onClick={() => {
                const today = dayjs();
                setViewDate(today);
                onChange(today.format("YYYY-MM-DD"));
                setShow(false);
              }}
              style={{
                background: '#eef2ff',
                border: 'none',
                color: '#795548',
                padding: '6px 20px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: '0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#795548';
                e.currentTarget.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#eef2ff';
                e.currentTarget.style.color = '#795548';
              }}
            >
              Today
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes sp-fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .cal-btn { background: #f8fafc; border: 1.5px solid #eef2ff; cursor: pointer; color: #64748b; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 10px; transition: 0.2s; }
        .cal-btn:hover { background: #eef2ff; color: #795548; border-color: #795548; }
        .cal-day.active:hover { background: #f1f5fa; color: #795548; transform: scale(1.05); }
        .cal-day.selected { color: white !important; box-shadow: 0 4px 12px rgba(121, 85, 72, 0.4); }
      `}</style>
    </div>
  );
};

export default GyaanCalendar;
