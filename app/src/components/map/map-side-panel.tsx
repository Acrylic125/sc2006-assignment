"use client";

import { useMapStore } from "@/components/map/map-store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useShallow } from "zustand/react/shallow";
import { ViewItineraryPanel } from "@/components/map/view-itinerary-side-panel";
import { ViewPOIPanel } from "@/components/map/view-poi-side-panel";

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

export function SidePanel() {
  const mapStore = useMapStore(
    useShallow(({ currentSidePanelTab }) => {
      return {
        currentSidePanelTab,
      };
    })
  );

  if (mapStore.currentSidePanelTab === "itinerary") {
    return <ViewItineraryPanel />;
  } else {
    return <ViewPOIPanel />;
  }
}
// "use client";

// import { useMapStore } from "@/components/map/map-store";
// import { Button } from "@/components/ui/button";
// import { cn } from "@/lib/utils";
// import { useShallow } from "zustand/react/shallow";
// import { ViewItineraryPanel } from "@/components/map/view-itinerary-side-panel";
// import { ViewPOIPanel } from "@/components/map/view-poi-side-panel";

// const sidePanelTabs = [
//   {
//     id: "itinerary",
//     label: "Itinerary",
//   },
//   {
//     id: "place",
//     label: "Place",
//   },
// ] as const;

// export function SidePanelTabGroup() {
//   const mapStore = useMapStore(
//     useShallow(({ currentSidePanelTab, setCurrentSidePanelTab }) => {
//       return {
//         currentSidePanelTab,
//         setCurrentSidePanelTab,
//       };
//     })
//   );

//   return (
//     <div className="flex flex-row bg-secondary/75 backdrop-blur-sm rounded-full border border-border p-1">
//       {sidePanelTabs.map((tab) => {
//         return (
//           <Button
//             key={tab.id}
//             variant={
//               mapStore.currentSidePanelTab === tab.id ? "default" : "ghost"
//             }
//             onClick={() => {
//               mapStore.setCurrentSidePanelTab(tab.id);
//             }}
//             size="sm"
//             className={cn("rounded-full shadow-sm text-sm py-1 px-2.5 h-fit", {
//               "border-border border": mapStore.currentSidePanelTab === tab.id,
//             })}
//           >
//             {tab.label}
//           </Button>
//         );
//       })}
//     </div>
//   );
// }

// export function SidePanel() {
//   const mapStore = useMapStore(
//     useShallow(({ currentSidePanelTab }) => {
//       return {
//         currentSidePanelTab,
//       };
//     })
//   );

//   if (mapStore.currentSidePanelTab === "itinerary") {
//     return <ViewItineraryPanel />;
//   } else {
//     return <ViewPOIPanel />;
//   }
// }
