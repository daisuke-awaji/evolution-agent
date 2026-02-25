import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import type { EnvironmentConfig } from '../../../config';

export interface AgentCoreGatewayProps {
  envConfig: EnvironmentConfig;
  agentRuntimeArn?: string;
}

export class AgentCoreGateway extends Construct {
  /**
   * The gateway endpoint URL that clients use to invoke the AgentCore runtime.
   *
   * TODO: Replace with actual AgentCore Gateway CDK construct once
   * @aws-cdk/aws-bedrock-agentcore-alpha is available and stable.
   * The real implementation would use:
   *   new agentcore.AgentCoreGateway(this, 'Gateway', { ... })
   * and expose its endpoint URL.
   */
  public readonly gatewayEndpointUrl: string;
  public readonly gatewayFunction: lambda.Function;

  constructor(scope: Construct, id: string, props: AgentCoreGatewayProps) {
    super(scope, id);

    const { envConfig } = props;

    // TODO: Replace with real AgentCore Gateway CDK construct when available.
    // This stub creates a Lambda function that acts as a gateway proxy,
    // forwarding requests to the AgentCore Runtime.
    const gatewayRole = new iam.Role(this, 'GatewayRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    gatewayRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'BedrockAgentCoreInvoke',
        actions: ['bedrock:InvokeAgent', 'bedrock-agentcore:InvokeRuntime'],
        resources: ['*'],
      }),
    );

    this.gatewayFunction = new lambda.Function(this, 'GatewayFunction', {
      functionName: `${envConfig.resourcePrefix}-agentcore-gateway`,
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        // TODO: Replace with actual AgentCore Gateway implementation.
        // This stub forwards invocations to the AgentCore Runtime.
        exports.handler = async (event) => {
          console.log('AgentCore Gateway stub invoked:', JSON.stringify(event));
          return {
            statusCode: 200,
            body: JSON.stringify({ message: 'AgentCore Gateway stub — replace with real implementation' }),
          };
        };
      `),
      role: gatewayRole,
      timeout: cdk.Duration.minutes(5),
      environment: {
        RESOURCE_PREFIX: envConfig.resourcePrefix,
        AGENT_RUNTIME_ARN: props.agentRuntimeArn ?? '',
      },
    });

    const fnUrl = this.gatewayFunction.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.AWS_IAM,
      cors: {
        allowedOrigins: envConfig.corsAllowedOrigins,
        allowedMethods: [lambda.HttpMethod.ALL],
        allowedHeaders: ['*'],
      },
    });

    this.gatewayEndpointUrl = fnUrl.url;

    new cdk.CfnOutput(this, 'AgentCoreGatewayEndpointUrl', {
      value: fnUrl.url,
      description: 'AgentCore Gateway endpoint URL',
      exportName: `${envConfig.resourcePrefix}-agentcore-gateway-url`,
    });
  }
}
