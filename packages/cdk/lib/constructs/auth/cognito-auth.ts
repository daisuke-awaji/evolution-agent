import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import type { EnvironmentConfig } from '../../../config';

export interface CognitoAuthProps {
  envConfig: EnvironmentConfig;
}

export class CognitoAuth extends Construct {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;

  constructor(scope: Construct, id: string, props: CognitoAuthProps) {
    super(scope, id);

    const { envConfig } = props;

    this.userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: `${envConfig.resourcePrefix}-user-pool`,
      selfSignUpEnabled: true,
      autoVerify: { email: true },
      signInAliases: { email: true },
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: envConfig.s3RemovalPolicy,
      standardAttributes: {
        email: { required: true, mutable: true },
      },
    });

    this.userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool: this.userPool,
      userPoolClientName: `${envConfig.resourcePrefix}-client`,
      authFlows: {
        userPassword: true,
        userSrp: true,
        adminUserPassword: true,
      },
      generateSecret: false,
    });

    // Optional test user creation via Custom Resource
    if (envConfig.testUser) {
      const { username, email, password } = envConfig.testUser;

      const testUserRole = new iam.Role(this, 'TestUserRole', {
        assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
        ],
        inlinePolicies: {
          CognitoAdmin: new iam.PolicyDocument({
            statements: [
              new iam.PolicyStatement({
                actions: [
                  'cognito-idp:AdminCreateUser',
                  'cognito-idp:AdminSetUserPassword',
                  'cognito-idp:AdminDeleteUser',
                ],
                resources: [this.userPool.userPoolArn],
              }),
            ],
          }),
        },
      });

      new cr.AwsCustomResource(this, 'TestUser', {
        onCreate: {
          service: 'CognitoIdentityServiceProvider',
          action: 'adminCreateUser',
          parameters: {
            UserPoolId: this.userPool.userPoolId,
            Username: username,
            UserAttributes: [
              { Name: 'email', Value: email },
              { Name: 'email_verified', Value: 'true' },
            ],
            TemporaryPassword: password,
            MessageAction: 'SUPPRESS',
          },
          physicalResourceId: cr.PhysicalResourceId.of(`test-user-${username}`),
        },
        onDelete: {
          service: 'CognitoIdentityServiceProvider',
          action: 'adminDeleteUser',
          parameters: {
            UserPoolId: this.userPool.userPoolId,
            Username: username,
          },
        },
        role: testUserRole,
      });

      new cr.AwsCustomResource(this, 'TestUserPassword', {
        onCreate: {
          service: 'CognitoIdentityServiceProvider',
          action: 'adminSetUserPassword',
          parameters: {
            UserPoolId: this.userPool.userPoolId,
            Username: username,
            Password: password,
            Permanent: true,
          },
          physicalResourceId: cr.PhysicalResourceId.of(`test-user-password-${username}`),
        },
        role: testUserRole,
      });
    }

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: this.userPool.userPoolId,
      exportName: `${envConfig.resourcePrefix}-user-pool-id`,
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: this.userPoolClient.userPoolClientId,
      exportName: `${envConfig.resourcePrefix}-user-pool-client-id`,
    });
  }
}
