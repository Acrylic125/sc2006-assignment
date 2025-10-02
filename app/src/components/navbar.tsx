"use client";

import Link from "next/link";
import { Favicon } from "./icons/Favicon";
import { MoonIcon, SunIcon } from "lucide-react";
import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { useThemeStore } from "./theme-store";
import { useShallow } from "zustand/react/shallow";
import { Button } from "./ui/button";

export function MainNavbar() {
  const { theme, setTheme } = useThemeStore(
    useShallow(({ theme, setTheme }) => ({
      theme,
      setTheme,
    }))
  );
  const { user } = useUser();

  return (
    <nav className="w-full flex flex-col items-center border-b border-border">
      <div className="w-full h-14 md:h-16 max-w-ui flex flex-row items-center justify-between py-1.5 px-4 md:px-8">
        <div className="flex flex-row items-center h-full">
          <Link href="/" className="h-full flex flex-row gap-2.5 items-center">
            <div className="relative h-full aspect-square w-6">
              <Favicon />
            </div>
            <div className="text-base font-bold">FSG</div>
          </Link>
          <Button variant="ghost" asChild className="h-full">
            <Link href="/">Explore</Link>
          </Button>
        </div>
        <div className="flex flex-row items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          >
            {theme === "dark" ? (
              <SunIcon className="h-4 w-4" />
            ) : (
              <MoonIcon className="h-4 w-4" />
            )}
          </Button>
          {user ? <UserButton /> : <SignInButton />}
        </div>
      </div>
    </nav>
  );
}
