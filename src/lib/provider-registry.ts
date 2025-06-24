import { google } from '@ai-sdk/google';
import { ollama } from 'ollama-ai-provider';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { LanguageModel } from 'ai';
import type { ProviderKey } from './config';
import type { ModelConfig } from './ai';

// Provider configuration interface
interface ProviderConfig {
  name: string;
  baseUrl?: string;
  apiKeyEnvVar?: string;
  defaultModelId: string;
  createModel: (modelId: string, baseUrl?: string, apiKey?: string) => LanguageModel;
  maxRetries?: number;
}

// Centralized provider registry
export const ProviderRegistry: Record<ProviderKey, ProviderConfig> = {
  groq: {
    name: 'groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    apiKeyEnvVar: 'GROQ_API_KEY',
    defaultModelId: 'llama-3.3-70b-versatile',
    createModel: (modelId, baseUrl = 'https://api.groq.com/openai/v1', apiKey) => {
      const groq = createOpenAICompatible({ name: 'groq', baseURL: baseUrl, apiKey });
      return groq(modelId);
    },
  },
  google: {
    name: 'google',
    apiKeyEnvVar: 'GOOGLE_GENERATIVE_AI_API_KEY',
    defaultModelId: 'gemini-2.0-flash-lite',
    createModel: (modelId) => google(modelId),
  },
  openrouter: {
    name: 'openrouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    apiKeyEnvVar: 'OPENROUTER_API_KEY',
    defaultModelId: 'google/gemini-2.0-flash-001',
    createModel: (modelId, baseUrl = 'https://openrouter.ai/api/v1', apiKey) => {
      const openrouter = createOpenAICompatible({ name: 'openrouter', baseURL: baseUrl, apiKey });
      return openrouter(modelId);
    },
  },
  anthropic: {
    name: 'anthropic',
    apiKeyEnvVar: 'ANTHROPIC_API_KEY',
    defaultModelId: 'claude-3-5-haiku-latest',
    createModel: (modelId) => anthropic(modelId),
  },
  openai: {
    name: 'openai',
    apiKeyEnvVar: 'OPENAI_API_KEY',
    defaultModelId: 'gpt-4o-mini',
    createModel: (modelId) => openai(modelId),
  },
  ollama: {
    name: 'ollama',
    defaultModelId: 'llama3.2',
    maxRetries: 1,
    createModel: (modelId) => ollama(modelId),
  },
  mistral: {
    name: 'mistral',
    baseUrl: 'https://api.mistral.ai/v1',
    apiKeyEnvVar: 'MISTRAL_API_KEY',
    defaultModelId: 'devstral-small-2505',
    createModel: (modelId, baseUrl = 'https://api.mistral.ai/v1', apiKey) => {
      const mistral = createOpenAICompatible({ name: 'mistral', baseURL: baseUrl, apiKey });
      return mistral(modelId);
    },
  },
  lmstudio: {
    name: 'lmstudio',
    baseUrl: 'http://localhost:1234/v1',
    defaultModelId: 'deepseek/deepseek-r1-0528-qwen3-8b',
    maxRetries: 1,
    createModel: (modelId, baseUrl = 'http://localhost:1234/v1') => {
      const lmstudio = createOpenAICompatible({ name: 'lmstudio', baseURL: baseUrl });
      return lmstudio(modelId);
    },
  },
  openaiCompatible: {
    name: 'openaiCompatible',
    baseUrl: 'http://localhost:8000/v1',
    apiKeyEnvVar: 'OPENAI_COMPATIBLE_API_KEY',
    defaultModelId: 'gpt-3.5-turbo',
    maxRetries: 1,
    createModel: (modelId, baseUrl = 'http://localhost:8000/v1', apiKey) => {
      const openaiCompatible = createOpenAICompatible({ name: 'openaiCompatible', baseURL: baseUrl, apiKey });
      return openaiCompatible(modelId);
    },
  },
};

// Utility to get model from registry
export function getModelFromRegistry(providerKey: ProviderKey, modelId?: string, baseUrl?: string, apiKey?: string): ModelConfig {
  const config = ProviderRegistry[providerKey];
  if (!config) throw new Error(`Unsupported provider: ${providerKey}`);
  
  const finalModelId = modelId || config.defaultModelId;
  const finalBaseUrl = baseUrl || config.baseUrl;
  const finalApiKey = apiKey || (config.apiKeyEnvVar ? process.env[config.apiKeyEnvVar] : undefined);
  
  if (config.apiKeyEnvVar && !finalApiKey) {
    throw new Error(`${config.name} API key is required`);
  }
  
  const model = config.createModel(finalModelId, finalBaseUrl, finalApiKey);
  return { provider: providerKey, modelId: finalModelId, model, maxRetries: config.maxRetries };
}
