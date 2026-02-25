import { tool } from '@strands-agents/sdk';
import { z } from 'zod';
import {
  CloudWatchClient,
  GetMetricDataCommand,
  type MetricDataQuery,
} from '@aws-sdk/client-cloudwatch';
import { config } from '../config/index.js';

export const collectCloudWatchMetrics = tool({
  name: 'collect_cloudwatch_metrics',
  description: 'Collect CloudWatch metrics data for analysis using metric data queries.',
  inputSchema: z.object({
    namespace: z.string().describe('CloudWatch namespace (e.g., AWS/Lambda)'),
    metricNames: z.array(z.string()).describe('List of metric names to collect'),
    dimensions: z
      .array(z.object({ Name: z.string(), Value: z.string() }))
      .optional()
      .describe('Metric dimensions'),
    startTime: z
      .string()
      .describe('Start time in ISO 8601 format')
      .default(() => new Date(Date.now() - 3600000).toISOString()),
    endTime: z
      .string()
      .describe('End time in ISO 8601 format')
      .default(() => new Date().toISOString()),
    period: z.number().describe('Period in seconds').default(300),
    stat: z.string().describe('Statistics to retrieve (e.g., Average, Sum)').default('Average'),
    region: z.string().optional().describe('AWS region'),
  }),
  callback: async ({ namespace, metricNames, dimensions, startTime, endTime, period, stat, region }) => {
    const client = new CloudWatchClient({ region: region ?? config.AWS_REGION });

    const queries: MetricDataQuery[] = metricNames.map((metricName, i) => ({
      Id: `m${i}`,
      MetricStat: {
        Metric: {
          Namespace: namespace,
          MetricName: metricName,
          Dimensions: dimensions,
        },
        Period: period,
        Stat: stat,
      },
    }));

    const response = await client.send(
      new GetMetricDataCommand({
        MetricDataQueries: queries,
        StartTime: new Date(startTime),
        EndTime: new Date(endTime),
      })
    );

    return JSON.parse(JSON.stringify({
      results: (response.MetricDataResults ?? []).map((r, i) => ({
        metricName: metricNames[i],
        id: r.Id ?? null,
        label: r.Label ?? null,
        timestamps: r.Timestamps?.map((t) => t.toISOString()) ?? [],
        values: r.Values ?? [],
        statusCode: r.StatusCode ?? null,
      })),
    }));
  },
});
