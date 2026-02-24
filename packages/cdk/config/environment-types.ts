import * as cdk from 'aws-cdk-lib';

export interface TargetConfig {
  id: string;
  name: string;
  cloudwatch: {
    logGroupNames: string[];
    namespace?: string;
    lambdaFunctionNames?: string[];
  };
  github: {
    owner: string;
    repo: string;
    defaultBranch?: string;
  };
  slack?: {
    webhookSecretName: string;
  };
  apiKeySecretName?: string;
}

export type Environment = 'default' | 'dev' | 'stg' | 'prd' | string;

export interface EnvironmentConfig {
  env: Environment;
  resourcePrefix: string;
  deletionProtection: boolean;
  corsAllowedOrigins: string[];
  githubTokenSecretName?: string;
  targets: TargetConfig[];
  // Optional
  awsAccount?: string;
  s3RemovalPolicy: cdk.RemovalPolicy;
  s3AutoDeleteObjects: boolean;
  logRetentionDays: number;
  testUser?: {
    username: string;
    email: string;
    password: string;
  };
}

export interface EnvironmentConfigInput {
  resourcePrefix?: string;
  deletionProtection?: boolean;
  corsAllowedOrigins?: string[];
  githubTokenSecretName?: string;
  targets?: TargetConfig[];
  awsAccount?: string;
  s3RemovalPolicy?: cdk.RemovalPolicy;
  s3AutoDeleteObjects?: boolean;
  logRetentionDays?: number;
  testUser?: {
    username: string;
    email: string;
    password: string;
  };
}
