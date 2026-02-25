import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import type { EnvironmentConfig } from '../../../config';

export interface EvolutionTablesProps {
  envConfig: EnvironmentConfig;
}

export class EvolutionTables extends Construct {
  public readonly feedbackTable: dynamodb.Table;
  public readonly reportsTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props: EvolutionTablesProps) {
    super(scope, id);

    const { envConfig } = props;
    const removalPolicy = envConfig.s3RemovalPolicy;

    // Feedback table: PK=targetId(S), SK=feedbackId(S)
    this.feedbackTable = new dynamodb.Table(this, 'FeedbackTable', {
      tableName: `${envConfig.resourcePrefix}-feedback`,
      partitionKey: { name: 'targetId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'feedbackId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy,
      pointInTimeRecovery: envConfig.deletionProtection,
    });

    // GSI: processed-index (PK=targetId, SK=processed)
    this.feedbackTable.addGlobalSecondaryIndex({
      indexName: 'processed-index',
      partitionKey: { name: 'targetId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'processed', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Reports table: PK=targetId(S), SK=reportId(S)
    this.reportsTable = new dynamodb.Table(this, 'ReportsTable', {
      tableName: `${envConfig.resourcePrefix}-reports`,
      partitionKey: { name: 'targetId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'reportId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy,
      pointInTimeRecovery: envConfig.deletionProtection,
    });

    new cdk.CfnOutput(this, 'FeedbackTableName', {
      value: this.feedbackTable.tableName,
      exportName: `${envConfig.resourcePrefix}-feedback-table-name`,
    });

    new cdk.CfnOutput(this, 'ReportsTableName', {
      value: this.reportsTable.tableName,
      exportName: `${envConfig.resourcePrefix}-reports-table-name`,
    });
  }
}
