/**
 * Reports DynamoDB Service
 *
 * Table schema:
 * - PK: targetId (string)
 * - SK: reportId (string, format: RPT#<ISO-timestamp>#<nanoid>)
 */

import {
  DynamoDBClient,
  PutItemCommand,
  QueryCommand,
  GetItemCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { nanoid } from 'nanoid';
import { config } from '../config/index.js';

export type ReportStatus = 'pending' | 'in_progress' | 'completed' | 'failed';
export type TriggerType = 'scheduled' | 'manual' | 'threshold';

export interface ReportItem {
  targetId: string;
  reportId: string;
  triggerType: TriggerType;
  collectedData?: unknown;
  analysis?: unknown;
  actions?: unknown;
  status: ReportStatus;
  durationMs?: number;
  createdAt: string;
  completedAt?: string;
}

export interface CreateReportInput {
  triggerType: TriggerType;
  collectedData?: unknown;
  analysis?: unknown;
  actions?: unknown;
  status?: ReportStatus;
}

export interface ListReportsOptions {
  limit?: number;
  nextToken?: string;
}

export interface ReportListResult {
  items: ReportItem[];
  nextToken?: string;
  hasMore: boolean;
}

export class ReportsDynamoDBService {
  private client: DynamoDBClient;
  private tableName: string;

  constructor() {
    this.client = new DynamoDBClient({ region: config.aws.region });
    this.tableName = config.reportsTableName;
  }

  async createReport(targetId: string, input: CreateReportInput): Promise<ReportItem> {
    const now = new Date().toISOString();
    const reportId = `RPT#${now}#${nanoid()}`;

    const item: ReportItem = {
      targetId,
      reportId,
      triggerType: input.triggerType,
      collectedData: input.collectedData,
      analysis: input.analysis,
      actions: input.actions,
      status: input.status ?? 'pending',
      createdAt: now,
    };

    const marshalledItem: Record<string, unknown> = {
      targetId: item.targetId,
      reportId: item.reportId,
      triggerType: item.triggerType,
      status: item.status,
      createdAt: item.createdAt,
    };

    if (item.collectedData !== undefined) marshalledItem.collectedData = item.collectedData;
    if (item.analysis !== undefined) marshalledItem.analysis = item.analysis;
    if (item.actions !== undefined) marshalledItem.actions = item.actions;

    await this.client.send(
      new PutItemCommand({
        TableName: this.tableName,
        Item: marshall(marshalledItem),
      })
    );

    console.log(`[ReportsDynamoDBService] Created report ${reportId} for target ${targetId}`);
    return item;
  }

  async listReports(targetId: string, options: ListReportsOptions = {}): Promise<ReportListResult> {
    const { limit = 50, nextToken } = options;

    const result = await this.client.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'targetId = :targetId',
        ExpressionAttributeValues: marshall({ ':targetId': targetId }),
        ScanIndexForward: false,
        Limit: limit,
        ExclusiveStartKey: nextToken
          ? JSON.parse(Buffer.from(nextToken, 'base64').toString())
          : undefined,
      })
    );

    const items: ReportItem[] = (result.Items || []).map((item) => unmarshall(item) as ReportItem);

    const hasMore = !!result.LastEvaluatedKey;
    const newNextToken = result.LastEvaluatedKey
      ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
      : undefined;

    console.log(`[ReportsDynamoDBService] Listed ${items.length} reports for target ${targetId}`);

    return { items, nextToken: newNextToken, hasMore };
  }

  async getReport(targetId: string, reportId: string): Promise<ReportItem | null> {
    const result = await this.client.send(
      new GetItemCommand({
        TableName: this.tableName,
        Key: marshall({ targetId, reportId }),
      })
    );

    if (!result.Item) {
      return null;
    }

    return unmarshall(result.Item) as ReportItem;
  }

  async updateReportStatus(
    targetId: string,
    reportId: string,
    status: ReportStatus,
    completedAt?: string
  ): Promise<void> {
    const expressionParts = ['#status = :status'];
    const expressionAttributeValues: Record<string, unknown> = { ':status': status };
    const expressionAttributeNames: Record<string, string> = { '#status': 'status' };

    if (completedAt) {
      expressionParts.push('completedAt = :completedAt');
      expressionAttributeValues[':completedAt'] = completedAt;
    }

    await this.client.send(
      new UpdateItemCommand({
        TableName: this.tableName,
        Key: marshall({ targetId, reportId }),
        UpdateExpression: `SET ${expressionParts.join(', ')}`,
        ExpressionAttributeValues: marshall(expressionAttributeValues),
        ExpressionAttributeNames: expressionAttributeNames,
      })
    );

    console.log(`[ReportsDynamoDBService] Updated report ${reportId} status to ${status}`);
  }
}
