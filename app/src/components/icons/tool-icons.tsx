import { cn } from "@/lib/utils";
import { ArrowLeftRight, QrCode, Share, Share2 } from "lucide-react";

export function QRCodeToolIcon({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "w-8 h-8 flex items-center justify-center rounded-md bg-purple-300/15 border p-1",
        className
      )}
    >
      <QrCode className="h-full w-full dark:text-purple-400 text-purple-900" />
    </div>
  );
}

export function ImageToIcoToolIcon({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "w-8 h-8 flex items-center justify-center rounded-md bg-yellow-50 dark:bg-yellow-300/15 border p-1",
        className
      )}
    >
      <ArrowLeftRight className="h-full w-full dark:text-yellow-500 text-yellow-900" />
    </div>
  );
}

export function ShareToolIcon({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "w-8 h-8 flex items-center justify-center rounded-md bg-green-300/25 dark:bg-green-300/15 border p-1",
        className
      )}
    >
      <Share2 className="h-full w-full dark:text-green-500 text-green-700" />
    </div>
  );
}
