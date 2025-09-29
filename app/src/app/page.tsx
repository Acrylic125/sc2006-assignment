"use client";

import { ExploreMap } from "@/components/map";
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

  // TODO: Retrieve personal reviews + other reviews using the Reviews Router.
  const reviews = [
    {
      id: 1,
      liked: true,
      comment: "This is a review",
      images: ["/example.png", "/example.png"],
      createdAt: new Date(),
      // User needs to be retrieved from clerk.
      // See https://clerk.com/docs/reference/backend/user/get-user-list
      // Filter by `userId`. Note the limit is 100. We will only ever
      // retrieve up to 50 reviews at a time so this limit will never
      // be reached.
      user: {
        // Change this user id to your user id. You should see
        // a difference.
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
            className={cn(
              "flex flex-col gap-1 border border-border rounded-md p-2",
              {
                "bg-secondary": review.user.id === auth.userId,
              }
            )}
          >
            <div className="flex flex-row items-center gap-2">
              <Avatar>
                <AvatarImage src={review.user.profilePicture} />
                <AvatarFallback>Profile</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">{review.user.name}</span>
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

            <div className="flex-1 hidden lg:flex flex-row justify-end items-center">
              <Button variant="outline" className="px-2.5" asChild>
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
          <div className="h-full w-full p-1">
            {/* <ExploreMap className="h-full w-full" /> */}
          </div>
        </div>
        <ScrollArea className="relative h-1/2 w-full lg:w-1/5 min-w-64 md:max-w-80 md:h-screen-max">
          <ViewPOIPanel />
          <div className="absolute flex flex-col items-center top-2 left-1/2 right-1/2 -translate-x-1/2">
            <div className="flex flex-row bg-secondary/75 backdrop-blur-sm rounded-full border border-border p-1">
              <Button
                variant="secondary"
                size="sm"
                className="rounded-full shadow-sm text-sm py-1 px-2.5 h-fit"
              >
                Itinerary
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full text-sm py-1 px-1.5 h-fit"
              >
                Place
              </Button>
            </div>
            {/* <Tabs defaultValue="account">
            <TabsList>
              <TabsTrigger value="account">Itinerary</TabsTrigger>
              <TabsTrigger value="password">Place</TabsTrigger>
            </TabsList>
          </Tabs> */}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
