import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDurationToClosestUnit(durationMs: number): string {
  const ONE_SECOND_MS = 1000;
  const ONE_MINUTE_MS = 60 * ONE_SECOND_MS;
  const ONE_HOUR_MS = 60 * ONE_MINUTE_MS;
  const ONE_DAY_MS = 24 * ONE_HOUR_MS;
  const ONE_WEEK_MS = 7 * ONE_DAY_MS;

  const absoluteDurationMs = Math.abs(durationMs);

  if (absoluteDurationMs >= ONE_WEEK_MS - ONE_DAY_MS / 2) {
    const weeks = Math.round(absoluteDurationMs / ONE_WEEK_MS);
    return `${weeks}w`;
  } else if (absoluteDurationMs >= ONE_DAY_MS - ONE_HOUR_MS / 2) {
    const days = Math.round(absoluteDurationMs / ONE_DAY_MS);
    return `${days}d`;
  } else if (absoluteDurationMs >= ONE_HOUR_MS - ONE_MINUTE_MS / 2) {
    const hours = Math.round(absoluteDurationMs / ONE_HOUR_MS);
    return `${hours}h`;
  } else if (absoluteDurationMs >= ONE_MINUTE_MS - ONE_SECOND_MS / 2) {
    const minutes = Math.round(absoluteDurationMs / ONE_MINUTE_MS);
    return `${minutes}m`;
  } else {
    const seconds = Math.round(absoluteDurationMs / ONE_SECOND_MS);
    return `${seconds}s`;
  }
}
