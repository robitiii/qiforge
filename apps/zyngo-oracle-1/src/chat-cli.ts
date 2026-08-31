import 'dotenv/config';
import {
  createDelegation,
  createInvocation,
  serializeDelegation,
  serializeInvocation,
  signerFromMnemonic,
  type Capability,
} from '@ixo/ucan';

const API_URL = (process.env.API_URL ?? `http://localhost:${process.env.PORT ?? 4000}`).replace(/\/$/, '');
const ORACLE_DID = process.env.ORACLE_DID;
const MNEMONIC =
  process.env.TEST_USER_MNEMONIC ??
  process.env.SECP_MNEMONIC ??
  'elbow mansion rifle whip double report high lava seat proof smooth float';

if (!ORACLE_DID) {
  console.error('Missing ORACLE_DID in .env');
  process.exit(1);
}

const AUTH_CAPABILITY: Capability = {
  can: '*',
  with: 'ixo:oracle',
};

const ALL_CAPABILITIES: Capability[] = [
  { can: 'memory/*', with: 'ixo:memory' },
  { can: 'sandbox/*', with: 'ixo:sandbox' },
  { can: 'skills/*', with: 'ixo:skills' },
  { can: 'subscriptions/read', with: 'ixo:subscriptions' },
];

async function mintAuthHeaders() {
  const { signer, did: userDid } = await signerFromMnemonic(MNEMONIC);
  const now = Math.floor(Date.now() / 1000);

  // 1. Invocation (Auth Token)
  const invocation = await createInvocation({
    issuer: signer,
    audience: ORACLE_DID!,
    capability: AUTH_CAPABILITY,
    proofs: [],
    expiration: now + 300,
  });
  const invocationToken = await serializeInvocation(invocation);

  // 2. Delegation (Capabilities)
  const delegation = await createDelegation({
    issuer: signer,
    audience: ORACLE_DID!,
    capabilities: ALL_CAPABILITIES,
    expiration: now + 7 * 24 * 60 * 60,
  });
  const delegationToken = await serializeDelegation(delegation);

  return {
    userDid,
    headers: {
      Authorization: `Bearer ${invocationToken}`,
      'X-Auth-Type': 'ucan',
      'x-ucan-delegation': delegationToken,
    },
  };
}

async function main() {
  const messageText =
    process.argv.slice(2).join(' ') ||
    'Hello ZynGo Oracle! What opportunities or verification services do you provide?';

  console.log(`\n\x1b[36mConnecting to ZynGo-Oracle-1 at ${API_URL}...\x1b[0m`);
  console.log(`\x1b[33mUser Prompt:\x1b[0m "${messageText}"\n`);

  try {
    const { userDid, headers: authHeaders } = await mintAuthHeaders();
    console.log(`\x1b[90m[User DID: ${userDid}]\x1b[0m`);

    // 1. Create Session
    const sessionRes = await fetch(`${API_URL}/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({
        title: 'Terminal Chat Session',
        homeServer: 'testmx.ixo.earth',
      }),
    });

    if (!sessionRes.ok) {
      const err = await sessionRes.text();
      throw new Error(`Failed to create session (${sessionRes.status}): ${err}`);
    }

    const sessionData = (await sessionRes.json()) as { id?: string; sessionId?: string };
    const sessionId = sessionData.sessionId ?? sessionData.id;
    if (!sessionId) {
      throw new Error('No sessionId returned from /sessions');
    }
    console.log(`\x1b[90m[Session ID: ${sessionId}]\x1b[0m\n\x1b[32mAgent Response:\x1b[0m `);

    // 2. Stream Chat Message to POST /messages/:sessionId
    const msgRes = await fetch(`${API_URL}/messages/${encodeURIComponent(sessionId)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...authHeaders,
      },
      body: JSON.stringify({
        message: messageText,
        stream: true,
        timezone: 'UTC',
      }),
    });

    if (!msgRes.ok || !msgRes.body) {
      const err = await msgRes.text();
      throw new Error(`Failed to send message (${msgRes.status}): ${err}`);
    }

    const reader = msgRes.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let currentEvent = '';
    let currentData = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed === '' || trimmed.startsWith(':')) {
          if (currentEvent && currentData) {
            try {
              const parsed = JSON.parse(currentData);
              if (currentEvent === 'message' && parsed.content) {
                process.stdout.write(parsed.content);
              } else if (currentEvent === 'tool_call') {
                if (parsed.status === 'isRunning') {
                  process.stdout.write(`\n\x1b[90m[Calling tool: ${parsed.toolName}...]\x1b[0m\n`);
                } else if (parsed.status === 'done') {
                  process.stdout.write(`\x1b[90m[Tool ${parsed.toolName} done]\x1b[0m\n`);
                }
              } else if (currentEvent === 'error') {
                process.stdout.write(`\n\x1b[31m[Error: ${parsed.error || currentData}]\x1b[0m\n`);
              }
            } catch {
              // Ignore partial JSON
            }
            currentEvent = '';
            currentData = '';
          }
          continue;
        }

        if (trimmed.startsWith('event:')) {
          currentEvent = trimmed.slice(6).trim();
        } else if (trimmed.startsWith('data:')) {
          currentData = trimmed.slice(5).trim();
        }
      }
    }

    console.log('\n\n\x1b[90m--- End of response ---\x1b[0m\n');
  } catch (error) {
    console.error('\n\x1b[31mChat error:\x1b[0m', error);
  }
}

main();
