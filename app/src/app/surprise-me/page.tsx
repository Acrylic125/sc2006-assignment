"use client";


import React, { useState } from "react";
import { useSwipeable } from "react-swipeable";

const images = [
  "/H2R.jpg",
  "/M1000RR.png",
  "/V4S.webp",
];

export default function SurpriseMePage() {
  const [index, setIndex] = useState(0);
  const handlers = useSwipeable({
    onSwipedLeft: () => setIndex((i) => (i + 1) % images.length),
    onSwipedRight: () => setIndex((i) => (i - 1 + images.length) % images.length),
    preventDefaultTouchmoveEvent: true,
    trackMouse: true,
  });

  return (
    <div
      {...handlers}
      style={{
        position: "relative",
        width: "100vw",
        maxWidth: 400,
        height: "70vh",
        margin: "40px auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "24px",
        overflow: "hidden",
        boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
        background: "#fff",
      }}
    >
      <img
        src={images[index]}
        alt={`Surprise ${index + 1}`}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          borderRadius: "24px",
          userSelect: "none",
        }}
      />
      <button
        style={{
          position: "absolute",
          bottom: 32,
          left: "50%",
          transform: "translateX(-50%)",
          background: "#fff",
          border: "none",
          borderRadius: "50%",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          width: 64,
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
        }}
        aria-label="Like"
        onClick={() => alert("Liked!")}
      >
        <svg width="36" height="36" viewBox="0 0 24 24" fill="#e63946" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
      </button>
      <div
        style={{
          position: "absolute",
          top: 16,
          left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(255,255,255,0.8)",
          padding: "6px 16px",
          borderRadius: "16px",
          fontWeight: 500,
          fontSize: "1rem",
        }}
      >
        Swipe left/right
      </div>
    </div>
  );
}