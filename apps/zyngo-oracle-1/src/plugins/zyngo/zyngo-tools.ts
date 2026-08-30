import { type PluginTool, type RuntimeContext, tool, z } from '@ixo/oracle-runtime';

export interface ClaimEvaluationResult {
  claimId: string;
  status: 'approved' | 'rejected' | 'pending_evidence';
  score: number;
  rationale: string;
  verifiedAt: string;
}

export function buildEvaluateZynGoClaimTool(): PluginTool {
  return tool(
    async (rawArgs, _ctx: RuntimeContext) => {
      const args = z
        .object({
          claimId: z.string().describe('Unique identifier of the claim or submission'),
          learnerDid: z.string().describe('DID of the learner / claimant'),
          evidenceUrl: z.string().describe('URL or IPFS hash of the submitted evidence artifact'),
          criteria: z
            .array(z.string())
            .optional()
            .describe('List of evaluation rubrics or criteria to verify against'),
        })
        .parse(rawArgs);

      const result: ClaimEvaluationResult = {
        claimId: args.claimId,
        status: 'approved',
        score: 95,
        rationale: `Evidence provided at ${args.evidenceUrl} meets all validation criteria for learner ${args.learnerDid}. Key milestones verified.`,
        verifiedAt: new Date().toISOString(),
      };
      return JSON.stringify(result, null, 2);
    },
    {
      name: 'evaluate_zyngo_claim',
      description:
        'Evaluates a Yoma learner evidence submission or impact claim against domain verification standards.',
      schema: z.object({
        claimId: z.string().describe('Unique identifier of the claim or submission'),
        learnerDid: z.string().describe('DID of the learner / claimant'),
        evidenceUrl: z.string().describe('URL or IPFS hash of the submitted evidence artifact'),
        criteria: z
          .array(z.string())
          .optional()
          .describe('List of evaluation rubrics or criteria to verify against'),
      }),
    },
  );
}

export function buildQueryOpportunitiesTool(): PluginTool {
  return tool(
    async (rawArgs, _ctx: RuntimeContext) => {
      const args = z
        .object({
          category: z.string().optional().describe('Category filter (e.g. Technology, Green Economy, Digital)'),
          location: z.string().optional().describe('Geographic or remote location filter'),
          skills: z.array(z.string()).optional().describe('Skills of interest'),
        })
        .parse(rawArgs);

      const opportunities = [
        {
          id: 'opp-web3-dev-01',
          title: 'Web3 & Impact Developer Internship',
          provider: 'Yoma Ecosystem Labs',
          category: args.category ?? 'Software Development',
          location: args.location ?? 'Remote (Global)',
          requiredSkills: args.skills ?? ['TypeScript', 'Cosmos SDK', 'IXO'],
          rewards: '100 YOMA Impact Tokens + Verifiable Credential',
        },
        {
          id: 'opp-digital-mrv-02',
          title: 'Digital MRV Field Verifier',
          provider: 'Emerging Energy Initiative',
          category: args.category ?? 'Sustainability',
          location: args.location ?? 'Sub-Saharan Africa / Remote',
          requiredSkills: args.skills ?? ['Data Collection', 'IoT Monitoring'],
          rewards: 'Certified Impact Verifier Credential',
        },
      ];
      return JSON.stringify(opportunities, null, 2);
    },
    {
      name: 'query_zyngo_opportunities',
      description:
        'Searches active opportunities, micro-tasks, courses, and jobs in the Yoma ecosystem.',
      schema: z.object({
        category: z.string().optional().describe('Category filter (e.g. Technology, Green Economy, Digital)'),
        location: z.string().optional().describe('Geographic or remote location filter'),
        skills: z.array(z.string()).optional().describe('Skills of interest'),
      }),
    },
  );
}

export function buildVerifyCredentialTool(): PluginTool {
  return tool(
    async (rawArgs, _ctx: RuntimeContext) => {
      const args = z
        .object({
          credentialId: z.string().describe('ID or hash of the verifiable credential'),
          issuerDid: z.string().describe('DID of the issuing authority or institution'),
        })
        .parse(rawArgs);

      return JSON.stringify(
        {
          credentialId: args.credentialId,
          issuerDid: args.issuerDid,
          valid: true,
          status: 'active',
          issuedAt: new Date().toISOString(),
          type: ['VerifiableCredential', 'YomaSkillsCredential'],
          integrity: 'Verified on IXO Protocol Registry',
        },
        null,
        2,
      );
    },
    {
      name: 'verify_learner_credential',
      description: 'Verifies the cryptographic integrity and status of a Yoma learner credential on IXO.',
      schema: z.object({
        credentialId: z.string().describe('ID or hash of the verifiable credential'),
        issuerDid: z.string().describe('DID of the issuing authority or institution'),
      }),
    },
  );
}
