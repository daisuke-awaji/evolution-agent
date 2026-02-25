import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { EvolutionAgentStack } from '../lib/evolution-agent-stack';
import { getEnvironmentConfig } from '../config';
import type { Environment } from '../config';

const app = new cdk.App();
const envContext = app.node.tryGetContext('env') as Environment | undefined;
const envName: Environment = envContext || 'default';
const envConfig = getEnvironmentConfig(envName);

const stackName =
  envName === 'default'
    ? 'EvolutionAgent'
    : `EvolutionAgent${envName.charAt(0).toUpperCase() + envName.slice(1)}`;

new EvolutionAgentStack(app, stackName, {
  env: {
    account: envConfig.awsAccount || process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  envConfig,
  terminationProtection: envConfig.deletionProtection,
});
