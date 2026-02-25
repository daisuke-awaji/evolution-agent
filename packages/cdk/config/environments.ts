import type { Environment, EnvironmentConfigInput } from './environment-types';

export const BASE_PREFIX = 'evoagent';

export const environments: Record<Environment, EnvironmentConfigInput> = {
  default: {
    targets: [],
  },
  dev: {
    githubTokenSecretName: 'evolution-agent/dev/github-token',
    targets: [
      {
        id: 'moca',
        name: 'Moca Chat Application',
        cloudwatch: {
          logGroupNames: ['/aws/bedrock-agentcore/runtimes/moca-runtime'],
        },
        github: {
          owner: 'daisuke-awaji',
          repo: 'sample-multi-agent-orchestration-chat-on-agentcore',
        },
      },
    ],
  },
  prd: {
    deletionProtection: true,
    targets: [],
  },
};
