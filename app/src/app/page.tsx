"use client";
// import { ExploreMap } from "@/components/map/map";
import { MainNavbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles } from "lucide-react";
import Link from "next/link";
import { SidePanel, SidePanelTabGroup } from "@/components/map/map-side-panel";
import { MapModal } from "@/components/map/modal/map-modal";
import {
  FilterDropdown,
  FilterTagsDropdown,
} from "@/components/map/filter-dropdwon";
import { ItineraryDropdown } from "@/components/map/itinerary-dropdown";
import { MapViewTabGroup } from "@/components/map/map-view-tab-group";
import dynamic from "next/dynamic";
import { useAuth } from "@clerk/nextjs";

const _ExploreMap = dynamic(() => import("../components/map/map"), {
  ssr: false,
});

export default function Home() {
  const auth = useAuth();
  
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
                  <Button variant="outline" disabled={!auth.isSignedIn}>
                    <Sparkles />{" "}
                    <span className="hidden sm:block">Surprise Me</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Map View</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem>Explore</DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem>Recommend</DropdownMenuCheckboxItem>
                  <DropdownMenuSeparator />
                  {auth.isSignedIn ? (
                    <DropdownMenuItem asChild>
                      <Link href="/surprise-me">
                        <div className="flex items-center gap-2">
                          <span>Take a quiz!</span>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem disabled>
                      <div className="flex items-center gap-2">
                        <span>Sign in to use Surprise Me</span>
                      </div>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex-1 hidden lg:flex flex-row justify-end items-center gap-1">
              {auth.isSignedIn ? (
                <Button variant="outline" className="px-2.5" asChild>
                  <Link href="/surprise-me">
                    <div className="bg-background rounded-sm px-3 py-1.5 flex items-center gap-2">
                      <Sparkles />
                      <span className="hidden lg:block">Surprise Me!</span>
                    </div>
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" className="px-2.5" disabled>
                  <div className="bg-background rounded-sm px-3 py-1.5 flex items-center gap-2">
                    <Sparkles />
                    <span className="hidden lg:block">Surprise Me!</span>
                  </div>
                </Button>
              )}

              <MapViewTabGroup />
            </div>
          </div>
          <div className="h-full w-full p-1">
            <_ExploreMap className="h-full w-full" />
          </div>
        </div>
        <ScrollArea className="relative h-1/2 w-full lg:w-1/5 min-w-64 md:max-w-80 md:h-screen-max lg:border-l border-border">
          <SidePanel />
          <div className="absolute flex flex-col items-center top-2 left-1/2 right-1/2 -translate-x-1/2">
            <SidePanelTabGroup />
          </div>
        </ScrollArea>
      </div>
      <MapModal />
    </div>
  );
}
