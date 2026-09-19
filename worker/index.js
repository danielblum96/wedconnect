export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(run(env));
  },
  async fetch() {
    return new Response("wedconnect-cron", { status: 200 });
  },
};

async function run(env) {
  const response = await fetch(`${env.SITE_URL}/api/cron-reminders`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.CRON_SECRET}` },
  });
  const body = await response.text();
  if (!response.ok) console.error(`cron-reminders hiba ${response.status}: ${body}`);
  else console.log(`cron-reminders ok: ${body}`);
}
