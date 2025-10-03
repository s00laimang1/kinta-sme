import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

// Define only public routes - everything else requires authentication
const PUBLIC_ROUTES = [
  "/",
  "/auth/sign-in",
  "/auth/sign-up",
  "/auth/forget-password",
  "/api/auth/",
  "/api/auth/sign-up",
  "/api/account/bank/verify-transaction",
  "/api/account/bank/verify-bill-stack-transaction",
  "/auth/reset-password",
  "/api/auth/reset-password",
  "/sitemap.xml",
  "/privacy",
  "/terms",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const response = NextResponse.next();

  // Enhanced security headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  // Uncommented and modified CSP to allow fonts from common providers
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data:; font-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com https://use.typekit.net https://use.fontawesome.com; connect-src 'self' https://miscellaneous-kinta.vercel.app; frame-ancestors 'none';"
  );

  response.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );

  // Check if the current path is public
  const isPublicPath = PUBLIC_ROUTES.some((path) => pathname.startsWith(path));

  // Get the authentication token
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (pathname === "/api/account/me/generate-dedicated-account/") {
    return new NextResponse(JSON.stringify("Too Many Request"), {
      status: 400,
    });
  }

  // Handle unauthenticated users trying to access protected pages
  if (!isPublicPath && !token) {
    // For API routes, return a proper 401 response
    if (pathname.startsWith("/api/")) {
      return new NextResponse(
        JSON.stringify({ error: "Unauthorized access" }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "X-XSS-Protection": "1; mode=block",
          },
        }
      );
    }

    // For regular routes, redirect to sign-in (not to root to avoid loops)
    return NextResponse.redirect(new URL("/auth/sign-in", request.url));
  }

  // Check for admin routes - restrict to admin users only
  if (pathname.startsWith("/api/admin/") || pathname.startsWith("/admin/")) {
    // Verify the user has admin role
    const userRole = token?.role;

    if (!pathname.startsWith("/api/admin/settings") && userRole !== "admin") {
      return new NextResponse(
        JSON.stringify({ error: "Forbidden: Admin access required" }),
        {
          status: 403,
          headers: {
            "Content-Type": "application/json",
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "X-XSS-Protection": "1; mode=block",
          },
        }
      );
    }
  }

  return response;
}

// Configure which paths the middleware runs on
export const config = {
  matcher: [
    // Apply to all routes except static files and other exceptions
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:jpg|jpeg|gif|png|svg)).*)",
  ],
};
