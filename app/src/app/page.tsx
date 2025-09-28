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
import { Filter, Plus, Sparkles, Star, Tag } from "lucide-react";
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
        <Button variant="outline">No Intinerary Selected</Button>
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

function ExplorePageLayout({ className }: { className?: string }) {
  // Refer to https://tailwindcss.com/docs/responsive-design
  // for breakpoint values.
  // <= md implies mobile.
  // const isMobile = useBreakpointBetween(0, 768);

  const showItinerary = useState<string | null>(null);

  return (
    <div className={cn("w-full h-screen-max grid grid-cols-12", className)}>
      {showItinerary && (
        <ScrollArea className="col-span-2 h-screen-max">
          <div className="flex flex-col w-full bg-amber-400 h-screen-max"></div>
        </ScrollArea>
      )}
      <div
        className={cn(
          "flex flex-col h-full",
          // "h-screen-max",
          showItinerary ? "col-span-8" : "col-span-10"
        )}
      >
        <div className="flex flex-row items-center justify-between">
          <div className="flex-1 flex flex-row items-center gap-2">
            <FilterTagsDropdown />
            <FilterDropdown />
          </div>
          <div className="flex-1 flex flex-row items-center gap-2">
            <ItineraryDropdown />
          </div>
          <div className="flex-1 flex flex-row justify-end items-center gap-2">
            <Button variant="ghost">
              <Sparkles /> <span className="hidden lg:block">Surprise Me!</span>
            </Button>
            <Tabs defaultValue="account">
              <TabsList>
                <TabsTrigger value="account">Explore</TabsTrigger>
                <TabsTrigger value="password">Recommend</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
        <div className="bg-blue-500 w-full flex-1">
          Lorem ipsum, dolor sit amet consectetur adipisicing elit. Consectetur
          hic in error esse est autem pariatur dolores deleniti laborum enim,
          nobis labore reprehenderit nulla asperiores at sequi! Suscipit,
          numquam repellendus.
        </div>
        {/* <ExploreMap className="w-full flex-1" /> */}
      </div>
      <ScrollArea className="col-span-2 h-screen-max">
        <div className="flex flex-col w-full bg-amber-400 h-screen-max"></div>
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
