import 'dotenv/config';
import { createInvocation, generateKeypair, serializeInvocation } from '@ixo/ucan';

const API_URL = process.env.API_URL ?? `http://localhost:${process.env.PORT ?? 4000}`;
const ORACLE_DID = process.env.ORACLE_DID;

if (!ORACLE_DID) {
  console.error('Missing ORACLE_DID in .env');
  process.exit(1);
}

async function getAuthToken(): Promise<string> {
  // Generate valid ephemeral Ed25519 UCAN signer
  const { signer } = await generateKeypair();
  const now = Math.floor(Date.now() / 1000);
  const invocation = await createInvocation({
    issuer: signer,
    audience: ORACLE_DID!,
    capability: { can: '*', with: 'ixo:oracle' },
    expiration: now + 900,
  });

  return serializeInvocation(invocation);
}

async function main() {
  const messageText =
    process.argv.slice(2).join(' ') ||
    'Hello ZynGo Oracle! What opportunities or verification services do you provide?';

  console.log(`\n\x1b[36mConnecting to ZynGo-Oracle-1 at ${API_URL}...\x1b[0m`);
  console.log(`\x1b[33mUser Prompt:\x1b[0m "${messageText}"\n`);

  try {
    const token = await getAuthToken();

    // 1. Create Session
    const sessionRes = await fetch(`${API_URL}/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ title: 'Terminal Chat Session' }),
    });

    if (!sessionRes.ok) {
      const err = await sessionRes.text();
      throw new Error(`Failed to create session (${sessionRes.status}): ${err}`);
    }

    const sessionData = (await sessionRes.json()) as { id: string };
    const sessionId = sessionData.id;
    console.log(`\x1b[90m[Session ID: ${sessionId}]\x1b[0m\n\x1b[32mAgent Response:\x1b[0m `);

    // 2. Stream Chat Message
    const msgRes = await fetch(`${API_URL}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        sessionId,
        content: messageText,
      }),
    });

    if (!msgRes.ok || !msgRes.body) {
      const err = await msgRes.text();
      throw new Error(`Failed to send message (${msgRes.status}): ${err}`);
    }

    const reader = msgRes.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const raw = line.slice(6).trim();
          if (raw === '[DONE]') continue;
          try {
            const event = JSON.parse(raw);
            if (event.content) {
              process.stdout.write(event.content);
            } else if (event.type === 'token' && event.token) {
              process.stdout.write(event.token);
            }
          } catch {
            process.stdout.write(raw);
          }
        }
      }
    }

    console.log('\n\n\x1b[90m--- End of stream ---\x1b[0m\n');
  } catch (error) {
    console.error('\n\x1b[31mChat error:\x1b[0m', error);
  }
}

main();
