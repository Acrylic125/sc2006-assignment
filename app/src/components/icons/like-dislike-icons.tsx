import { cn } from "@/lib/utils";
import { ThumbsUp } from "lucide-react";
import { ThumbsDown } from "lucide-react";

export function LikeButton({
  active,
  className,
}: {
  active: boolean;
  className?: string;
}) {
  return (
    <ThumbsUp
      className={cn(
        "size-4",
        {
          "stroke-primary fill-primary/25 dark:fill-primary/25": active,
          "stroke-muted-foreground/50 fill-secondary": !active,
        },
        className
      )}
    />
  );
}
export function DislikeButton({
  active,
  className,
}: {
  active: boolean;
  className?: string;
}) {
  return (
    <ThumbsDown
      className={cn(
        "size-4",
        {
          "stroke-red-400 fill-red-200/25 dark:fill-red-700/25": active,
          "stroke-muted-foreground/50 fill-secondary": !active,
        },
        className
      )}
    />
  );
}
