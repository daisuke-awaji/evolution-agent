import * as cdk from 'aws-cdk-lib';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import type { EnvironmentConfig } from '../../../config';

export interface AgentCoreMemoryProps {
  envConfig: EnvironmentConfig;
}

export class AgentCoreMemory extends Construct {
  /**
   * The memory ID used to reference this AgentCore Memory resource.
   *
   * TODO: Replace with actual AgentCore Memory resource once
   * @aws-cdk/aws-bedrock-agentcore-alpha is available and stable.
   * The real implementation would use:
   *   new agentcore.AgentCoreMemory(this, 'Memory', { ... })
   */
  public readonly memoryId: string;

  constructor(scope: Construct, id: string, props: AgentCoreMemoryProps) {
    super(scope, id);

    const { envConfig } = props;

    // TODO: Replace with real AgentCore Memory CDK construct when available.
    // For now, store a placeholder memory ID in SSM Parameter Store.
    // In production, this would be the actual Bedrock AgentCore Memory resource ARN/ID.
    const memoryIdParam = new ssm.StringParameter(this, 'MemoryIdParam', {
      parameterName: `/${envConfig.resourcePrefix}/agentcore/memory-id`,
      stringValue: `${envConfig.resourcePrefix}-memory`,
      description: 'AgentCore Memory ID placeholder — replace with actual resource',
    });

    this.memoryId = memoryIdParam.stringValue;

    new cdk.CfnOutput(this, 'AgentCoreMemoryId', {
      value: this.memoryId,
      description: 'AgentCore Memory ID (placeholder)',
      exportName: `${envConfig.resourcePrefix}-agentcore-memory-id`,
    });
  }
}
