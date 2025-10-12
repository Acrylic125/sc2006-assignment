"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

const images = [
  { src: "/H2R.jpg", alt: "H2R" },
  { src: "/M1000RR.png", alt: "M1000RR" },
  { src: "/V4S.webp", alt: "V4S" },
];

export default function SurpriseMePage() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [tilt, setTilt] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleLike = () => {
    alert(`Liked: ${images[index].alt}`);
    setIndex((i) => (i + 1) % images.length);
    setTilt(0);
  };
  const handleDislike = () => {
    alert(`Disliked: ${images[index].alt}`);
    setIndex((i) => (i + 1) % images.length);
    setTilt(0);
  };
  const handleDrag = (_: any, info: any) => {
    setTilt(info.offset.x / 10);
  };
  const handleDragEnd = (_: any, info: any) => {
    const container = containerRef.current;
    if (!container) return;
    const bounds = container.getBoundingClientRect();
    const x = info.point.x;
    if (x > bounds.right - 40) {
      handleLike();
    } else if (x < bounds.left + 40) {
      handleDislike();
    } else {
      setTilt(0);
    }
  };

  return (
    <div
      ref={containerRef}
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
        userSelect: "none",
      }}
    >
      {/* Home button at top left */}
      <button
        onClick={() => router.back()}
        style={{
          position: "absolute",
          top: 24,
          left: 24,
          zIndex: 10,
          background: "#fff",
          border: "none",
          borderRadius: "50%",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          width: 48,
          height: 48,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer"
        }}
        aria-label="Go Home"
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12l7-7 7 7"/><path d="M5 10v10h4v-6h2v6h4V10"/></svg>
      </button>
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        style={{
          width: "100%",
          height: "100%",
          position: "absolute",
          left: 0,
          top: 0,
          borderRadius: "24px",
          userSelect: "none",
          overflow: "hidden",
          rotate: `${tilt}deg`,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ width: "100%", flex: 1, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
          {/* Image name label on top of image */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(255,255,255,0.85)",
              color: "#111",
              padding: "4px 12px",
              borderRadius: "12px",
              fontWeight: 600,
              fontSize: "1.1rem",
              zIndex: 2,
              marginTop: "8px"
            }}
          >
            {images[index].src.split("/").pop()}
          </div>
          <img
            src={images[index].src}
            alt={images[index].alt}
            draggable={false}
            style={{ width: "100%", height: "auto", objectFit: "contain", borderTopLeftRadius: "24px", borderTopRightRadius: "24px" }}
          />
        </div>
      </motion.div>
      {/* Cross Button (Dislike) - now left */}
      <button
        style={{
          position: "absolute",
          bottom: 32,
          left: "30%",
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
          cursor: "pointer"
        }}
        aria-label="Dislike"
        onClick={handleDislike}
      >
        <svg width="36" height="36" viewBox="0 0 24 24" fill="#333" xmlns="http://www.w3.org/2000/svg">
          <line x1="6" y1="6" x2="18" y2="18" stroke="#333" strokeWidth="2" strokeLinecap="round" />
          <line x1="18" y1="6" x2="6" y2="18" stroke="#333" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      {/* Heart Button (Like) - now right */}
      <button
        style={{
          position: "absolute",
          bottom: 32,
          right: "30%",
          transform: "translateX(50%)",
          background: "#fff",
          border: "none",
          borderRadius: "50%",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          width: 64,
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer"
        }}
        aria-label="Like"
        onClick={handleLike}
      >
        <svg width="36" height="36" viewBox="0 0 24 24" fill="#e63946" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
      </button>
      {/* ...existing code... */}
    </div>
  );
}