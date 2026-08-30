import { getSessionReseller } from "../_utils/auth.js";
import { renderDashboard } from "../partner/dashboard.js";

// Vékony wrapper a megosztott renderDashboard() köré - a tényleges
// tartalom/logika 100%-ban azonos a viszonteladói dashboarddal
// (functions/partner/dashboard.js), csak a márkajelzés és a linkek térnek el
// (ld. dashboard.js brandSuffix/accountHref). A user kérésére (2026-08-30)
// a magánszemélyes fiókok SOSEM jelenhetnek meg a /partner/ útvonalon.
export async function onRequestGet(context) {
  const { request, env } = context;
  const reseller = await getSessionReseller(request, env.DB);
  if (!reseller) return Response.redirect(new URL("/sajat/bejelentkezes", request.url).href, 303);
  if (reseller.fiok_tipus !== "maganszemely") return Response.redirect(new URL("/partner/dashboard", request.url).href, 303);
  return renderDashboard(context, reseller);
}
