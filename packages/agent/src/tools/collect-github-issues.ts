import { tool } from '@strands-agents/sdk';
import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const collectGithubIssues = tool({
  name: 'collect_github_issues',
  description: 'List existing GitHub Issues for a repository to avoid creating duplicates.',
  inputSchema: z.object({
    owner: z.string().describe('GitHub repository owner'),
    repo: z.string().describe('GitHub repository name'),
    state: z.enum(['open', 'closed', 'all']).default('open').describe('Issue state filter'),
    limit: z.number().default(30).describe('Maximum number of issues to retrieve'),
    label: z.string().optional().describe('Filter by label'),
  }),
  callback: async ({ owner, repo, state, limit, label }) => {
    const labelFlag = label ? `--label "${label}"` : '';
    const cmd = `gh issue list --repo ${owner}/${repo} --state ${state} --limit ${limit} ${labelFlag} --json number,title,body,labels,state,createdAt,url`;

    const { stdout } = await execAsync(cmd);
    const issues = JSON.parse(stdout || '[]') as unknown[];
    return JSON.parse(JSON.stringify({ owner, repo, count: issues.length, issues }));
  },
});
