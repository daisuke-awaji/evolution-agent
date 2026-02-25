import { tool } from '@strands-agents/sdk';
import { z } from 'zod';
import {
  CloudWatchLogsClient,
  StartQueryCommand,
  GetQueryResultsCommand,
  QueryStatus,
} from '@aws-sdk/client-cloudwatch-logs';
import { config } from '../config/index.js';

export const collectCloudWatchLogs = tool({
  name: 'collect_cloudwatch_logs',
  description:
    'Query CloudWatch Logs Insights to collect log data from specified log groups within a time range.',
  inputSchema: z.object({
    logGroupNames: z.array(z.string()).describe('List of CloudWatch log group names to query'),
    queryString: z
      .string()
      .describe('CloudWatch Logs Insights query string')
      .default('fields @timestamp, @message | sort @timestamp desc | limit 100'),
    startTime: z
      .number()
      .describe('Start time as Unix epoch seconds')
      .default(() => Math.floor(Date.now() / 1000) - 3600),
    endTime: z
      .number()
      .describe('End time as Unix epoch seconds')
      .default(() => Math.floor(Date.now() / 1000)),
    region: z.string().optional().describe('AWS region (defaults to config region)'),
  }),
  callback: async ({ logGroupNames, queryString, startTime, endTime, region }) => {
    const client = new CloudWatchLogsClient({ region: region ?? config.AWS_REGION });

    const startQuery = await client.send(
      new StartQueryCommand({
        logGroupNames,
        queryString,
        startTime,
        endTime,
      })
    );

    const queryId = startQuery.queryId;
    if (!queryId) throw new Error('Failed to start CloudWatch Logs query');

    let results;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const response = await client.send(new GetQueryResultsCommand({ queryId }));
      if (
        response.status === QueryStatus.Complete ||
        response.status === QueryStatus.Failed ||
        response.status === QueryStatus.Cancelled
      ) {
        results = response.results;
        break;
      }
    }

    if (!results) return JSON.parse(JSON.stringify({ queryId, message: 'Query timed out', results: [] }));

    return JSON.parse(JSON.stringify({
      queryId,
      results: results.map((row) =>
        Object.fromEntries((row ?? []).map((f) => [f.field ?? '', f.value ?? '']))
      ),
    }));
  },
});
