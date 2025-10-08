import { clerkMiddleware } from "@clerk/nextjs/server";
import { nanoid } from "nanoid";
import { cookies } from "next/headers";
import { NextFetchEvent, NextRequest } from "next/server";

// export default clerkMiddleware();

const _clerkmiddleWare = clerkMiddleware();

export default async function middleware(
  request: NextRequest,
  event: NextFetchEvent
) {
  // TODO: Remove later.
  const c = await cookies();
  const fakeUserIdCookie = c.get("fakeUserId");
  let fakeUserId = fakeUserIdCookie?.value;
  if (!fakeUserId) {
    fakeUserId = nanoid(24);
    c.set("fakeUserId", `fusr.${fakeUserId}`);
  }
  return _clerkmiddleWare(request, event);
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
