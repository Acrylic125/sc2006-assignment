"use client";

import { Button } from "../ui/button";
import { useMapStore } from "./map-store";
import { useShallow } from "zustand/react/shallow";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, Filter, Tag } from "lucide-react";
import { trpc } from "@/server/client";
import { Badge } from "@/components/ui/badge";

export function FilterDropdown() {
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

export function FilterTagsDropdown() {
  const tagsQuery = trpc.map.getTags.useQuery();
  const mapStore = useMapStore(
    useShallow(({ filters, setFilterExcludedTags }) => {
      return {
        excludedTags: filters.excludedTags,
        setFilterExcludedTags,
      };
    })
  );

  const allTags = tagsQuery.data?.map((tag) => tag.id) || [];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={mapStore.excludedTags.size > 0 ? "default" : "outline"}
        >
          <Tag /> <span className="hidden lg:block">Tags</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="max-h-64 w-48 overflow-y-auto">
        <DropdownMenuLabel>Tags</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div
          className="w-full"
        >
          <Button
            variant="ghost"
            className="w-full flex flex-row items-center gap-2 justify-start px-2"
            onClick={() => {
              if(allTags.length === mapStore.excludedTags.size) {
                mapStore.setFilterExcludedTags(new Set());
                console.log(mapStore.excludedTags);
              } else {
                mapStore.setFilterExcludedTags(new Set(allTags));
                console.log(mapStore.excludedTags);
              }
            }}
          >
            <span className="w-4">
              {allTags.length !== mapStore.excludedTags.size && (
                <Check className="size-4" />
              )}
            </span>
            <span>[Select All]</span>
          </Button>
        </div>
        {tagsQuery.data?.map((tag) => (
          <Button
            key={tag.id}
            variant="ghost"
            className="w-full flex flex-row items-center gap-2 justify-start px-2"
            onClick={() => {
              const currentExcludedTags = new Set(mapStore.excludedTags);
              if (mapStore.excludedTags.has(tag.id)) {
                currentExcludedTags.delete(tag.id);
                mapStore.setFilterExcludedTags(currentExcludedTags);
              } else {
                currentExcludedTags.add(tag.id);
                mapStore.setFilterExcludedTags(currentExcludedTags);
              }
            }}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <span className="w-4">
                  {!mapStore.excludedTags.has(tag.id) && (
                    <Check className="size-4" />
                  )}
                </span>
                <span>{tag.name}</span>
              </div>
              <Badge
                variant="outline"
              >
                {tag.count}
              </Badge>
            </div>
          </Button>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
