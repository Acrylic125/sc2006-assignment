// "use client";

import { MainNavbar } from "@/components/navbar";
import { Survey } from "@/components/surprise-me/survey";
import { ScrollArea } from "@/components/ui/scroll-area";
import { db } from "@/db";
import { poiImagesTable, poiTable, poiTagTable, tagTable } from "@/db/schema";
import { SignInButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { eq, exists, inArray, sql } from "drizzle-orm";

// interface POI {
//   id: number;
//   imageUrl: string;
//   name: string;
//   description: string;
//   latitude: string;
//   longitude: string;
//   tags: string[];
// }

export default async function SurpriseMePage() {
  const isAuthed = await auth();
  if (!isAuthed.userId) {
    return (
      <div className="w-full h-full flex flex-col items-center bg-background">
        <MainNavbar />
        <div className="h-96 flex flex-col items-center justify-center gap-8 px-8">
          <div className="flex flex-col items-center justify-center text-center gap-2">
            <h1 className="text-3xl font-bold">Sign In Required</h1>
            <p className="text-muted-foreground max-w-md">
              You need to be signed in to use the Surprise Me feature. This
              helps us personalize your recommendations and save your liked
              places.
            </p>
          </div>
          <SignInButton />
        </div>
      </div>
    );
  }

  const pois = await db
    .select({
      id: poiTable.id,
      name: poiTable.name,
      description: poiTable.description,
      latitude: poiTable.latitude, // Include latitude
      longitude: poiTable.longitude, // Include longitude
      // tags: sql`array_agg(${tagTable.name})`.as("tags"),
    })
    .from(poiTable)
    .where(
      exists(
        db
          .select()
          .from(poiImagesTable)
          .where(eq(poiImagesTable.poiId, poiTable.id))
      )
    )
    // .leftJoin(poiImagesTable, eq(poiTable.id, poiImagesTable.poiId))
    // .leftJoin(poiTagTable, eq(poiTable.id, poiTagTable.poiId))
    // .leftJoin(tagTable, eq(poiTagTable.tagId, tagTable.id))
    // .where(sql`${poiImagesTable.imageUrl} IS NOT NULL`) // Ensure imageUrl is valid
    // .groupBy(poiTable.id, poiImagesTable.imageUrl)
    .orderBy(sql`RANDOM()`) // Randomize the POIs
    .limit(10);

  const [poiTags, poiImages] = await Promise.all([
    db
      .select({
        poiId: poiTagTable.poiId,
        tagName: tagTable.name,
      })
      .from(poiTagTable)
      .innerJoin(tagTable, eq(poiTagTable.tagId, tagTable.id))
      .where(
        inArray(
          poiTagTable.poiId,
          pois.map((poi) => poi.id)
        )
      ),
    db
      .select({
        poiId: poiImagesTable.poiId,
        imageUrl: poiImagesTable.imageUrl,
      })
      .from(poiImagesTable)
      .where(
        inArray(
          poiImagesTable.poiId,
          pois.map((poi) => poi.id)
        )
      ),
  ]);

  const poiImagesMap = new Map<number, string[]>();
  for (const image of poiImages) {
    poiImagesMap.set(image.poiId, [
      ...(poiImagesMap.get(image.poiId) ?? []),
      image.imageUrl,
    ]);
  }

  const poiTagsMap = new Map<number, string[]>();
  for (const tag of poiTags) {
    poiTagsMap.set(tag.poiId, [
      ...(poiTagsMap.get(tag.poiId) ?? []),
      tag.tagName,
    ]);
  }

  return (
    <div className="w-full h-full flex flex-col items-center bg-background">
      <MainNavbar />
      <ScrollArea className="w-full h-screen-max">
        <div className="w-full h-full flex flex-col items-center justify-center">
          <div className="max-w-[1920px] w-full h-full flex flex-col items-center justify-center gap-8">
            <Survey
              pois={pois.map((poi) => {
                const images = poiImagesMap.get(poi.id);
                const randomImage =
                  images?.[Math.floor(Math.random() * images.length)];
                const tags = poiTagsMap.get(poi.id) ?? [];
                return {
                  id: poi.id,
                  imageUrl: randomImage ?? "",
                  name: poi.name,
                  description: poi.description,
                  latitude: poi.latitude,
                  longitude: poi.longitude,
                  tags: tags,
                };
              })}
            />
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

// export default function SurpriseMePage() {
//   const [currentIndex, setCurrentIndex] = useState(0);
//   const [tilt, setTilt] = useState(0);
//   const [likedPOIs, setLikedPOIs] = useState<POI[]>([]);
//   const [tagWeights, setTagWeights] = useState(new Map<string, number>());
//   const [addedToItineraryPOIs, setAddedToItineraryPOIs] = useState(
//     new Set<number>()
//   );
//   const [recentlyCreatedItinerary, setRecentlyCreatedItinerary] = useState<
//     string | null
//   >(null);
//   const [poiBeingAddedToItinerary, setPoiBeingAddedToItinerary] = useState<
//     number | null
//   >(null);
//   const containerRef = useRef<HTMLDivElement>(null);

//   const router = useRouter();
//   const auth = useAuth();
//   // Get user tag preferences (returns id, name, likedScore where missing -> 0)
//   const tagPrefsQuery = trpc.map.getUserTagPreferences.useQuery(undefined, {
//     enabled: auth.isLoaded, // load when auth is ready
//   });

//   // Mutation to record user liking a POI (server still records per-POI liked boolean)
//   const indicatePreferenceMutation =
//     trpc.experimental.indicatePreference.useMutation();
//   // Mutation to log tag weights on server
//   const logTagWeightsMutation = trpc.experimental.logTagWeights.useMutation();

//   // Local ordered POIs computed from preferences (falls back to server POIs order)
//   const [orderedPois, setOrderedPois] = useState<POI[] | null>(null);

//   // Fetch POIs using tRPC
//   const { data: pois, isLoading, error } = trpc.pois.getPois.useQuery<POI[]>();

//   // Helper: shuffle array (declare before any early returns so hooks order is stable)
//   const shuffle = <T,>(arr: T[]) => {
//     const a = arr.slice();
//     for (let i = a.length - 1; i > 0; i--) {
//       const j = Math.floor(Math.random() * (i + 1));
//       [a[i], a[j]] = [a[j], a[i]];
//     }
//     return a;
//   };

//   // Build ordered POIs when pois or preferences change
//   useEffect(() => {
//     if (!pois) return;

//     const tagPrefs = tagPrefsQuery.data ?? [];
//     // Map tag name -> score
//     const tagScoreMap = new Map<string, number>();
//     tagPrefs.forEach((t) => tagScoreMap.set(t.name, t.likedScore ?? 0));

//     // Preferred tags: those with score > 0
//     const preferredTags = new Set<string>();
//     for (const [name, score] of tagScoreMap.entries()) {
//       if (score > 0) preferredTags.add(name);
//     }

//     // Split POIs into preferred (has at least one preferred tag) and others
//     const preferred = pois.filter((p) =>
//       p.tags.some((tag) => preferredTags.has(tag))
//     );
//     const others = pois.filter(
//       (p) => !p.tags.some((tag) => preferredTags.has(tag))
//     );

//     // Shuffle both lists
//     const prefShuffled = shuffle(preferred);
//     const otherShuffled = shuffle(others);

//     // Build the first 5: up to 3 from preferred, up to 2 random from others
//     const firstFive: POI[] = [];
//     for (let i = 0; i < 3 && i < prefShuffled.length; i++)
//       firstFive.push(prefShuffled[i]);
//     for (let i = 0; i < 2 && i < otherShuffled.length; i++)
//       firstFive.push(otherShuffled[i]);

//     // If we didn't reach 5, fill from remaining shuffled combined
//     const remaining = shuffle(pois.filter((p) => !firstFive.includes(p)));
//     while (
//       firstFive.length < Math.min(5, pois.length) &&
//       remaining.length > 0
//     ) {
//       firstFive.push(remaining.shift() as POI);
//     }

//     // Final ordered list: firstFive followed by rest (excluding any already in firstFive)
//     const rest = pois.filter((p) => !firstFive.includes(p));
//     setOrderedPois([...firstFive, ...rest]);
//   }, [pois, tagPrefsQuery.data]);

//   // Initialize local tagWeights from server preferences (tag name -> score)
//   useEffect(() => {
//     if (!tagPrefsQuery.data) return;
//     const m = new Map<string, number>();
//     tagPrefsQuery.data.forEach((t) => m.set(t.name, Number(t.likedScore ?? 0)));
//     setTagWeights(m);
//   }, [tagPrefsQuery.data]);

//   // Get user's itineraries (only if authenticated)
//   const itinerariesQuery = trpc.itinerary.getAllItineraries.useQuery(
//     undefined,
//     {
//       enabled: auth.isSignedIn,
//     }
//   );

//   // Mutation for adding POI to itinerary
//   const addPOIToItineraryMutation =
//     trpc.itinerary.addPOIToItinerary.useMutation();

//   // TRPC utilities for cache invalidation
//   const utils = trpc.useUtils();

//   // Modal store for showing modals
//   const modalStore = useMapModalStore();

//   // Listen for modal actions to handle itinerary creation
//   const modalAction = modalStore.action;

//   // Reset tracking when modal opens
//   useEffect(() => {
//     if (modalAction?.type === "create-itinerary") {
//       // Modal is opening, ensure we're tracking the right POI
//       if (
//         modalAction.options.poiId &&
//         poiBeingAddedToItinerary !== modalAction.options.poiId
//       ) {
//         setPoiBeingAddedToItinerary(modalAction.options.poiId);
//       }
//     }
//   }, [modalAction, poiBeingAddedToItinerary]);

//   // Handle modal close and itinerary creation
//   useEffect(() => {
//     // If modal was closed and we were creating an itinerary, refresh the itineraries list
//     if (modalAction === null && itinerariesQuery.data) {
//       // Refresh itineraries to get the newly created one
//       utils.itinerary.getAllItineraries.invalidate();

//       // If we were creating an itinerary with a POI, mark that POI as added
//       if (poiBeingAddedToItinerary !== null) {
//         console.log(
//           "Modal closed, marking POI as added:",
//           poiBeingAddedToItinerary
//         );
//         setAddedToItineraryPOIs((prev) =>
//           new Set(prev).add(poiBeingAddedToItinerary)
//         );

//         // Set success message (we'll get the itinerary name from the refreshed data)
//         setRecentlyCreatedItinerary("New Itinerary");
//         setPoiBeingAddedToItinerary(null); // Reset the tracking
//       }
//     }
//   }, [
//     modalAction,
//     utils.itinerary.getAllItineraries,
//     itinerariesQuery.data,
//     poiBeingAddedToItinerary,
//   ]);

//   // Clear success message after a delay
//   useEffect(() => {
//     if (recentlyCreatedItinerary) {
//       const timer = setTimeout(() => {
//         setRecentlyCreatedItinerary(null);
//       }, 3000);
//       return () => clearTimeout(timer);
//     }
//   }, [recentlyCreatedItinerary]);

//   // Show loading while checking authentication
//   if (!auth.isLoaded) {
//     return (
//       <div className="flex flex-col items-center justify-center h-screen bg-black text-white">
//         <div className="text-center">
//           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
//           <p className="text-gray-400">Loading...</p>
//         </div>
//       </div>
//     );
//   }

//   // Check if user is authenticated
//   if (!auth.isSignedIn) {
//     return (
//       <div className="flex flex-col items-center justify-center h-screen bg-black text-white">
//         <div className="text-center max-w-md mx-auto px-6">
//           <h1 className="text-3xl font-bold mb-4">Sign In Required</h1>
//           <p className="text-gray-400 mb-6">
//             You need to be signed in to use the Surprise Me feature. This helps
//             us personalize your recommendations and save your liked places.
//           </p>
//           <button
//             onClick={() => router.push("/")}
//             className="px-6 py-3 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition"
//           >
//             Go to Home
//           </button>
//         </div>
//       </div>
//     );
//   }

//   if (isLoading) {
//     return <div>Loading...</div>;
//   }

//   if (error) {
//     return <div>Error: {error.message}</div>;
//   }

//   if (!pois || pois.length === 0) {
//     return <div>No POIs available</div>;
//   }

//   const currentPOI = (orderedPois ?? pois)[currentIndex];

//   // Function to handle adding POI to an itinerary
//   const handleAddToItinerary = (poiId: number, itineraryId?: number) => {
//     console.log(
//       "Add to itinerary clicked for POI ID:",
//       poiId,
//       "Itinerary ID:",
//       itineraryId
//     );
//     console.log("Itineraries data:", itinerariesQuery.data);

//     // Check if user is authenticated
//     if (!auth.isSignedIn) {
//       console.log("User not authenticated, cannot add to itinerary");
//       return;
//     }

//     // If no itinerary ID provided, show create itinerary modal
//     if (!itineraryId) {
//       console.log("No itinerary selected, showing create itinerary modal");
//       const poi = pois.find((p) => p.id === poiId);
//       if (poi) {
//         // Track which POI is being added to itinerary
//         setPoiBeingAddedToItinerary(poiId);
//         modalStore.setAction({
//           type: "create-itinerary",
//           options: {
//             longitude: parseFloat(poi.longitude),
//             latitude: parseFloat(poi.latitude),
//             poiId: poiId,
//           },
//         });
//       }
//       return;
//     }

//     // Add POI to selected itinerary
//     addPOIToItineraryMutation.mutate(
//       {
//         itineraryId: itineraryId,
//         poiId: poiId,
//       },
//       {
//         onSuccess: (data) => {
//           console.log("Successfully added POI to itinerary:", data);
//           // Mark this POI as added to itinerary
//           setAddedToItineraryPOIs((prev) => new Set(prev).add(poiId));
//           // Invalidate queries to refresh data
//           utils.itinerary.getAllItineraries.invalidate();
//           utils.map.search.invalidate();
//         },
//         onError: (error) => {
//           console.error("Failed to add POI to itinerary:", error);
//           // Check if the error is because the POI is already in the itinerary
//           if (
//             error.message &&
//             error.message.includes("already in this itinerary")
//           ) {
//             console.log("POI is already in this itinerary");
//             // Mark as added even if it was already there
//             setAddedToItineraryPOIs((prev) => new Set(prev).add(poiId));
//           }
//         },
//       }
//     );
//   };

//   const handleLike = () => {
//     if (!currentPOI) return;

//     // Add to liked POIs
//     setLikedPOIs((prev) => [...prev, currentPOI]);

//     // Update tag weights
//     // Increase local tag weight by 1, cap at 5
//     setTagWeights((prev) => {
//       const newWeights = new Map(prev);
//       currentPOI.tags.forEach((tag) => {
//         const prevScore = newWeights.get(tag) ?? 0;
//         const next = Math.min(5, prevScore + 1);
//         newWeights.set(tag, next);
//       });
//       return newWeights;
//     });

//     // Record preference on server (per-POI). Server aggregation is separate.
//     try {
//       indicatePreferenceMutation.mutate({ poiId: currentPOI.id, liked: true });
//     } catch (e) {
//       console.error("Failed to indicate preference:", e);
//     }

//     // Move to the next POI
//     setCurrentIndex((prev) => prev + 1);
//     setTilt(0);
//   };

//   const handleDislike = () => {
//     if (!currentPOI) return;
//     // Decrease local tag weight by 1, floor at -5
//     setTagWeights((prev) => {
//       const newWeights = new Map(prev);
//       currentPOI.tags.forEach((tag) => {
//         const prevScore = newWeights.get(tag) ?? 0;
//         const next = Math.max(-5, prevScore - 1);
//         newWeights.set(tag, next);
//       });
//       return newWeights;
//     });

//     // Record dislike on server (per-POI). Server aggregation is separate.
//     try {
//       indicatePreferenceMutation.mutate({ poiId: currentPOI.id, liked: false });
//     } catch (e) {
//       console.error("Failed to indicate preference (dislike):", e);
//     }

//     // Move to the next POI
//     setCurrentIndex((prev) => prev + 1);
//     setTilt(0);
//   };

//   const handleDrag = (_: any, info: any) => {
//     setTilt(info.offset.x / 10);
//   };

//   const handleDragEnd = (_: any, info: any) => {
//     const container = containerRef.current;
//     if (!container) return;
//     const bounds = container.getBoundingClientRect();
//     const x = info.point.x;

//     if (x > bounds.right - 350) {
//       handleLike();
//     } else if (x < bounds.left + 350) {
//       handleDislike();
//     } else {
//       setTilt(0);
//     }
//   };

//   if (currentIndex >= pois.length) {
//     return (
//       <div
//         className="flex flex-col items-center justify-start h-screen bg-black text-white overflow-y-auto"
//         style={{ paddingTop: "32px" }} // Increased padding to ensure the first POI is fully visible
//       >
//         <h2 className="text-2xl font-bold mb-6">
//           You've completed the carousel!
//         </h2>
//         {recentlyCreatedItinerary && (
//           <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg">
//             ✅ Successfully added to "{recentlyCreatedItinerary}" itinerary!
//           </div>
//         )}
//         {likedPOIs.length > 0 ? (
//           <div className="w-full max-w-2xl">
//             <ul className="space-y-6">
//               {likedPOIs.map((poi) => (
//                 <li
//                   key={poi.id}
//                   className="p-4 bg-gray-800 rounded-lg shadow-md"
//                 >
//                   <h4 className="text-lg font-bold">{poi.name}</h4>
//                   <p className="text-sm text-gray-400">{poi.description}</p>
//                   {/* Tags for liked POI */}
//                   {poi.tags && poi.tags.length > 0 && (
//                     <div
//                       style={{
//                         marginTop: 8,
//                         display: "flex",
//                         gap: 8,
//                         flexWrap: "wrap",
//                       }}
//                     >
//                       {poi.tags.map((tag) => (
//                         <span
//                           key={`${poi.id}-tag-${tag}`}
//                           style={{
//                             background: "rgba(255,255,255,0.04)",
//                             color: "#ddd",
//                             padding: "4px 8px",
//                             borderRadius: 9999,
//                             fontSize: "0.8rem",
//                             border: "1px solid rgba(255,255,255,0.03)",
//                           }}
//                         >
//                           {tag}
//                         </span>
//                       ))}
//                     </div>
//                   )}
//                   {/* POI Image */}
//                   {poi.imageUrl && (
//                     <img
//                       src={
//                         poi.imageUrl.startsWith("http")
//                           ? poi.imageUrl
//                           : `https://${poi.imageUrl}`
//                       }
//                       alt={poi.name}
//                       className="mt-2 rounded-lg max-h-48 object-cover w-full"
//                     />
//                   )}

//                   {/* Action buttons row */}
//                   <div className="mt-4 flex items-center justify-between">
//                     {/* Google Maps Link with Map SVG Icon */}
//                     <a
//                       href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
//                         poi.name
//                       )}`}
//                       target="_blank"
//                       rel="noopener noreferrer"
//                       className="inline-flex items-center justify-center bg-white text-red-500 rounded-full w-10 h-10 shadow-md hover:bg-red-500 hover:text-white hover:scale-110 transition-transform"
//                       aria-label={`View ${poi.name} on Google Maps`}
//                     >
//                       <svg
//                         xmlns="http://www.w3.org/2000/svg"
//                         viewBox="0 0 24 24"
//                         fill="currentColor"
//                         className="w-7 h-7"
//                       >
//                         <path d="M12 2C8.686 2 6 4.686 6 8c0 4.418 6 12 6 12s6-7.582 6-12c0-3.314-2.686-6-6-6zm0 8a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" />
//                       </svg>
//                     </a>

//                     {/* Add to Itinerary Dropdown - Right side */}
//                     {!auth.isSignedIn ? (
//                       <Button
//                         disabled
//                         className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-500 text-gray-300 cursor-not-allowed"
//                       >
//                         <Plus className="w-4 h-4" />
//                         Sign in to Add
//                       </Button>
//                     ) : addedToItineraryPOIs.has(poi.id) ? (
//                       <Button
//                         disabled
//                         className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-600 text-gray-400 cursor-not-allowed"
//                       >
//                         <svg
//                           xmlns="http://www.w3.org/2000/svg"
//                           viewBox="0 0 24 24"
//                           fill="currentColor"
//                           className="w-4 h-4"
//                         >
//                           <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
//                         </svg>
//                         Added
//                       </Button>
//                     ) : addPOIToItineraryMutation.isPending ? (
//                       <Button
//                         disabled
//                         className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white"
//                       >
//                         <Loader2 className="w-4 h-4 animate-spin" />
//                         Adding...
//                       </Button>
//                     ) : itinerariesQuery.isLoading ? (
//                       <Button
//                         disabled
//                         className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white"
//                       >
//                         <Loader2 className="w-4 h-4 animate-spin" />
//                         Loading...
//                       </Button>
//                     ) : (
//                       <DropdownMenu>
//                         <DropdownMenuTrigger asChild>
//                           <Button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 hover:scale-105 transition-all">
//                             <Plus className="w-4 h-4" />
//                             Add to Itinerary
//                             <ChevronDown className="w-4 h-4" />
//                           </Button>
//                         </DropdownMenuTrigger>
//                         <DropdownMenuContent align="end" className="w-56">
//                           {itinerariesQuery.data &&
//                           itinerariesQuery.data.length > 0 ? (
//                             <>
//                               {itinerariesQuery.data.map((itinerary) => (
//                                 <DropdownMenuItem
//                                   key={itinerary.id}
//                                   onClick={() =>
//                                     handleAddToItinerary(poi.id, itinerary.id)
//                                   }
//                                   className="cursor-pointer"
//                                 >
//                                   {itinerary.name}
//                                 </DropdownMenuItem>
//                               ))}
//                               <DropdownMenuItem
//                                 onClick={() => handleAddToItinerary(poi.id)}
//                                 className="cursor-pointer text-blue-600 font-medium"
//                               >
//                                 <Plus className="w-4 h-4 mr-2" />
//                                 Create New Itinerary
//                               </DropdownMenuItem>
//                             </>
//                           ) : (
//                             <DropdownMenuItem
//                               onClick={() => handleAddToItinerary(poi.id)}
//                               className="cursor-pointer text-blue-600 font-medium"
//                             >
//                               <Plus className="w-4 h-4 mr-2" />
//                               Create New Itinerary
//                             </DropdownMenuItem>
//                           )}
//                         </DropdownMenuContent>
//                       </DropdownMenu>
//                     )}
//                   </div>
//                 </li>
//               ))}
//             </ul>
//           </div>
//         ) : (
//           <p className="text-gray-400 mb-4">You haven't liked any POIs yet.</p>
//         )}
//         <button
//           onClick={async () => {
//             try {
//               const obj: Record<string, number> = {};
//               tagWeights.forEach((v, k) => (obj[k] = Number(v)));
//               await logTagWeightsMutation.mutateAsync(obj);
//             } catch (e) {
//               console.error("Failed to log tag weights on server:", e);
//             }
//             router.push("/");
//           }}
//           className="px-6 py-3 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition mt-6"
//         >
//           Exit
//         </button>

//         {/* Modal for creating itineraries */}
//         <MapModal />
//       </div>
//     );
//   }

//   return (
//     <div
//       style={{
//         display: "flex",
//         flexDirection: "column",
//         alignItems: "center",
//         justifyContent: "center",
//         height: "100vh",
//         backgroundColor: "#000", // Dark background for a cinematic feel
//         color: "#fff", // White text for contrast
//       }}
//     >
//       {/* Image Container */}
//       <motion.div
//         ref={containerRef}
//         drag="x"
//         dragConstraints={{ left: 0, right: 0 }}
//         onDrag={handleDrag}
//         onDragEnd={handleDragEnd}
//         style={{
//           position: "relative",
//           width: "75%", // Landscape width
//           height: "60vh", // Landscape height
//           borderRadius: "16px", // Rounded corners for the image
//           overflow: "hidden",
//           boxShadow: "0 4px 24px rgba(0, 0, 0, 0.5)", // Cinematic shadow
//           rotate: `${tilt}deg`, // Tilt effect
//         }}
//       >
//         {/* Home Button Overlay */}
//         <button
//           onClick={async () => {
//             try {
//               const obj: Record<string, number> = {};
//               tagWeights.forEach((v, k) => (obj[k] = Number(v)));
//               await logTagWeightsMutation.mutateAsync(obj);
//             } catch (e) {
//               console.error("Failed to log tag weights on server:", e);
//             }
//             router.push("/");
//           }}
//           style={{
//             position: "absolute",
//             top: 16,
//             left: 16, // Position it on the top-left corner
//             background: "#fff", // Gradient background
//             color: "#007bff",
//             border: "none",
//             borderRadius: "50%",
//             width: 64,
//             height: 64,
//             display: "flex",
//             alignItems: "center",
//             justifyContent: "center",
//             boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)", // Stronger shadow for depth
//             cursor: "pointer",
//             transition: "transform 0.2s ease, box-shadow 0.2s ease", // Smooth hover animation
//           }}
//           onMouseEnter={(e) => {
//             e.currentTarget.style.transform = "scale(1.1)"; // Slightly enlarge on hover
//             e.currentTarget.style.boxShadow = "0 6px 16px rgba(0, 0, 0, 0.3)"; // Enhance shadow on hover
//           }}
//           onMouseLeave={(e) => {
//             e.currentTarget.style.transform = "scale(1.1)"; // Reset scale
//             e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.2)"; // Reset shadow
//           }}
//           aria-label="Home"
//         >
//           <svg
//             width="36" // Adjusted width for better alignment
//             height="36" // Adjusted height for better alignment
//             viewBox="0 0 24 24" // Ensure the viewBox is correct
//             fill="none"
//             xmlns="http://www.w3.org/2000/svg"
//             style={{
//               display: "block", // Ensures no extra space around the SVG
//               margin: "auto", // Centers the SVG inside the button
//             }}
//           >
//             <path
//               d="M3 10.5L12 3l9 7.5M5 10v10a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-6h2v6a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1V10"
//               stroke="#007bff"
//               strokeWidth="2"
//               strokeLinecap="round"
//               strokeLinejoin="round"
//             />
//           </svg>
//         </button>
//         {currentPOI.imageUrl ? (
//           <img
//             src={
//               currentPOI.imageUrl.startsWith("http")
//                 ? currentPOI.imageUrl
//                 : `https://${currentPOI.imageUrl}`
//             }
//             alt={currentPOI.name}
//             draggable={false}
//             style={{
//               width: "100%",
//               height: "100%",
//               objectFit: "cover", // Ensure the image covers the container
//             }}
//           />
//         ) : (
//           <div
//             style={{
//               width: "100%",
//               height: "100%",
//               display: "flex",
//               alignItems: "center",
//               justifyContent: "center",
//               background: "#333",
//               color: "#fff",
//               fontWeight: "bold",
//               fontSize: "1.2rem",
//             }}
//           >
//             Image Not Available!
//           </div>
//         )}

//         {/* Buttons Overlay */}
//         <div
//           style={{
//             position: "absolute",
//             bottom: "16px",
//             width: "100%",
//             display: "flex",
//             justifyContent: "space-between",
//             padding: "0 16px",
//           }}
//         >
//           {/* Dislike Button */}
//           <button
//             style={{
//               background: "#fff",
//               border: "none",
//               borderRadius: "50%",
//               boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
//               width: 64,
//               height: 64,
//               display: "flex",
//               alignItems: "center",
//               justifyContent: "center",
//               cursor: "pointer",
//               transition: "transform 0.2s ease, box-shadow 0.2s ease",
//             }}
//             onMouseEnter={(e) => {
//               e.currentTarget.style.transform = "scale(1.1)";
//               e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.3)";
//             }}
//             onMouseLeave={(e) => {
//               e.currentTarget.style.transform = "scale(1)";
//               e.currentTarget.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.15)";
//             }}
//             aria-label="Dislike"
//             onClick={handleDislike}
//           >
//             <svg
//               width="36"
//               height="36"
//               viewBox="0 0 24 24"
//               fill="none"
//               xmlns="http://www.w3.org/2000/svg"
//             >
//               <line
//                 x1="6"
//                 y1="6"
//                 x2="18"
//                 y2="18"
//                 stroke="#ff4d4f"
//                 strokeWidth="2"
//                 strokeLinecap="round"
//               />
//               <line
//                 x1="18"
//                 y1="6"
//                 x2="6"
//                 y2="18"
//                 stroke="#ff4d4f"
//                 strokeWidth="2"
//                 strokeLinecap="round"
//               />
//             </svg>
//           </button>

//           {/* Like Button */}
//           <button
//             style={{
//               background: "#fff",
//               border: "none",
//               borderRadius: "50%",
//               boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
//               width: 64,
//               height: 64,
//               display: "flex",
//               alignItems: "center",
//               justifyContent: "center",
//               cursor: "pointer",
//               transition: "transform 0.2s ease, box-shadow 0.2s ease",
//             }}
//             onMouseEnter={(e) => {
//               e.currentTarget.style.transform = "scale(1.1)";
//               e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.3)";
//             }}
//             onMouseLeave={(e) => {
//               e.currentTarget.style.transform = "scale(1)";
//               e.currentTarget.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.15)";
//             }}
//             aria-label="Like"
//             onClick={handleLike}
//           >
//             <svg
//               width="36"
//               height="36"
//               viewBox="0 0 24 24"
//               fill="#52c41a"
//               xmlns="http://www.w3.org/2000/svg"
//             >
//               <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
//             </svg>
//           </button>
//         </div>
//       </motion.div>

//       {/* Name, Description, and Tags */}
//       <div
//         style={{
//           textAlign: "center",
//           marginTop: "16px",
//           padding: "0 16px",
//         }}
//       >
//         <h1 style={{ fontSize: "1.5rem", fontWeight: "bold" }}>
//           {currentPOI.name}
//         </h1>
//         <p style={{ fontSize: "1rem", color: "#ccc" }}>
//           {currentPOI.description}
//         </p>

//         {/* Tags */}
//         {currentPOI.tags && currentPOI.tags.length > 0 && (
//           <div
//             style={{
//               marginTop: 8,
//               display: "flex",
//               gap: 8,
//               justifyContent: "center",
//               flexWrap: "wrap",
//             }}
//           >
//             {currentPOI.tags.map((tag) => (
//               <span
//                 key={tag}
//                 style={{
//                   background: "rgba(255,255,255,0.06)",
//                   color: "#ddd",
//                   padding: "6px 10px",
//                   borderRadius: 9999,
//                   fontSize: "0.85rem",
//                   border: "1px solid rgba(255,255,255,0.04)",
//                 }}
//               >
//                 {tag}
//               </span>
//             ))}
//           </div>
//         )}
//       </div>

//       {/* Progress Indicator */}
//       <div
//         style={{
//           width: "100%",
//           textAlign: "center",
//           fontSize: "1rem",
//           color: "#555",
//           padding: "8px 0",
//         }}
//       >
//         {`Image ${currentIndex + 1} of ${pois.length}`}
//       </div>

//       {/* Modal for creating itineraries */}
//       <MapModal />
//     </div>
//   );
// }
