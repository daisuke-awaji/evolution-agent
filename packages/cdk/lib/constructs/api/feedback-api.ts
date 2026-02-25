import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';
import type { EnvironmentConfig } from '../../../config';

export interface FeedbackApiProps {
  envConfig: EnvironmentConfig;
  feedbackTable: dynamodb.ITable;
  reportsTable: dynamodb.ITable;
  userPool: cognito.IUserPool;
}

export class FeedbackApi extends Construct {
  public readonly apiUrl: string;
  public readonly apiFunction: lambda.Function;

  constructor(scope: Construct, id: string, props: FeedbackApiProps) {
    super(scope, id);

    const { envConfig, feedbackTable, reportsTable, userPool } = props;

    const apiRole = new iam.Role(this, 'ApiRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    const logGroup = new logs.LogGroup(this, 'ApiLogGroup', {
      logGroupName: `/aws/lambda/${envConfig.resourcePrefix}-feedback-api`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: envConfig.s3RemovalPolicy,
    });

    // Lambda Web Adapter pattern: Docker image function with Lambda Web Adapter layer.
    // TODO: Replace inline stub with actual DockerImageFunction backed by packages/api
    // container when the image is available:
    //   new lambda.DockerImageFunction(this, 'ApiFunction', {
    //     code: lambda.DockerImageCode.fromImageAsset('../../packages/api'),
    //     ...
    //   })
    this.apiFunction = new lambda.Function(this, 'ApiFunction', {
      functionName: `${envConfig.resourcePrefix}-feedback-api`,
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        // TODO: Replace with actual Feedback API Docker image (Lambda Web Adapter).
        // This stub handles feedback CRUD operations against DynamoDB.
        exports.handler = async (event) => {
          console.log('Feedback API stub invoked:', JSON.stringify(event));
          return {
            statusCode: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': process.env.CORS_ALLOWED_ORIGINS || '*',
            },
            body: JSON.stringify({ message: 'Feedback API stub — replace with real implementation' }),
          };
        };
      `),
      role: apiRole,
      timeout: cdk.Duration.seconds(30),
      logGroup,
      environment: {
        COGNITO_USER_POOL_ID: userPool.userPoolId,
        COGNITO_REGION: cdk.Stack.of(this).region,
        FEEDBACK_TABLE_NAME: feedbackTable.tableName,
        REPORTS_TABLE_NAME: reportsTable.tableName,
        API_KEYS: '',
        CORS_ALLOWED_ORIGINS: envConfig.corsAllowedOrigins.join(','),
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      },
    });

    feedbackTable.grantReadWriteData(this.apiFunction);
    reportsTable.grantReadWriteData(this.apiFunction);

    // Function URL with CORS enabled
    const fnUrl = this.apiFunction.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      cors: {
        allowedOrigins: envConfig.corsAllowedOrigins,
        allowedMethods: [lambda.HttpMethod.ALL],
        allowedHeaders: ['*'],
        allowCredentials: true,
      },
    });

    this.apiUrl = fnUrl.url;

    new cdk.CfnOutput(this, 'FeedbackApiUrl', {
      value: fnUrl.url,
      description: 'Feedback API endpoint URL',
      exportName: `${envConfig.resourcePrefix}-feedback-api-url`,
    });
  }
}
