"use client";

import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import { trpc } from "@/server/client";
import { useRouter } from "next/navigation";

interface POI {
  id: number;
  imageUrl: string | null;
  name: string;
  description: string;
  latitude: string;
  longitude: string;
  tags: string[];
}

export default function SurpriseMePage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [tilt, setTilt] = useState(0);
  const [likedPOIs, setLikedPOIs] = useState<POI[]>([]);
  const [tagWeights, setTagWeights] = useState(new Map<string, number>());
  const containerRef = useRef<HTMLDivElement>(null);

  const router = useRouter();

  // Fetch POIs using tRPC
  const { data: pois, isLoading, error } = trpc.pois.getPois.useQuery<POI[]>();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  if (!pois || pois.length === 0) {
    return <div>No POIs available</div>;
  }

  const currentPOI = pois[currentIndex];

  const handleLike = () => {
    if (!currentPOI) return;

    // Add to liked POIs
    setLikedPOIs((prev) => [...prev, currentPOI]);

    // Update tag weights
    currentPOI.tags.forEach((tag) => {
      setTagWeights((prev) => {
        const newWeights = new Map(prev);
        newWeights.set(tag, (newWeights.get(tag) || 0) + 1);
        return newWeights;
      });
    });

    // Move to the next POI
    setCurrentIndex((prev) => prev + 1);
    setTilt(0);
  };

  const handleDislike = () => {
    if (!currentPOI) return;

    // Move to the next POI
    setCurrentIndex((prev) => prev + 1);
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

  if (currentIndex >= pois.length) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-black text-white">
        <h2 className="text-2xl font-bold mb-4">You've completed the carousel!</h2>
        <button
          onClick={() => router.push("/")}
          className="px-6 py-3 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition"
        >
          Exit
        </button>
      </div>
    );
  }

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
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        borderRadius: "24px",
        overflow: "hidden",
        boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
        background: "#fff",
        userSelect: "none",
      }}
    >
      {/* Home Button */}
      <button
      onClick={() => router.push("/")}
      style={{
        position: "absolute",
        top: 16,
        left: 16, // Position it on the top-left corner
        background: "linear-gradient(135deg, #007bff, #0056b3)", // Gradient background
        color: "#fff",
        border: "none",
        borderRadius: "50%",
        width: 48,
        height: 48,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)", // Stronger shadow for depth
        cursor: "pointer",
        transition: "transform 0.2s ease, box-shadow 0.2s ease", // Smooth hover animation
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "scale(1.1)"; // Slightly enlarge on hover
        e.currentTarget.style.boxShadow = "0 6px 16px rgba(0, 0, 0, 0.3)"; // Enhance shadow on hover
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "scale(1)"; // Reset scale
        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.2)"; // Reset shadow
      }}
      aria-label="Home"
    >
      <svg
        width="24" // Adjusted width for better alignment
        height="24" // Adjusted height for better alignment
        viewBox="0 0 24 24" // Ensure the viewBox is correct
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          display: "block", // Ensures no extra space around the SVG
          margin: "auto", // Centers the SVG inside the button
        }}
      >
        <path
          d="M3 10.5L12 3l9 7.5M5 10v10a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-6h2v6a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1V10"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
      {/* Name */}
      <div
        style={{
          width: "100%",
          padding: "16px", // Existing padding
          paddingTop: "70px", // Add extra padding to push the name below the Home button
          textAlign: "center",
          color: "#333",
          fontWeight: "bold",
          fontSize: "1.5rem",
        }}
      >
        {currentPOI.name}
      </div>
  
      {/* Image */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        style={{
          width: "100%",
          height: "50%",
          position: "relative",
          borderRadius: "24px",
          userSelect: "none",
          overflow: "hidden",
          rotate: `${tilt}deg`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {currentPOI.imageUrl ? (
          <img
            src={
              currentPOI.imageUrl.startsWith("http")
                ? currentPOI.imageUrl
                : `https://${currentPOI.imageUrl}`
            }
            alt={currentPOI.name}
            draggable={false}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#f8d7da",
              color: "#721c24",
              fontWeight: "bold",
              fontSize: "1.2rem",
            }}
          >
            Image Not Available!
          </div>
        )}
      </motion.div>
  
      {/* Description */}
      <div
        style={{
          width: "100%",
          padding: "16px",
          textAlign: "center",
          fontSize: "1rem",
          color: "#555",
        }}
      >
        {currentPOI.description}
      </div>
  
      {/* Buttons */}
      <div
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-around",
          padding: "8px 0",
          marginBottom: "16px", // Move buttons slightly above the bottom
        }}
      >
        {/* Dislike Button */}
        <button
          style={{
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
          aria-label="Dislike"
          onClick={handleDislike}
        >
          <svg
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="#333"
            xmlns="http://www.w3.org/2000/svg"
          >
            <line
              x1="6"
              y1="6"
              x2="18"
              y2="18"
              stroke="#333"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <line
              x1="18"
              y1="6"
              x2="6"
              y2="18"
              stroke="#333"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
        {/* Like Button */}
        <button
          style={{
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
          onClick={handleLike}
        >
          <svg
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="#e63946"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
        </button>
      </div>
    </div>
  );
}