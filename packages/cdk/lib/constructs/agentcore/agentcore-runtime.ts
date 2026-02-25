import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import type { EnvironmentConfig } from '../../../config';

export interface AgentCoreRuntimeProps {
  envConfig: EnvironmentConfig;
  feedbackTable: dynamodb.ITable;
  reportsTable: dynamodb.ITable;
  memoryId: string;
  imageUri?: string;
}

export class AgentCoreRuntime extends Construct {
  /**
   * The ARN of the AgentCore Runtime resource.
   *
   * TODO: Replace with actual AgentCore Runtime CDK construct once
   * @aws-cdk/aws-bedrock-agentcore-alpha is available and stable.
   * The real implementation would use:
   *   new agentcore.AgentCoreRuntime(this, 'Runtime', {
   *     name: `${envConfig.resourcePrefix}-runtime`,
   *     containerImage: agentcore.ContainerImage.fromDockerImageAsset(asset),
   *     ...
   *   })
   */
  public readonly runtimeArn: string;
  public readonly runtimeFunction: lambda.Function;

  constructor(scope: Construct, id: string, props: AgentCoreRuntimeProps) {
    super(scope, id);

    const { envConfig, feedbackTable, reportsTable } = props;

    const runtimeRole = new iam.Role(this, 'RuntimeRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // CloudWatch Logs — scoped to target log group names defined in config
    const targetLogGroupArns = envConfig.targets.flatMap((target) =>
      target.cloudwatch.logGroupNames.map(
        (logGroupName) =>
          `arn:aws:logs:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:log-group:${logGroupName}:*`,
      ),
    );

    if (targetLogGroupArns.length > 0) {
      runtimeRole.addToPolicy(
        new iam.PolicyStatement({
          sid: 'CloudWatchLogsRead',
          actions: ['logs:FilterLogEvents', 'logs:GetLogEvents', 'logs:DescribeLogStreams'],
          resources: targetLogGroupArns,
        }),
      );
    }

    runtimeRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'CloudWatchLogsDescribe',
        actions: ['logs:DescribeLogGroups'],
        resources: ['*'],
      }),
    );

    // CloudWatch Metrics
    runtimeRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'CloudWatchMetrics',
        actions: ['cloudwatch:GetMetricData', 'cloudwatch:ListMetrics', 'cloudwatch:GetMetricStatistics'],
        resources: ['*'],
      }),
    );

    // Bedrock
    runtimeRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'BedrockInvoke',
        actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
        resources: ['*'],
      }),
    );

    // Secrets Manager
    runtimeRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'SecretsManagerRead',
        actions: ['secretsmanager:GetSecretValue'],
        resources: [
          `arn:aws:secretsmanager:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:secret:${envConfig.resourcePrefix}/*`,
          ...(envConfig.githubTokenSecretName
            ? [
                `arn:aws:secretsmanager:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:secret:${envConfig.githubTokenSecretName}*`,
              ]
            : []),
          ...envConfig.targets
            .filter((t) => t.apiKeySecretName)
            .map(
              (t) =>
                `arn:aws:secretsmanager:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:secret:${t.apiKeySecretName}*`,
            ),
        ],
      }),
    );

    const logGroup = new logs.LogGroup(this, 'RuntimeLogGroup', {
      logGroupName: `/aws/lambda/${envConfig.resourcePrefix}-agentcore-runtime`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: envConfig.s3RemovalPolicy,
    });

    // TODO: Replace with Docker image from actual agent container.
    // When using real AgentCore Runtime, this would be a ContainerImage backed by
    // the agent's Docker image (e.g., from packages/agent or packages/api).
    this.runtimeFunction = new lambda.Function(this, 'RuntimeFunction', {
      functionName: `${envConfig.resourcePrefix}-agentcore-runtime`,
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        // TODO: Replace with actual AgentCore Runtime container image.
        // This stub simulates the evolution agent runtime behavior.
        exports.handler = async (event) => {
          console.log('AgentCore Runtime stub invoked:', JSON.stringify(event));
          return {
            statusCode: 200,
            body: JSON.stringify({ message: 'AgentCore Runtime stub — replace with real implementation' }),
          };
        };
      `),
      role: runtimeRole,
      timeout: cdk.Duration.minutes(15),
      logGroup,
      environment: {
        RESOURCE_PREFIX: envConfig.resourcePrefix,
        EVOLUTION_TARGETS: JSON.stringify(envConfig.targets),
        FEEDBACK_TABLE_NAME: feedbackTable.tableName,
        REPORTS_TABLE_NAME: reportsTable.tableName,
        MEMORY_ID: props.memoryId,
        ...(envConfig.githubTokenSecretName
          ? { GITHUB_TOKEN_SECRET_NAME: envConfig.githubTokenSecretName }
          : {}),
      },
    });

    feedbackTable.grantReadWriteData(this.runtimeFunction);
    reportsTable.grantReadWriteData(this.runtimeFunction);

    this.runtimeArn = this.runtimeFunction.functionArn;

    new cdk.CfnOutput(this, 'AgentCoreRuntimeArn', {
      value: this.runtimeArn,
      description: 'AgentCore Runtime ARN (stub Lambda)',
      exportName: `${envConfig.resourcePrefix}-agentcore-runtime-arn`,
    });
  }
}
