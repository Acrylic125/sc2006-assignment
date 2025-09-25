import { Favicon } from "@/components/icons/Favicon";
import { MainNavbar } from "@/components/navbar";
import { ScrollArea } from "@/components/ui/scroll-area";
import Image from "next/image";

export default function Home() {
  return (
    <div className="w-full h-full flex flex-col items-center bg-background">
      <MainNavbar />
      <ScrollArea className="w-full h-[100svh-64px]">
        <div className="w-full flex flex-col items-center"></div>
      </ScrollArea>
    </div>
  );
}
