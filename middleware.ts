import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher(['/login(.*)', '/signup(.*)', '/']);
const isAuthRoute = createRouteMatcher(['/login(.*)', '/signup(.*)']);

export default clerkMiddleware(async (auth, request) => {
  const { userId } = await auth();

  // If the user is logged in and trying to access login/signup, redirect to dashboard
  if (userId && isAuthRoute(request)) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
