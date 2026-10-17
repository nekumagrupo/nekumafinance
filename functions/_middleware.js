const SITE_HOST = "nekumafinance.app";
const APP_HOST = "app.nekumafinance.app";
const ADMIN_HOST = "admin.nekumafinance.app";

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const legacyHost = url.hostname === "nekuma-finance.pages.dev" || url.hostname.endsWith(".nekuma-finance.pages.dev");
  const appPath = /^\/app(?:\.html)?\/?$/.test(url.pathname);
  const authReturn = url.searchParams.has("auth") || url.searchParams.has("code");
  const adminPath = /^\/admin(?:\.html)?\/?$/.test(url.pathname);

  // The admin is a separate entry point, never an app tab or an auth return.
  if (url.hostname === ADMIN_HOST) {
    if (["/", "/index.html"].includes(url.pathname)) {
      url.pathname = "/admin";
      url.search = "";
      return Response.redirect(url.href, 302);
    }
    const adminAsset = /^\/(?:admin\.(?:css|js)|supabase-config\.js|assets\/(?:nekuma-logo-192\.png|vendor\/lucide\.min\.js))$/.test(url.pathname);
    if (!adminPath && !adminAsset && url.pathname !== "/api/admin/delete-user") return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
    return context.next();
  }
  if (adminPath && (url.hostname === APP_HOST || legacyHost)) {
    url.hostname = SITE_HOST;
    url.protocol = "https:";
    url.pathname = "/admin";
    url.search = "";
    return Response.redirect(url.href, 302);
  }
  if (adminPath) return context.next();

  if (legacyHost) {
    // Do not forward authenticated API payloads between origins.
    if (url.pathname.startsWith("/api/") || !["GET", "HEAD"].includes(context.request.method)) {
      return new Response("Use https://app.nekumafinance.app", { status: 410, headers: { "Cache-Control": "no-store" } });
    }
    url.hostname = appPath || authReturn ? APP_HOST : SITE_HOST;
    url.protocol = "https:";
    if (appPath || authReturn) url.pathname = "/app";
    return Response.redirect(url.href, 308);
  }

  if (url.hostname === SITE_HOST && (appPath || authReturn)) {
    url.hostname = APP_HOST;
    url.pathname = "/app";
    return Response.redirect(url.href, 308);
  }
  if (url.hostname === APP_HOST && ["/", "/index.html"].includes(url.pathname)) {
    url.pathname = "/app";
    return Response.redirect(url.href, 308);
  }
  return context.next();
}
