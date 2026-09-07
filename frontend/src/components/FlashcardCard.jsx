import React from "react";

const FlashcardCard = ({
  question,
  answer,
  flipped,
  onFlip,
  colorIndex = 0,
}) => {
  const colors = [
    {
      gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      shadow: "rgba(118, 75, 162, 0.3)",
      border: "#764ba2",
    },
    {
      gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
      shadow: "rgba(245, 87, 108, 0.3)",
      border: "#f5576c",
    },
    {
      gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
      shadow: "rgba(0, 242, 254, 0.3)",
      border: "#00f2fe",
    },
    {
      gradient: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
      shadow: "rgba(56, 249, 215, 0.3)",
      border: "#38f9d7",
    },
    {
      gradient: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
      shadow: "rgba(250, 112, 154, 0.3)",
      border: "#fa709a",
    },
  ];

  const color = colors[colorIndex % colors.length];

  return (
    <div
      className="flashcard-container"
      style={{
        perspective: "1000px",
        width: "400px",
        height: "250px",
        cursor: "pointer",
      }}
      onClick={onFlip}
    >
      <div
        className="flashcard-inner"
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          textAlign: "center",
          transition: "transform 0.6s",
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* Front of Card */}
        <div
          className="card border-0"
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            backfaceVisibility: "hidden",
            background: color.gradient,
            borderRadius: "1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `0 10px 30px ${color.shadow}`,
            padding: "2rem",
          }}
        >
          <div>
            <div
              className="mb-3 mx-auto d-flex align-items-center justify-content-center"
              style={{
                width: "50px",
                height: "50px",
                background: "rgba(255,255,255,0.2)",
                borderRadius: "50%",
              }}
            >
              <i
                className="bi bi-question-lg text-white"
                style={{ fontSize: "1.5rem" }}
              ></i>
            </div>
            <p
              className="card-text mb-0"
              style={{
                color: "white",
                fontSize: "1.25rem",
                fontWeight: "500",
              }}
            >
              {question}
            </p>
          </div>
        </div>

        {/* Back of Card */}
        <div
          className="card border-0"
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            background: "var(--bg-card)",
            borderRadius: "1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `0 10px 30px ${color.shadow}`,
            padding: "2rem",
            border: `3px solid ${color.border}`,
          }}
        >
          <div>
            <div
              className="mb-3 mx-auto d-flex align-items-center justify-content-center"
              style={{
                width: "50px",
                height: "50px",
                background: color.gradient,
                borderRadius: "50%",
              }}
            >
              <i
                className="bi bi-lightbulb text-white"
                style={{ fontSize: "1.5rem" }}
              ></i>
            </div>
            <p
              className="card-text mb-0"
              style={{
                color: "var(--text-primary)",
                fontSize: "1.25rem",
                fontWeight: "500",
              }}
            >
              {answer}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlashcardCard;
