import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  const isStaffRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/pipeline") ||
    pathname.startsWith("/clients") ||
    pathname.startsWith("/agreements") ||
    pathname.startsWith("/invoices") ||
    pathname.startsWith("/settings");

  const isPortalRoute = pathname.startsWith("/portal");
  const isLoginPage = pathname === "/login";

  // Derive user type from metadata set at invite/signup time
  const userType: "staff" | "client" =
    user?.user_metadata?.user_type === "client" ? "client" : "staff";

  // ── Unauthenticated ──────────────────────────────────────────
  if (!user && (isStaffRoute || isPortalRoute)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // ── Authenticated on login page → redirect to home ──────────
  if (user && isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = userType === "client" ? "/portal" : "/dashboard";
    return NextResponse.redirect(url);
  }

  // ── Client trying to access staff routes ─────────────────────
  if (user && userType === "client" && isStaffRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/portal";
    return NextResponse.redirect(url);
  }

  // ── Staff trying to access portal routes ─────────────────────
  if (user && userType === "staff" && isPortalRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
