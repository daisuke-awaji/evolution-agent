import { BedrockModel } from '@strands-agents/sdk';

export function createBedrockModel(modelId: string, region: string): BedrockModel {
  return new BedrockModel({ modelId, region });
}
