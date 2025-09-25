"use client";

import Link from "next/link";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { Favicon } from "./icons/Favicon";
import { MoonIcon, SunIcon } from "lucide-react";
import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { useThemeStore } from "./theme-store";
import { useShallow } from "zustand/react/shallow";
import { Button } from "./ui/button";
import {
  ImageToIcoToolIcon,
  QRCodeToolIcon,
  ShareToolIcon,
} from "./icons/tool-icons";

const components = [
  {
    title: "QR Code",
    href: "/qrcode",
    description: "Generate QR codes for your website or application",
    icon: <QRCodeToolIcon />,
  },
  {
    title: "Image to ICO",
    href: "/img-to-ico",
    description: "Convert images to ICO files",
    icon: <ImageToIcoToolIcon />,
  },
  {
    title: "Share",
    href: "/share",
    description: "Share your content with others",
    icon: <ShareToolIcon />,
  },
];

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
            <div className="text-base font-bold">FTOOLS</div>

            {/* <div className="relative h-6 aspect-[150/53]">
              <FStarsLogo />
            </div> */}
          </Link>
          {/* <Button variant="ghost" asChild className="h-full">
            <Link href="/qrcode">QR Code</Link>
          </Button> */}
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger>Tools</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="grid w-[400px] gap-2 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                    {components.map((component) => (
                      <NavigationMenuLink
                        key={component.title}
                        title={component.title}
                        href={component.href}
                        asChild
                      >
                        <Link
                          href={component.href}
                          className="flex flex-row gap-2"
                        >
                          {component.icon}

                          <div className="flex-1 flex flex-col gap-1">
                            <div className="flex flex-row items-center gap-2">
                              <h3 className="text-sm font-bold">
                                {component.title}
                              </h3>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {component.description}
                            </p>
                          </div>
                        </Link>
                      </NavigationMenuLink>
                    ))}
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
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

          {/* <Button variant="default" asChild>
            <Link href="/new">
              <PlusIcon className="h-4 w-4" />
              New
            </Link>
          </Button> */}
        </div>
      </div>
    </nav>
  );
}
