"use client";

import { useRef, useState } from "react";
import { motion, useMotionValue } from "framer-motion";
import Image from "next/image";
import { Button } from "../ui/button";
import { HeartIcon, PartyPopper, PartyPopperIcon, XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/server/client";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";

export function Survey({
  pois,
}: {
  pois: {
    id: number;
    imageUrl: string;
    name: string;
    description: string;
    latitude: string;
    longitude: string;
    tags: string[];
  }[];
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likedPOIs, setLikedPOIs] = useState<Set<number>>(new Set());
  const [skippedPOIs, setSkippedPOIs] = useState<Set<number>>(new Set());
  const [dislikedPOIs, setDislikedPOIs] = useState<Set<number>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const indicatePreferenceMutation = trpc.pois.indicatePreference.useMutation({
    onSuccess: () => {
      router.push("/surprise-me/suggest");
    },
  });
  const handleIndicatePreference = () => {
    const preferences = [
      ...Array.from(likedPOIs).map((poiId) => ({
        poiId: poiId,
        liked: true,
      })),
      ...Array.from(dislikedPOIs).map((poiId) => ({
        poiId: poiId,
        liked: false,
      })),
    ];
    indicatePreferenceMutation.mutate({
      removeOld: true,
      preferences: preferences,
    });
  };

  const currentPOI =
    currentIndex >= 0 && currentIndex < pois.length ? pois[currentIndex] : null;
  const tilt = useMotionValue(0);
  const opacity = useMotionValue(1);

  const [showLikeDislikePanel, setShowLikeDislikePanel] = useState<
    "like" | "dislike" | null
  >(null);
  tilt.on("change", (latest) => {
    if (latest > TILT_THRESHOLD) {
      setShowLikeDislikePanel("like");
    } else if (latest < -TILT_THRESHOLD) {
      setShowLikeDislikePanel("dislike");
    } else {
      setShowLikeDislikePanel(null);
    }
  });

  const indicatePreference = (
    poiId: number,
    status: "liked" | "disliked" | "skipped"
  ) => {
    if (indicatePreferenceMutation.isPending) {
      return;
    }
    if (status === "liked") {
      setLikedPOIs(new Set([...likedPOIs, poiId]));
    } else if (status === "disliked") {
      setDislikedPOIs(new Set([...dislikedPOIs, poiId]));
    } else if (status === "skipped") {
      setSkippedPOIs(new Set([...skippedPOIs, poiId]));
    }
    setCurrentIndex(currentIndex + 1);
    if (currentIndex + 1 === pois.length) {
      handleIndicatePreference();
    }
  };

  const MAX_TILT = 45;
  const TILT_THRESHOLD = 0.25 * MAX_TILT;

  if (currentPOI === null) {
    return (
      <div className="w-full min-h-screen-max flex flex-col items-center justify-center px-8 py-4 md:py-8 lg:py-12 gap-4">
        <PartyPopperIcon />
        <div className="flex flex-col items-center justify-center text-center gap-2">
          <h1 className="text-2xl font-bold">You are done!</h1>
          <p className="text-muted-foreground">
            Please wait while we process your preferences.
          </p>
        </div>
        {indicatePreferenceMutation.error && (
          <Alert variant="destructive" className="w-full max-w-md">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {indicatePreferenceMutation.error.message}
            </AlertDescription>
          </Alert>
        )}
        {
          <Button
            disabled={indicatePreferenceMutation.isPending}
            onClick={() => {
              handleIndicatePreference();
            }}
          >
            Try Again
          </Button>
        }
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen-max flex flex-col items-center justify-center px-8 py-4 md:py-8 lg:py-12">
      <div
        style={{
          width: `${(currentIndex / pois.length) * 100}%`,
        }}
        className="absolute top-0 left-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500"
      />

      <div className="flex flex-col w-full flex-1 relative">
        {/* <div className="w-full flex-1 relative"> */}
        <motion.div
          ref={containerRef}
          drag="x"
          dragElastic={0.2}
          dragSnapToOrigin={true}
          onDrag={(event, info) => {
            if (!containerRef.current) return;
            const screenWidth = window.innerWidth;
            const _tilt = (info.offset.x / screenWidth) * MAX_TILT;
            tilt.set(_tilt);
          }}
          onDragEnd={() => {
            const _tilt = tilt.get();
            if (_tilt > TILT_THRESHOLD) {
              indicatePreference(currentPOI.id, "liked");
            } else if (_tilt < -TILT_THRESHOLD) {
              indicatePreference(currentPOI.id, "disliked");
            }
            tilt.set(0);
          }}
          className="flex flex-col w-full flex-1 relative rounded-lg overflow-hidden"
          style={{
            rotate: tilt,
            opacity: opacity,
          }}
        >
          <div className="flex flex-col w-full flex-1 relative">
            <Image
              src={
                currentPOI.imageUrl.startsWith("http")
                  ? currentPOI.imageUrl
                  : `https://${currentPOI.imageUrl}`
              }
              alt="Please skip if you do not see this image."
              fill
              className="object-cover"
              style={{ pointerEvents: "none" }}
            />
          </div>
        </motion.div>

        <div className="absolute top-4 left-1/2 -translate-x-1/2">
          <div className="w-fit h-fit px-8 py-2.5 rounded-full bg-background/50 backdrop-blur-sm border border-border shadow-sm text-sm font-medium">
            {currentIndex + 1} / {pois.length}
          </div>
        </div>
        <div className="absolute bottom-4 left-4">
          <Button
            size="icon"
            className="h-fit p-4 w-fit rounded-full"
            onClick={() => {
              indicatePreference(currentPOI.id, "disliked");
            }}
            disabled={indicatePreferenceMutation.isPending}
          >
            <XIcon className="size-8 fill-red-500 stroke-red-500" />
          </Button>
        </div>
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          <Button
            variant="secondary"
            onClick={() => {
              indicatePreference(currentPOI.id, "skipped");
            }}
            disabled={indicatePreferenceMutation.isPending}
          >
            Skip
          </Button>
        </div>
        <div className="absolute bottom-4 right-4">
          <Button
            size="icon"
            className="h-fit p-4 w-fit rounded-full"
            onClick={() => {
              indicatePreference(currentPOI.id, "liked");
            }}
            disabled={indicatePreferenceMutation.isPending}
          >
            <HeartIcon className="size-8 fill-green-500 stroke-green-500" />
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-1 py-4 items-center justify-center text-center">
        <div className="text-2xl font-bold max-w-md lg:max-w-lg">
          {currentPOI.name}
        </div>
        <div className="text-sm text-muted-foreground max-w-md lg:max-w-lg">
          {currentPOI.description}
        </div>
        <div className="flex flex-row gap-2 flex-wrap items-center justify-center pt-4">
          {currentPOI.tags.map((tag) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
        </div>
      </div>

      {showLikeDislikePanel === "dislike" && (
        <div className="w-1/4 h-full absolute top-0 left-0 bg-red-500/50 border-4 border-red-500 border-dashed text-red-50 font-bold text-center items-center justify-center flex text-3xl">
          <div>I Dislike This</div>
        </div>
      )}
      {showLikeDislikePanel === "like" && (
        <div className="w-1/4 h-full absolute top-0 right-0 bg-blue-500/50 border-4 border-blue-500 border-dashed text-blue-50 font-bold text-center items-center justify-center flex text-3xl">
          <div>I Like This</div>
        </div>
      )}
    </div>
  );
}
