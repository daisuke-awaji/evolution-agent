import { tool } from '@strands-agents/sdk';
import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

export const createGithubPr = tool({
  name: 'create_github_pr',
  description:
    'Clone a repository, create a branch, write files, commit, push, and open a GitHub Pull Request for a concrete code fix.',
  inputSchema: z.object({
    owner: z.string().describe('GitHub repository owner'),
    repo: z.string().describe('GitHub repository name'),
    baseBranch: z.string().default('main').describe('Base branch to branch off from'),
    branchName: z.string().describe('Name of the new branch to create'),
    title: z.string().describe('Pull request title'),
    body: z.string().describe('Pull request body in Markdown'),
    files: z
      .array(
        z.object({
          path: z.string().describe('File path relative to repo root'),
          content: z.string().describe('File content to write'),
        })
      )
      .describe('Files to create or update'),
    commitMessage: z.string().describe('Commit message'),
    labels: z.array(z.string()).optional().describe('Labels to apply to the PR'),
  }),
  callback: async ({ owner, repo, baseBranch, branchName, title, body, files, commitMessage, labels }) => {
    const tmpDir = path.join(os.tmpdir(), `evolution-pr-${Date.now()}`);
    await mkdir(tmpDir, { recursive: true });

    const repoUrl = `https://github.com/${owner}/${repo}.git`;
    await execAsync(`git clone --depth 1 --branch ${baseBranch} ${repoUrl} ${tmpDir}`);
    await execAsync(`git checkout -b ${branchName}`, { cwd: tmpDir });

    for (const file of files) {
      const filePath = path.join(tmpDir, file.path);
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, file.content, 'utf-8');
    }

    await execAsync(`git add -A`, { cwd: tmpDir });
    await execAsync(`git commit -m "${commitMessage.replace(/"/g, '\\"')}"`, { cwd: tmpDir });
    await execAsync(`git push origin ${branchName}`, { cwd: tmpDir });

    const labelFlag =
      labels && labels.length > 0 ? labels.map((l) => `--label "${l}"`).join(' ') : '';

    const escapedTitle = title.replace(/"/g, '\\"');
    const escapedBody = body.replace(/"/g, '\\"');

    const { stdout } = await execAsync(
      `gh pr create --repo ${owner}/${repo} --base ${baseBranch} --head ${branchName} --title "${escapedTitle}" --body "${escapedBody}" ${labelFlag} --json number,url`,
      { cwd: tmpDir }
    );

    const result = JSON.parse(stdout) as { number: number; url: string };
    return { owner, repo, prNumber: result.number, url: result.url, branch: branchName };
  },
});
