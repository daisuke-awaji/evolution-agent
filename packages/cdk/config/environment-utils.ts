import { environments, BASE_PREFIX } from './environments';
import type { Environment, EnvironmentConfig } from './environment-types';
import * as cdk from 'aws-cdk-lib';

export function getEnvironmentConfig(env: Environment): EnvironmentConfig {
  const input = environments[env] || environments['default'];
  const prefix = input.resourcePrefix || (env === 'default' ? BASE_PREFIX : `${BASE_PREFIX}${env}`);

  return {
    env,
    resourcePrefix: prefix,
    deletionProtection: input.deletionProtection ?? false,
    corsAllowedOrigins: input.corsAllowedOrigins ?? ['*'],
    githubTokenSecretName: input.githubTokenSecretName,
    targets: input.targets ?? [],
    awsAccount: input.awsAccount,
    s3RemovalPolicy: input.s3RemovalPolicy ?? cdk.RemovalPolicy.DESTROY,
    s3AutoDeleteObjects: input.s3AutoDeleteObjects ?? true,
    logRetentionDays: input.logRetentionDays ?? 7,
    testUser: input.testUser,
  };
}
