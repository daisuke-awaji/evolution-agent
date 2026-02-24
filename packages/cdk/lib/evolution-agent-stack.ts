import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import type { EnvironmentConfig } from '../config';
import { CognitoAuth } from './constructs/auth/cognito-auth';
import { EvolutionTables } from './constructs/storage/evolution-tables';
import { AgentCoreMemory } from './constructs/agentcore/agentcore-memory';
import { AgentCoreGateway } from './constructs/agentcore/agentcore-gateway';
import { AgentCoreRuntime } from './constructs/agentcore/agentcore-runtime';
import { FeedbackApi } from './constructs/api/feedback-api';
import { EvolutionScheduler } from './constructs/scheduling/evolution-scheduler';

export interface EvolutionAgentStackProps extends cdk.StackProps {
  envConfig: EnvironmentConfig;
}

export class EvolutionAgentStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: EvolutionAgentStackProps) {
    super(scope, id, props);

    const { envConfig } = props;

    // 1. Cognito Auth
    const auth = new CognitoAuth(this, 'Auth', { envConfig });

    // 2. DynamoDB Tables
    const tables = new EvolutionTables(this, 'Tables', { envConfig });

    // 3. AgentCore Memory (stub)
    const memory = new AgentCoreMemory(this, 'Memory', { envConfig });

    // 4. AgentCore Gateway (stub)
    const gateway = new AgentCoreGateway(this, 'Gateway', {
      envConfig,
    });

    // 5. AgentCore Runtime (stub)
    const runtime = new AgentCoreRuntime(this, 'Runtime', {
      envConfig,
      feedbackTable: tables.feedbackTable,
      reportsTable: tables.reportsTable,
      memoryId: memory.memoryId,
    });

    // Update gateway with runtime ARN after runtime is created
    gateway.gatewayFunction.addEnvironment('AGENT_RUNTIME_ARN', runtime.runtimeArn);

    // 6. Feedback API (Lambda Web Adapter)
    const feedbackApi = new FeedbackApi(this, 'FeedbackApi', {
      envConfig,
      feedbackTable: tables.feedbackTable,
      reportsTable: tables.reportsTable,
      userPool: auth.userPool,
    });

    // 7. EventBridge Scheduler
    new EvolutionScheduler(this, 'Scheduler', {
      envConfig,
      gatewayEndpointUrl: gateway.gatewayEndpointUrl,
      gatewayFunction: gateway.gatewayFunction,
    });

    // 8. Stack-level CfnOutputs
    new cdk.CfnOutput(this, 'StackEnv', {
      value: envConfig.env,
      description: 'Deployment environment',
    });

    new cdk.CfnOutput(this, 'ResourcePrefix', {
      value: envConfig.resourcePrefix,
      description: 'Resource prefix used for all resources in this stack',
    });

    new cdk.CfnOutput(this, 'GatewayUrl', {
      value: gateway.gatewayEndpointUrl,
      description: 'AgentCore Gateway endpoint URL',
    });

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: feedbackApi.apiUrl,
      description: 'Feedback API URL',
    });

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: auth.userPool.userPoolId,
      description: 'Cognito User Pool ID',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: auth.userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
    });

    new cdk.CfnOutput(this, 'FeedbackTableName', {
      value: tables.feedbackTable.tableName,
      description: 'DynamoDB Feedback table name',
    });

    new cdk.CfnOutput(this, 'ReportsTableName', {
      value: tables.reportsTable.tableName,
      description: 'DynamoDB Reports table name',
    });
  }
}
