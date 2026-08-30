import { getSessionReseller } from "../_utils/auth.js";
import { renderAccount } from "../partner/account.js";

// Ld. functions/sajat/dashboard.js ugyanilyen megjegyzését - vékony wrapper
// a megosztott renderAccount() köré.
export async function onRequestGet(context) {
  const { request, env } = context;
  const reseller = await getSessionReseller(request, env.DB);
  if (!reseller) return Response.redirect(new URL("/sajat/bejelentkezes", request.url).href, 303);
  if (reseller.fiok_tipus !== "maganszemely") return Response.redirect(new URL("/partner/account", request.url).href, 303);
  return renderAccount(context, reseller);
}
