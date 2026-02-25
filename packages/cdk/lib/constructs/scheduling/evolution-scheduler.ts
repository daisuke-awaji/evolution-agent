import * as cdk from 'aws-cdk-lib';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import type { EnvironmentConfig } from '../../../config';

export interface EvolutionSchedulerProps {
  envConfig: EnvironmentConfig;
  gatewayEndpointUrl: string;
  gatewayFunction: lambda.IFunction;
}

export class EvolutionScheduler extends Construct {
  public readonly schedulerFunction: lambda.Function;
  public readonly rule: events.Rule;

  constructor(scope: Construct, id: string, props: EvolutionSchedulerProps) {
    super(scope, id);

    const { envConfig, gatewayEndpointUrl, gatewayFunction } = props;

    const schedulerRole = new iam.Role(this, 'SchedulerRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // Allow invoking the gateway function URL
    schedulerRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'InvokeGateway',
        actions: ['lambda:InvokeFunctionUrl', 'lambda:InvokeFunction'],
        resources: [gatewayFunction.functionArn],
      }),
    );

    const logGroup = new logs.LogGroup(this, 'SchedulerLogGroup', {
      logGroupName: `/aws/lambda/${envConfig.resourcePrefix}-evolution-scheduler`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: envConfig.s3RemovalPolicy,
    });

    this.schedulerFunction = new lambda.Function(this, 'SchedulerFunction', {
      functionName: `${envConfig.resourcePrefix}-evolution-scheduler`,
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        const https = require('https');
        const { URL } = require('url');

        exports.handler = async (event) => {
          console.log('Evolution Scheduler triggered:', JSON.stringify(event));

          const gatewayUrl = process.env.GATEWAY_ENDPOINT_URL;
          const targets = JSON.parse(process.env.EVOLUTION_TARGETS || '[]');

          console.log('Triggering evolution analysis for targets:', targets.map(t => t.id));

          // TODO: Replace with actual HTTP call to AgentCore Gateway endpoint.
          // For each target, invoke the gateway to run the evolution analysis.
          for (const target of targets) {
            console.log('Scheduling evolution run for target:', target.id, target.name);
            // TODO: POST to gatewayUrl with target context
          }

          return { statusCode: 200, targets: targets.length };
        };
      `),
      role: schedulerRole,
      timeout: cdk.Duration.minutes(5),
      logGroup,
      environment: {
        GATEWAY_ENDPOINT_URL: gatewayEndpointUrl,
        EVOLUTION_TARGETS: JSON.stringify(envConfig.targets),
        RESOURCE_PREFIX: envConfig.resourcePrefix,
      },
    });

    // EventBridge Rule: daily at 09:00 UTC
    this.rule = new events.Rule(this, 'DailyScheduleRule', {
      ruleName: `${envConfig.resourcePrefix}-daily-evolution`,
      description: 'Triggers Evolution Agent daily at 09:00 UTC',
      schedule: events.Schedule.cron({ minute: '0', hour: '9' }),
    });

    this.rule.addTarget(
      new targets.LambdaFunction(this.schedulerFunction, {
        event: events.RuleTargetInput.fromObject({
          source: 'evolution-scheduler',
          action: 'daily-run',
          timestamp: events.EventField.time,
        }),
        retryAttempts: 2,
        maxEventAge: cdk.Duration.hours(1),
      }),
    );

    new cdk.CfnOutput(this, 'SchedulerFunctionArn', {
      value: this.schedulerFunction.functionArn,
      description: 'Evolution Scheduler Lambda ARN',
      exportName: `${envConfig.resourcePrefix}-scheduler-arn`,
    });
  }
}
