import { tool } from '@strands-agents/sdk';
import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const createGithubIssue = tool({
  name: 'create_github_issue',
  description: 'Create a new GitHub Issue in a repository for analysis findings or improvement proposals.',
  inputSchema: z.object({
    owner: z.string().describe('GitHub repository owner'),
    repo: z.string().describe('GitHub repository name'),
    title: z.string().describe('Issue title'),
    body: z.string().describe('Issue body in Markdown'),
    labels: z.array(z.string()).optional().describe('Labels to apply to the issue'),
  }),
  callback: async ({ owner, repo, title, body, labels }) => {
    const labelFlag =
      labels && labels.length > 0
        ? labels.map((l) => `--label "${l}"`).join(' ')
        : '';

    const escapedTitle = title.replace(/"/g, '\\"');
    const escapedBody = body.replace(/"/g, '\\"');

    const cmd = `gh issue create --repo ${owner}/${repo} --title "${escapedTitle}" --body "${escapedBody}" ${labelFlag} --json number,url,id`;

    const { stdout } = await execAsync(cmd);
    const result = JSON.parse(stdout) as { number: number; url: string; id: string };
    return { owner, repo, issueNumber: result.number, url: result.url };
  },
});
