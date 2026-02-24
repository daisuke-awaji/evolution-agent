import { tool } from '@strands-agents/sdk';
import { z } from 'zod';

export const think = tool({
  name: 'think',
  description:
    'Use this tool to reason through a problem step-by-step before taking action. The thought is returned as-is for reflection.',
  inputSchema: z.object({
    thought: z.string().describe('Your internal reasoning or analysis'),
  }),
  callback: async ({ thought }) => {
    return thought;
  },
});
