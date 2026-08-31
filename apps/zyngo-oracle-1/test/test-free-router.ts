import 'dotenv/config';

async function test() {
  const apiKey = process.env.OPEN_ROUTER_API_KEY;
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://yoma.world',
      'X-Title': 'ZynGo Oracle',
    },
    body: JSON.stringify({
      model: 'openrouter/free',
      messages: [{ role: 'user', content: 'How many rs are in strawberry?' }],
    }),
  });

  console.log('Status:', res.status);
  const data = await res.json();
  console.log('Response:', JSON.stringify(data, null, 2));
}

test().catch(console.error);
