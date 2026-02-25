import { tool } from '@strands-agents/sdk';
import { z } from 'zod';
import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { config } from '../config/index.js';

export const collectFeedback = tool({
  name: 'collect_feedback',
  description:
    'Collect unprocessed user feedback from the DynamoDB feedback table for a specific target.',
  inputSchema: z.object({
    targetId: z.string().describe('Target application ID to collect feedback for'),
    limit: z.number().default(50).describe('Maximum number of feedback items to retrieve'),
  }),
  callback: async ({ targetId, limit }) => {
    const client = new DynamoDBClient({ region: config.AWS_REGION });

    const response = await client.send(
      new QueryCommand({
        TableName: config.FEEDBACK_TABLE_NAME,
        IndexName: 'targetId-processed-index',
        KeyConditionExpression: 'targetId = :tid AND processed = :p',
        ExpressionAttributeValues: {
          ':tid': { S: targetId },
          ':p': { BOOL: false },
        },
        Limit: limit,
      })
    );

    const items = (response.Items ?? []).map((item) => unmarshall(item));
    return { targetId, count: items.length, feedback: items };
  },
});
