import { tool } from '@strands-agents/sdk';
import { z } from 'zod';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { config } from '../config/index.js';
import { nanoid } from 'nanoid';

export const saveEvolutionReport = tool({
  name: 'save_evolution_report',
  description: 'Save an evolution analysis report to DynamoDB for record-keeping and auditability.',
  inputSchema: z.object({
    targetId: z.string().describe('Target application ID'),
    targetName: z.string().describe('Target application name'),
    summary: z.string().describe('Summary of findings and actions taken'),
    issuesCreated: z
      .array(z.object({ number: z.number(), url: z.string(), title: z.string() }))
      .optional()
      .describe('GitHub issues created'),
    prsCreated: z
      .array(z.object({ number: z.number(), url: z.string(), title: z.string() }))
      .optional()
      .describe('GitHub PRs created'),
    metricsAnalyzed: z.record(z.string(), z.unknown()).optional().describe('Metrics data analyzed'),
    logsAnalyzed: z.number().optional().describe('Number of log entries analyzed'),
    feedbackProcessed: z.number().optional().describe('Number of feedback items processed'),
  }),
  callback: async ({
    targetId,
    targetName,
    summary,
    issuesCreated,
    prsCreated,
    metricsAnalyzed,
    logsAnalyzed,
    feedbackProcessed,
  }) => {
    const client = new DynamoDBClient({ region: config.AWS_REGION });
    const reportId = nanoid();
    const timestamp = new Date().toISOString();

    const item = {
      reportId,
      targetId,
      targetName,
      summary,
      issuesCreated: issuesCreated ?? [],
      prsCreated: prsCreated ?? [],
      metricsAnalyzed: metricsAnalyzed ?? {},
      logsAnalyzed: logsAnalyzed ?? 0,
      feedbackProcessed: feedbackProcessed ?? 0,
      createdAt: timestamp,
    };

    await client.send(
      new PutItemCommand({
        TableName: config.REPORTS_TABLE_NAME,
        Item: marshall(item),
      })
    );

    return { reportId, targetId, createdAt: timestamp };
  },
});
