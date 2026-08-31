# 🚀 QiForge Oracle Configuration & Deployment Roadmap

> Complete, step-by-step blueprint for developers and AI agents to scaffold, configure, debug, and test any QiForge agentic oracle end-to-end.

---

## 📑 Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Prerequisites & On-Chain Setup](#2-prerequisites--on-chain-setup)
3. [Environment Configuration (`.env`)](#3-environment-configuration-env)
4. [Oracle Plugin & Domain Tool Authoring](#4-oracle-plugin--domain-tool-authoring)
5. [Common Gotchas & Platform Fixes](#5-common-gotchas--platform-fixes)
6. [Testing & Terminal Chat CLI (`chat-cli.ts`)](#6-testing--terminal-chat-cli-chat-clits)
7. [AI Agent Execution Playbook](#7-ai-agent-execution-playbook)

---

## 1. Architecture Overview

A QiForge Oracle combines:
- **NestJS Runtime Server**: Exposes standard endpoints (`/sessions`, `/messages/:sessionId`, `/status`, `/docs`).
- **Matrix Storage & SSSS**: Uses Matrix rooms for end-to-end encrypted thread memory and checkpoint syncing.
- **IXO Blockchain & UCAN Auth**: Cryptographic identity (`did:ixo:...` and `did:key:...`) with capability delegations.
- **LangChain / LLM Provider**: Connects to OpenRouter or Nebius with reasoning and tool-calling models.

```
+-------------------------------------------------------------+
|                     Client (Chat CLI / UI)                  |
+-------------------------------------------------------------+
        |                                            |
        | 1. POST /sessions                          | 2. POST /messages/:id (SSE)
        v                                            v
+-------------------------------------------------------------+
|                QiForge Oracle Server (NestJS)               |
|  - UCAN Authentication Guard                                |
|  - LangChain LLM Executor (openrouter/free)                 |
|  - Custom Domain Plugins (Tools & Claims Evaluators)        |
+-------------------------------------------------------------+
        |                                            |
        v                                            v
+-----------------------+                    +----------------+
|  Matrix Homeserver    |                    |  Local SQLite  |
|  (Encrypted Memory)   |                    |  (Checkpoints) |
+-----------------------+                    +----------------+
```

---

## 2. Prerequisites & On-Chain Setup

Before spinning up an oracle app:
1. **Oracle Wallet & DID**: Generated on the IXO blockchain (testnet or mainnet).
2. **Oracle Entity DID**: Created under an IXO project or DAO entity (`did:ixo:entity:...`).
3. **Matrix Account**: Registered on the homeserver (e.g. `https://testmx.ixo.earth`).
4. **OpenRouter API Key**: Obtainable from [openrouter.ai](https://openrouter.ai).

---

## 3. Environment Configuration (`.env`)

Create `.env` in the oracle app directory (e.g. `apps/<oracle-name>/.env`):

```env
# =================================================================
# Oracle Environment Configuration Template (.env)
# =================================================================

# --- Runtime & Server ---
NODE_ENV=development
PORT=4000
ORACLE_NAME=<YOUR_ORACLE_NAME>
NETWORK=testnet
CORS_ORIGIN=*

# --- Oracle Blockchain Identity ---
ORACLE_DID=<YOUR_ORACLE_DID>
ORACLE_ENTITY_DID=<YOUR_ORACLE_ENTITY_DID>
SECP_MNEMONIC=<YOUR_ORACLE_MNEMONIC_PHRASE>

# --- IXO Chain & Blocksync RPC ---
BLOCKSYNC_GRAPHQL_URL=https://testnet-blocksync-graphql.ixo.earth/graphql
RPC_URL=https://testnet.ixo.earth/rpc/

# --- Matrix Server ---
MATRIX_BASE_URL=https://testmx.ixo.earth
MATRIX_ORACLE_ADMIN_USER_ID=<YOUR_MATRIX_ADMIN_USER_ID>
MATRIX_ORACLE_ADMIN_PASSWORD=<YOUR_MATRIX_ADMIN_PASSWORD>
MATRIX_ORACLE_ADMIN_ACCESS_TOKEN=<YOUR_MATRIX_ADMIN_ACCESS_TOKEN>
MATRIX_RECOVERY_PHRASE=<YOUR_SSSS_PASSPHRASE>
MATRIX_ACCOUNT_ROOM_ID=<YOUR_MATRIX_ACCOUNT_ROOM_ID>
MATRIX_VALUE_PIN=<YOUR_MATRIX_PIN>
MATRIX_STORE_PATH=./matrix-storage

# --- Local Storage ---
SQLITE_DATABASE_PATH=./.data/sqlite

# --- LLM Provider ---
LLM_PROVIDER=openrouter
OPEN_ROUTER_API_KEY=<YOUR_OPENROUTER_API_KEY>
DEFAULT_MODEL=openrouter/free

# --- Custom Domain Variables ---
DOMAIN_API_URL=<YOUR_DOMAIN_API_ENDPOINT>
```

---

## 4. Oracle Plugin & Domain Tool Authoring

Every oracle defines its capabilities using `@ixo/oracle-runtime` plugins.

### Example: `src/plugins/zyngo-evaluator.plugin.ts`
```typescript
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import type { OraclePlugin } from '@ixo/oracle-runtime';

export const zyngoEvaluatorPlugin: OraclePlugin = {
  name: 'zyngo-evaluator',
  version: '1.0.0',
  description: 'Evaluates learning claims and queries impact opportunities',
  tools: [
    new DynamicStructuredTool({
      name: 'query_zyngo_opportunities',
      description: 'Search available jobs, bounties, and courses in the Yoma ecosystem',
      schema: z.object({
        query: z.string().describe('Search query for skills or keywords'),
        category: z.string().optional().describe('Filter by category'),
      }),
      func: async ({ query }) => {
        // Fetch domain API or database
        return JSON.stringify([
          { id: '1', title: 'Web3 & Impact Developer', provider: 'Yoma Ecosystem Labs' }
        ]);
      },
    }),
  ],
};
```

---

## 5. Common Gotchas & Platform Fixes

### ⚠️ Gotcha 1: Matrix Token Expiration (`M_UNKNOWN_TOKEN`)
- **Symptom**: `Invalid access token passed` or `401 Unauthorized` on startup.
- **Fix**: Run the refresh script to acquire a fresh access token from the password:
  ```typescript
  const res = await fetch(`${MATRIX_BASE_URL}/_matrix/client/v3/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'm.login.password',
      identifier: { type: 'm.id.user', user: MATRIX_ORACLE_ADMIN_USER_ID },
      password: MATRIX_ORACLE_ADMIN_PASSWORD,
    }),
  });
  const { access_token } = await res.json();
  ```

### ⚠️ Gotcha 2: OpenRouter 402 Insufficient Credits
- **Symptom**: `Failed to stream message (500): 402 Payment Required`.
- **Fix**: Set `DEFAULT_MODEL=openrouter/free` in `.env`. OpenRouter will automatically route to high-performing available free models with reasoning enabled.

### ⚠️ Gotcha 3: Matrix Room Alias Not Found (`Room ID not found`)
- **Symptom**: `POST /sessions` returns `Session creation failed: Room ID not found`.
- **Fix**: Ensure the alias `#<userDid>_<oracleEntityDid>:testmx.ixo.earth` points to `MATRIX_ACCOUNT_ROOM_ID` before session creation. (Handled automatically in `chat-cli.ts`).

### ⚠️ Gotcha 4: Windows Filesystem Colon Error (`mkdir ENOENT did:key:...`)
- **Symptom**: `mkdir '.../.data/sqlite/user_dbs/did:key:...'` fails because `:` is illegal in Windows paths.
- **Fix**: Sanitize folder names in `UserMatrixSqliteSyncService.getUserCheckpointDbPath`:
  ```typescript
  const safeUserFolder = userDid.replace(/[:\\/*?"<>|]/g, '_');
  ```

---

## 6. Testing & Terminal Chat CLI (`chat-cli.ts`)

To chat with the agent and test all tools directly in the terminal:

```powershell
# Add script to package.json:
# "chat": "tsx src/chat-cli.ts"

pnpm chat "What opportunities do you have for junior web3 developers?"
```

The CLI handles:
1. Deriving user DID key from mnemonic.
2. Minting UCAN Auth Invocation + Capability Delegation tokens.
3. Automatically binding the Matrix room alias.
4. Calling `POST /sessions`.
5. Streaming real-time tokens, tool calls, and responses via `POST /messages/:sessionId` SSE.

---

## 7. AI Agent Execution Playbook

When an AI agent is asked to scaffold or configure a new QiForge oracle:

1. **Scaffold**: Create `apps/<oracle-name>` with NestJS runtime and `@ixo/oracle-runtime` dependency.
2. **Configure `.env`**: Fill blockchain DIDs, Matrix homeserver credentials, and set `DEFAULT_MODEL=openrouter/free`.
3. **Write Domain Plugin**: Add custom tools under `src/plugins/` and register them in `createOracleApp({ plugins: [...] })`.
4. **Compile Workspace**: Run `pnpm build` across the repository.
5. **Start Dev Server**: Run `pnpm dev` in `apps/<oracle-name>`.
6. **Verify with CLI**: Run `pnpm chat "<test prompt>"` and verify SSE response stream and tool execution.
