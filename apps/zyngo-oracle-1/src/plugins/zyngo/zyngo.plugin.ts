import {
  OraclePlugin,
  type PluginContext,
  type PluginManifest,
  type PluginTool,
  z,
} from '@ixo/oracle-runtime';
import {
  buildEvaluateZynGoClaimTool,
  buildQueryOpportunitiesTool,
  buildVerifyCredentialTool,
} from './zyngo-tools.js';

const NAME = 'zyngo-domain';
const VERSION = '0.1.0';

const configSchema = z.object({
  ZYNGO_API_URL: z.string().optional().default('https://api.yoma.world'),
});

const manifest: PluginManifest = {
  title: 'ZynGo Domain Evaluator',
  summary:
    'Provides domain tools for Yoma opportunity search, learner credential verification, and IXO claim evaluation.',
  whenToUse: [
    'Whenever a user submits evidence for learning, task completion, or impact claims.',
    'When searching for opportunities, micro-internships, or skills pathways on Yoma.',
    'When verifying the validity of learner credentials or issued digital badges.',
  ],
  whenNotToUse: [
    'For general weather queries or unrelated external tasks.',
  ],
  examples: [
    {
      user: 'Check opportunities for junior web3 developers',
      tool: 'query_zyngo_opportunities',
      args: { category: 'Software Development', skills: ['TypeScript'] },
    },
    {
      user: 'Evaluate claim submission clm-123 for did:ixo:learner456',
      tool: 'evaluate_zyngo_claim',
      args: {
        claimId: 'clm-123',
        learnerDid: 'did:ixo:learner456',
        evidenceUrl: 'https://ipfs.io/ipfs/Qm...',
      },
    },
  ],
  tags: ['yoma', 'zyngo', 'credentials', 'claims', 'evaluation', 'opportunities'],
  category: 'data',
  visibility: 'always',
  stability: 'stable',
};

export class ZynGoPlugin extends OraclePlugin {
  readonly name = NAME;
  readonly version = VERSION;
  readonly manifest = manifest;
  override readonly configSchema = configSchema;

  override autoDetect(): boolean {
    return true;
  }

  override getTools(_ctx: PluginContext): PluginTool[] {
    return [
      buildEvaluateZynGoClaimTool(),
      buildQueryOpportunitiesTool(),
      buildVerifyCredentialTool(),
    ];
  }
}
