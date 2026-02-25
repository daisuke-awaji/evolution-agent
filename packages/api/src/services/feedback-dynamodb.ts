/**
 * Feedback DynamoDB Service
 *
 * Table schema:
 * - PK: targetId (string)
 * - SK: feedbackId (string, format: FB#<ISO-timestamp>#<nanoid>)
 * - GSI processed-index: PK=targetId, SK=processed
 */

import {
  DynamoDBClient,
  PutItemCommand,
  QueryCommand,
  QueryCommandInput,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { nanoid } from 'nanoid';
import { config } from '../config/index.js';

export interface FeedbackItem {
  targetId: string;
  feedbackId: string;
  userId?: string;
  type: string;
  message: string;
  rating?: number;
  metadata?: Record<string, unknown>;
  processed: boolean;
  processedAt?: string;
  evolutionReportId?: string;
  createdAt: string;
}

export interface CreateFeedbackInput {
  userId?: string;
  type: string;
  message: string;
  rating?: number;
  metadata?: Record<string, unknown>;
}

export interface ListFeedbackOptions {
  processed?: boolean;
  limit?: number;
  nextToken?: string;
}

export interface FeedbackListResult {
  items: FeedbackItem[];
  nextToken?: string;
  hasMore: boolean;
}

export class FeedbackDynamoDBService {
  private client: DynamoDBClient;
  private tableName: string;

  constructor() {
    this.client = new DynamoDBClient({ region: config.aws.region });
    this.tableName = config.feedbackTableName;
  }

  async createFeedback(targetId: string, input: CreateFeedbackInput): Promise<FeedbackItem> {
    const now = new Date().toISOString();
    const feedbackId = `FB#${now}#${nanoid()}`;

    const item: FeedbackItem = {
      targetId,
      feedbackId,
      userId: input.userId,
      type: input.type,
      message: input.message,
      rating: input.rating,
      metadata: input.metadata,
      processed: false,
      createdAt: now,
    };

    const marshalledItem: Record<string, unknown> = {
      targetId: item.targetId,
      feedbackId: item.feedbackId,
      type: item.type,
      message: item.message,
      processed: item.processed,
      createdAt: item.createdAt,
    };

    if (item.userId !== undefined) marshalledItem.userId = item.userId;
    if (item.rating !== undefined) marshalledItem.rating = item.rating;
    if (item.metadata !== undefined) marshalledItem.metadata = item.metadata;

    await this.client.send(
      new PutItemCommand({
        TableName: this.tableName,
        Item: marshall(marshalledItem),
      })
    );

    console.log(`[FeedbackDynamoDBService] Created feedback ${feedbackId} for target ${targetId}`);
    return item;
  }

  async listFeedback(
    targetId: string,
    options: ListFeedbackOptions = {}
  ): Promise<FeedbackListResult> {
    const { limit = 50, nextToken, processed } = options;

    const params: QueryCommandInput = {
      TableName: this.tableName,
      KeyConditionExpression: 'targetId = :targetId',
      ExpressionAttributeValues: marshall({ ':targetId': targetId }),
      ScanIndexForward: false,
      Limit: limit,
      ExclusiveStartKey: nextToken
        ? JSON.parse(Buffer.from(nextToken, 'base64').toString())
        : undefined,
    };

    if (processed !== undefined) {
      params.FilterExpression = 'processed = :processed';
      params.ExpressionAttributeValues = marshall({
        ':targetId': targetId,
        ':processed': processed,
      });
    }

    const result = await this.client.send(new QueryCommand(params));

    const items: FeedbackItem[] = (result.Items || []).map(
      (rawItem) => unmarshall(rawItem) as FeedbackItem
    );

    const hasMore = !!result.LastEvaluatedKey;
    const newNextToken = result.LastEvaluatedKey
      ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
      : undefined;

    console.log(
      `[FeedbackDynamoDBService] Listed ${items.length} feedback items for target ${targetId}`
    );

    return { items, nextToken: newNextToken, hasMore };
  }

  async listUnprocessedFeedback(targetId: string, limit = 100): Promise<FeedbackItem[]> {
    const result = await this.client.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: 'processed-index',
        KeyConditionExpression: 'targetId = :targetId AND processed = :processed',
        ExpressionAttributeValues: marshall({
          ':targetId': targetId,
          ':processed': false,
        }),
        ScanIndexForward: false,
        Limit: limit,
      })
    );

    const items: FeedbackItem[] = (result.Items || []).map(
      (rawItem) => unmarshall(rawItem) as FeedbackItem
    );

    console.log(
      `[FeedbackDynamoDBService] Listed ${items.length} unprocessed feedback for target ${targetId}`
    );

    return items;
  }

  async markAsProcessed(targetId: string, feedbackId: string, reportId: string): Promise<void> {
    const now = new Date().toISOString();

    await this.client.send(
      new UpdateItemCommand({
        TableName: this.tableName,
        Key: marshall({ targetId, feedbackId }),
        UpdateExpression:
          'SET processed = :processed, processedAt = :processedAt, evolutionReportId = :reportId',
        ExpressionAttributeValues: marshall({
          ':processed': true,
          ':processedAt': now,
          ':reportId': reportId,
        }),
      })
    );

    console.log(
      `[FeedbackDynamoDBService] Marked feedback ${feedbackId} as processed with report ${reportId}`
    );
  }
}
