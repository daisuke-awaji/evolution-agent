import { Agent } from '@strands-agents/sdk';
import { config, logger } from './config/index.js';
import { allTools } from './tools/index.js';
import { buildSystemPrompt } from './prompts/index.js';
import { createBedrockModel } from './models/bedrock.js';

export interface CreateAgentOptions {
  modelId?: string;
  systemPrompt?: string;
}

export function createAgent(options: CreateAgentOptions = {}): Agent {
  const modelId = options.modelId ?? config.BEDROCK_MODEL_ID;
  const region = config.BEDROCK_REGION;

  const model = createBedrockModel(modelId, region);

  const systemPrompt =
    options.systemPrompt ?? buildSystemPrompt({ targets: config.EVOLUTION_TARGETS });

  logger.info('Creating Evolution Agent:', {
    modelId,
    region,
    targetCount: config.EVOLUTION_TARGETS.length,
    toolCount: allTools.length,
  });

  const agent = new Agent({
    model,
    systemPrompt,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tools: allTools as any,
  });

  return agent;
}
