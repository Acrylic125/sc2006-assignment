"use client";

import { ExploreMap } from "@/components/map";
import { useMapStore } from "@/components/map-store";
import { MainNavbar } from "@/components/navbar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn, formatDurationToClosestUnit } from "@/lib/utils";
import { useAuth } from "@clerk/nextjs";
import {
  Check,
  Ellipsis,
  Filter,
  Navigation,
  Pen,
  Plus,
  Sparkles,
  Star,
  Tag,
  ThumbsDown,
  ThumbsUp,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";

// function useBreakpointBetween(min: number, max: number) {
//   const [breakpoint, setBreakpoint] = useState<boolean>(false);
//   useEffect(() => {
//     setBreakpoint(window.innerWidth >= min && window.innerWidth <= max);
//     const handleResize = () => {
//       setBreakpoint(window.innerWidth >= min && window.innerWidth <= max);
//     };
//     window.addEventListener("resize", handleResize);
//     return () => {
//       window.removeEventListener("resize", handleResize);
//     };
//   }, [min, max, setBreakpoint]);

//   return breakpoint;
// }

function ItineraryDropdown() {
  const mapStore = useMapStore(
    useShallow(({ viewingItineraryId, setViewingItineraryId }) => {
      return {
        viewingItineraryId,
        setViewingItineraryId,
      };
    })
  );
  const itineraries = [
    {
      id: 1,
      name: "Itinerary 1",
    },
    {
      id: 2,
      name: "Itinerary 2",
    },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-36 md:w-40 lg:w-52">
          {mapStore.viewingItineraryId ? (
            <span className="truncate">
              {
                itineraries.find(
                  (itinerary) => itinerary.id === mapStore.viewingItineraryId
                )?.name
              }
            </span>
          ) : (
            <span className="truncate text-muted-foreground">
              No Intinerary Selected
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>My Itineraries</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {itineraries.map((itinerary) => (
          <div key={itinerary.id} className="relative">
            <Button
              onClick={() => {
                if (mapStore.viewingItineraryId === itinerary.id) {
                  mapStore.setViewingItineraryId(null);
                } else {
                  mapStore.setViewingItineraryId(itinerary.id);
                }
              }}
              className="w-full px-2 flex flex-row items-center justify-start pr-20"
              variant={
                mapStore.viewingItineraryId === itinerary.id
                  ? "default"
                  : "ghost"
              }
            >
              {itinerary.name}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn("absolute top-0 right-0", {
                    "text-background":
                      mapStore.viewingItineraryId === itinerary.id,
                    "text-foreground":
                      mapStore.viewingItineraryId !== itinerary.id,
                  })}
                >
                  <Ellipsis />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>
                  <Pen className="size-3" /> Rename
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive">
                  <Trash2 className="size-3" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="px-2">
          <Plus /> Create Itinerary
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FilterDropdown() {
  const mapStore = useMapStore(
    useShallow(({ filters, setFilterShowVisited, setFilterShowUnvisited }) => {
      return {
        showVisited: filters.showVisited,
        showUnvisited: filters.showUnvisited,
        setFilterShowVisited,
        setFilterShowUnvisited,
      };
    })
  );

  const hasModified = !mapStore.showVisited || !mapStore.showUnvisited;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={hasModified ? "default" : "outline"}>
          <Filter /> <span className="hidden lg:block">Filters</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Filters</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <Button
          variant="ghost"
          className="flex flex-row items-center gap-2 w-full justify-start px-2"
          onClick={() => {
            mapStore.setFilterShowVisited(!mapStore.showVisited);
          }}
        >
          <span className="w-4">
            {mapStore.showVisited && <Check className="size-4" />}
          </span>
          <span>Show Visited</span>
        </Button>
        <Button
          variant="ghost"
          className="flex flex-row items-center gap-2 justify-start px-2"
          onClick={() => {
            mapStore.setFilterShowUnvisited(!mapStore.showUnvisited);
          }}
        >
          <span className="w-4">
            {mapStore.showUnvisited && <Check className="size-4" />}
          </span>
          <span>Show Unvisited</span>
        </Button>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FilterTagsDropdown() {
  const tags = [
    "Nature",
    "History",
    "Culture",
    "Food",
    "Drinks",
    "Shopping",
    "Entertainment",
  ];
  const mapStore = useMapStore(
    useShallow(({ filters, setFilterExcludedTags }) => {
      return {
        excludedTags: filters.excludedTags,
        setFilterExcludedTags,
      };
    })
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={mapStore.excludedTags.size > 0 ? "default" : "outline"}
        >
          <Tag /> <span className="hidden lg:block">Tags</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Tags</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {tags.map((tag) => (
          <Button
            key={tag}
            variant="ghost"
            className="flex flex-row items-center gap-2 justify-start px-2"
            onClick={() => {
              const currentExcludedTags = new Set(mapStore.excludedTags);
              if (mapStore.excludedTags.has(tag)) {
                currentExcludedTags.delete(tag);
                mapStore.setFilterExcludedTags(currentExcludedTags);
              } else {
                currentExcludedTags.add(tag);
                mapStore.setFilterExcludedTags(currentExcludedTags);
              }
            }}
          >
            <span className="w-4">
              {!mapStore.excludedTags.has(tag) && <Check className="size-4" />}
            </span>
            <span>{tag}</span>
          </Button>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ViewPOIReviews() {
  const auth = useAuth();

  // TODO: Retrieve personal reviews + other reviews using the Reviews Router.
  const reviews = [
    {
      id: 1,
      liked: false,
      comment: "This is a review",
      images: ["/example.png", "/example.png", "/example.png"],
      age: 30000,
      // createdAt: new Date(),
      // User needs to be retrieved from clerk.
      // See https://clerk.com/docs/reference/backend/user/get-user-list
      // Filter by `userId`. Note the limit is 100. We will only ever
      // retrieve up to 50 reviews at a time so this limit will never
      // be reached.
      user: {
        id: "user_123",
        name: "User 1",
        profilePicture: "https://github.com/shadcn.png",
      },
      itinerary: {
        id: 1,
        name: "Itinerary 1",
      },
    },
    {
      id: 2,
      liked: true,
      comment: "This is a review",
      images: ["/example.png", "/example.png", "/example.png"],
      age: 86400000,
      // createdAt: new Date(),
      // User needs to be retrieved from clerk.
      // See https://clerk.com/docs/reference/backend/user/get-user-list
      // Filter by `userId`. Note the limit is 100. We will only ever
      // retrieve up to 50 reviews at a time so this limit will never
      // be reached.
      user: {
        id: "user_123",
        name: "User 1",
        profilePicture: "https://github.com/shadcn.png",
      },
      itinerary: {
        id: 1,
        name: "Itinerary 1",
      },
    },
  ];

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-row items-center justify-between">
        <h3 className="font-medium">Reviews</h3>
        <Button variant="default" size="sm" disabled={!auth.isSignedIn}>
          <Plus /> Review
        </Button>
      </div>
      <div className="flex flex-col gap-2">
        {reviews.map((review) => (
          <div
            key={review.id}
            className="flex flex-col border border-border rounded-md p-2 bg-secondary gap-2"
          >
            <div className="flex flex-row items-center justify-between gap-2">
              <div className="flex flex-row items-center gap-2">
                <Avatar>
                  <AvatarImage src={review.user.profilePicture} />
                  <AvatarFallback>Profile</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{review.user.name}</span>
              </div>
              {review.liked ? (
                <ThumbsUp className="size-4 stroke-primary dark:fill-primary/25" />
              ) : (
                <ThumbsDown className="size-4 stroke-red-400 fill-red-200/25 dark:fill-red-700/25" />
              )}
            </div>
            <p className="text-sm font-light text-foreground">
              {review.comment}
            </p>
            <div className="flex flex-row items-center gap-2">
              {review.images.map((image, i) => (
                <div className="w-1/3 aspect-square relative" key={i}>
                  <Image
                    src={image}
                    alt={review.comment}
                    className="object-cover"
                    fill
                  />
                </div>
              ))}
            </div>
            <div className="flex flex-row justify-between">
              <span className="text-sm flex-1 truncate">
                {(auth.userId === review.user.id || true) &&
                  review.itinerary.name}
              </span>
              <span className="flex flex-row items-center text-muted-foreground text-sm flex-1 truncate justify-end">
                {formatDurationToClosestUnit(review.age)} ago
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ViewPOIPanel() {
  // TODO: Currently, the POI is hardcoded. Create a trpc router that interacts with the database to get the POI.
  const poi = {
    name: "Marina Bay Sands",
    description: "Marina Bay Sands is a hotel and casino located in Singapore.",
    image: "/example.png",
    latitude: 1.2834,
    longitude: 103.8607,
  };

  return (
    <div className="w-full flex flex-col">
      <div className="w-full aspect-[4/3] relative">
        <Image src={poi.image} alt={poi.name} fill className="object-cover" />
      </div>
      <div className="flex flex-col p-1">
        <h1 className="text-base font-bold">{poi.name}</h1>
        <p className="text-sm text-muted-foreground">{poi.description}</p>
        <div className="flex flex-col gap-1 py-4">
          <Button variant="ghost" asChild className="w-fit p-0">
            <a
              href={`https://www.google.com/maps?q=${poi.latitude},${poi.longitude}`}
            >
              <Navigation />
              Navigate
            </a>
          </Button>
          <Button className="w-full truncate" size="sm">
            Add to Itinerary
          </Button>
          <Button className="w-full truncate" variant="secondary" size="sm">
            Start Itinerary
          </Button>
        </div>
        <ViewPOIReviews />
      </div>
    </div>
  );
}

const mapViewTabs = [
  {
    id: "explore",
    label: "Explore",
  },
  {
    id: "recommend",
    label: "Recommend",
  },
] as const;

export function MapViewTabGroup() {
  const mapStore = useMapStore(
    useShallow(({ currentMapTab, setCurrentMapTab }) => {
      return {
        currentMapTab,
        setCurrentMapTab,
      };
    })
  );

  return (
    <div className="flex flex-row bg-secondary/75 backdrop-blur-sm rounded-full border border-border p-1">
      {mapViewTabs.map((tab) => {
        return (
          <Button
            key={tab.id}
            variant={mapStore.currentMapTab === tab.id ? "default" : "ghost"}
            onClick={() => {
              mapStore.setCurrentMapTab(tab.id);
            }}
            size="sm"
            className={cn("rounded-full shadow-sm text-sm py-1 px-2.5 h-fit", {
              "border-border border": mapStore.currentMapTab === tab.id,
            })}
          >
            {tab.label}
          </Button>
        );
      })}
    </div>
  );
}

const sidePanelTabs = [
  {
    id: "itinerary",
    label: "Itinerary",
  },
  {
    id: "place",
    label: "Place",
  },
] as const;

export function SidePanelTabGroup() {
  const mapStore = useMapStore(
    useShallow(({ currentSidePanelTab, setCurrentSidePanelTab }) => {
      return {
        currentSidePanelTab,
        setCurrentSidePanelTab,
      };
    })
  );

  return (
    <div className="flex flex-row bg-secondary/75 backdrop-blur-sm rounded-full border border-border p-1">
      {sidePanelTabs.map((tab) => {
        return (
          <Button
            key={tab.id}
            variant={
              mapStore.currentSidePanelTab === tab.id ? "default" : "ghost"
            }
            onClick={() => {
              mapStore.setCurrentSidePanelTab(tab.id);
            }}
            size="sm"
            className={cn("rounded-full shadow-sm text-sm py-1 px-2.5 h-fit", {
              "border-border border": mapStore.currentSidePanelTab === tab.id,
            })}
          >
            {tab.label}
          </Button>
        );
      })}
    </div>
  );
}

export default function Home() {
  return (
    <div className="w-full h-full flex flex-col items-center bg-background">
      <MainNavbar />
      <div className="w-full h-screen-max flex flex-col md:flex-row max-w-[1920px]">
        <div className="flex flex-col h-full flex-1">
          <div className="flex flex-row items-center justify-between p-1 border-b border-border gap-1">
            <div className="flex-1 flex flex-row items-center gap-2">
              <FilterTagsDropdown />
              <FilterDropdown />
              <ItineraryDropdown />
            </div>

            <div className="flex-1 flex flex-row items-center gap-2 lg:hidden justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Sparkles />{" "}
                    <span className="hidden sm:block">Surprise Me</span>
                    {/* <span className="hidden xs:block">Surprise Me!</span> */}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Map View</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem>Explore</DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem>Recommend</DropdownMenuCheckboxItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/surprise-me">
                      <div className="flex items-center gap-2">
                        <span>Take a quiz!</span>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex-1 hidden lg:flex flex-row justify-end items-center gap-1">
              <Button variant="outline" className="px-2.5" asChild>
                <Link href="/surprise-me">
                  <div className="bg-background rounded-sm px-3 py-1.5 flex items-center gap-2">
                    <Sparkles />
                    <span className="hidden lg:block">Surprise Me!</span>
                  </div>
                </Link>
              </Button>

              <MapViewTabGroup />
              {/* <div className="flex flex-row items-center bg-secondary/75 backdrop-blur-sm rounded-full border border-border p-1">
                <Button
                  variant="default"
                  size="sm"
                  className="rounded-full border-border border shadow-sm text-sm py-1 px-2.5 h-fit"
                >
                  Explore
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full text-sm py-1 px-1.5 h-fit"
                >
                  Recommend
                </Button>
              </div> */}
            </div>
          </div>
          <div className="h-full w-full p-1">
            {/* <ExploreMap className="h-full w-full" /> */}
          </div>
        </div>
        <ScrollArea className="relative h-1/2 w-full lg:w-1/5 min-w-64 md:max-w-80 md:h-screen-max">
          <ViewPOIPanel />
          <div className="absolute flex flex-col items-center top-2 left-1/2 right-1/2 -translate-x-1/2">
            <SidePanelTabGroup />
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
