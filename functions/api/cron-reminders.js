import { runReminderJob } from "../_utils/reminders.js";

// Az ütemezett Worker (worker/index.js, 15 percenként) hívja. A CRON_SECRET
// megosztott titokkal védett - nélküle senki nem indíthatja a feladatot.
// Teszteléshez (csak érvényes titokkal): ?teszt=1 a leveleket az ADMIN_EMAIL-re
// irányítja a valódi címzett helyett, ?par_id=<id> egyetlen oldalra szűkít.
function safeEqual(a, b) {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const header = request.headers.get("Authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!env.CRON_SECRET || !token || !safeEqual(token, env.CRON_SECRET)) {
    return new Response("unauthorized", { status: 401 });
  }

  const url = new URL(request.url);
  const opts = {};
  if (url.searchParams.get("teszt") === "1") opts.tesztCimzett = env.ADMIN_EMAIL;
  const parId = parseInt(url.searchParams.get("par_id") || "", 10);
  if (parId) opts.csakParId = parId;

  const summary = await runReminderJob(env, opts);
  return Response.json(summary);
}
