"use client";

import { ExploreMap } from "@/components/map";
import { MainNavbar } from "@/components/navbar";
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
import { cn } from "@/lib/utils";
import { useAuth } from "@clerk/nextjs";
import {
  Ellipsis,
  Filter,
  Navigation,
  Plus,
  Sparkles,
  Star,
  Tag,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

function useBreakpointBetween(min: number, max: number) {
  const [breakpoint, setBreakpoint] = useState<boolean>(false);
  useEffect(() => {
    setBreakpoint(window.innerWidth >= min && window.innerWidth <= max);
    const handleResize = () => {
      setBreakpoint(window.innerWidth >= min && window.innerWidth <= max);
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [min, max, setBreakpoint]);

  return breakpoint;
}

function ItineraryDropdown() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-36 md:w-40 lg:w-52">
          <span className="truncate">No Intinerary Selected</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Filters</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup>
          <DropdownMenuRadioItem value="none">-- None --</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="bottom">Bottom</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="right">Right</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <Plus /> Create Itinerary
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FilterDropdown() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <Filter /> <span className="hidden lg:block">Filters</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Filters</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem>Show Visited</DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem>Show Unvisited</DropdownMenuCheckboxItem>
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
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <Tag /> <span className="hidden lg:block">Tags</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Tags</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {tags.map((tag) => (
          <DropdownMenuCheckboxItem key={tag}>{tag}</DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ViewPOIReviews() {
  const auth = useAuth();

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-row items-center justify-between">
        <h3 className="font-medium">Reviews</h3>
        <Button variant="default" size="sm" disabled={!auth.isSignedIn}>
          <Plus /> Review
        </Button>
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

function ExplorePageLayout({ className }: { className?: string }) {
  // Refer to https://tailwindcss.com/docs/responsive-design
  // for breakpoint values.
  // <= lg implies mobile.
  // const isMobile = useBreakpointBetween(0, 1024);

  const [showItinerary, setShowItinerary] = useState<string | null>(null);

  // if (isMobile) {
  //   return <></>;
  // }

  return (
    <div
      className={cn("w-full h-screen-max flex flex-col md:flex-row", className)}
    >
      {showItinerary && (
        <ScrollArea className="col-span-2 h-screen-max">
          <div className="flex flex-col w-full bg-amber-400 h-screen-max"></div>
        </ScrollArea>
      )}
      <div className="flex flex-col h-full flex-1">
        <div className="flex flex-row items-center justify-between p-1 border-b border-border gap-1">
          <div className="flex-1 flex flex-row items-center gap-2">
            <FilterTagsDropdown />
            <FilterDropdown />
          </div>
          <div className="flex-1 flex flex-row items-center gap-2">
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
                <DropdownMenuLabel>Filters</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem>
                  Show Visited
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem>
                  Show Unvisited
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex-1 hidden lg:flex flex-row justify-end items-center">
            <Button variant="ghost" className="px-2.5" asChild>
              <Link href="/surprise-me">
                <div className="bg-background rounded-sm px-3 py-1.5 flex items-center gap-2">
                  <Sparkles />
                  <span className="hidden lg:block">Surprise Me!</span>
                </div>
              </Link>
            </Button>

            <Tabs defaultValue="account">
              <TabsList>
                <TabsTrigger value="account">Explore</TabsTrigger>
                <TabsTrigger value="password">Recommend</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
        {/* <ExploreMap className="w-full flex-1" /> */}
      </div>
      <ScrollArea className="relative h-1/2 w-full lg:w-1/5 min-w-64 md:max-w-80 md:h-screen-max">
        <ViewPOIPanel />
        <div className="absolute flex flex-col items-center top-0 left-1/2 right-1/2 -translate-x-1/2">
          <Tabs defaultValue="account">
            <TabsList>
              <TabsTrigger value="account">Itinerary</TabsTrigger>
              <TabsTrigger value="password">Place</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  );
}

export default function Home() {
  return (
    <div className="w-full h-full flex flex-col items-center bg-background">
      <MainNavbar />

      <ExplorePageLayout className="max-w-[1920px] w-full h-screen-max" />
      {/* <div className="bg-yellow-400 w-full h-[calc(100svh-64px)]">
        <ExploreMap className="w-full h-full" />
      </div> */}
      {/* <div className="w-full flex flex-row"></div> */}
      {/* <ScrollArea className="w-full h-[calc(100svh-64px)]">
        <div className="w-full h-[calc(100svh-64px)] flex flex-col items-center">
          <div className="w-full h-full max-w-screen">
            <ExploreMap className="w-full h-full" />
          </div>
        </div>
      </ScrollArea> */}
    </div>
  );
}
