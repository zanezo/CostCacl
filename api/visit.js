export default {
  async fetch(request) {
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'POST' } });
    }

    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      return Response.json({ error: 'Visit counter is not configured' }, { status: 503 });
    }

    const response = await fetch(`${url}/incr/cost-calc:visits`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      return Response.json({ error: 'Visit counter is unavailable' }, { status: 502 });
    }

    const payload = await response.json();
    return Response.json(
      { count: Number(payload.result) },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  },
};
