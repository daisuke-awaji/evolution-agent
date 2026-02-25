import { tool } from '@strands-agents/sdk';
import { z } from 'zod';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { config } from '../config/index.js';

export const sendSlackNotification = tool({
  name: 'send_slack_notification',
  description:
    'Send a Slack notification via an incoming webhook. The webhook URL is fetched from AWS Secrets Manager.',
  inputSchema: z.object({
    webhookSecretName: z
      .string()
      .describe('Secrets Manager secret name containing the Slack webhook URL'),
    message: z.string().describe('Main message text'),
    blocks: z
      .array(z.record(z.string(), z.unknown()))
      .optional()
      .describe('Slack Block Kit blocks for rich formatting'),
  }),
  callback: async ({ webhookSecretName, message, blocks }) => {
    const smClient = new SecretsManagerClient({ region: config.AWS_REGION });
    const secretResponse = await smClient.send(
      new GetSecretValueCommand({ SecretId: webhookSecretName })
    );

    const webhookUrl = secretResponse.SecretString?.trim() ?? '';

    if (!webhookUrl) throw new Error(`Slack webhook URL not found in secret: ${webhookSecretName}`);

    const payload = blocks ? { text: message, blocks } : { text: message };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Slack notification failed: ${response.status} ${await response.text()}`);
    }

    return { success: true, statusCode: response.status };
  },
});
