import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { EvaluateTestSuiteWithEvaluateOptions, UnifiedConfig } from '../../../types/index';

function normalizeEnvValue(value: unknown): string | undefined {
  return typeof value === 'string' ? value.trim() : undefined;
}

function sanitizeEnv(
  env: Partial<Record<string, unknown>> | undefined,
): Partial<Record<string, string>> | undefined {
  if (!env || typeof env !== 'object') {
    return env as Partial<Record<string, string>> | undefined;
  }

  const nextEnv = Object.fromEntries(
    Object.entries(env)
      .map(([key, value]) => [key, normalizeEnvValue(value)])
      .filter(([, value]) => value !== undefined),
  ) as Partial<Record<string, string>>;

  const openRouterKey = nextEnv.OPENROUTER_API_KEY;
  if (
    typeof openRouterKey === 'string' &&
    openRouterKey.length > 0 &&
    !openRouterKey.startsWith('sk-or-v1-')
  ) {
    delete nextEnv.OPENROUTER_API_KEY;
  }

  return nextEnv;
}

function sanitizeConfig(config: Partial<UnifiedConfig>): Partial<UnifiedConfig> {
  return {
    ...config,
    env: sanitizeEnv(config.env as Partial<Record<string, unknown>> | undefined) as
      | UnifiedConfig['env']
      | undefined,
  };
}

export interface EvalConfigState {
  config: Partial<UnifiedConfig>;
  /** Replace the entire config */
  setConfig: (config: Partial<UnifiedConfig>) => void;
  /** Merge updates into the existing config */
  updateConfig: (updates: Partial<UnifiedConfig>) => void;
  /** Reset config to defaults */
  reset: () => void;
  /** Get the test suite in the expected format */
  getTestSuite: () => EvaluateTestSuiteWithEvaluateOptions;
}

export const DEFAULT_CONFIG: Partial<UnifiedConfig> = {
  description: '',
  providers: [],
  prompts: [],
  tests: [],
  defaultTest: {},
  derivedMetrics: [],
  env: {},
  evaluateOptions: {},
  scenarios: [],
  extensions: [],
};

export const useStore = create<EvalConfigState>()(
  persist(
    (set, get) => ({
      config: { ...DEFAULT_CONFIG },

      setConfig: (config) => set({ config: sanitizeConfig(config) }),

      updateConfig: (updates) =>
        set((state) => ({
          config: sanitizeConfig({ ...state.config, ...updates }),
        })),

      reset: () => set({ config: { ...DEFAULT_CONFIG } }),

      getTestSuite: () => {
        const { config } = get();

        // Transform config to match the expected EvaluateTestSuiteWithEvaluateOptions format
        // Note: The 'tests' field in UnifiedConfig maps to 'testCases' in the old store
        return {
          description: config.description,
          env: config.env,
          extensions: config.extensions,
          prompts: config.prompts,
          providers: config.providers,
          scenarios: config.scenarios,
          tests: config.tests || [], // This is what was 'testCases' before
          evaluateOptions: config.evaluateOptions,
          defaultTest: config.defaultTest,
          derivedMetrics: config.derivedMetrics,
        } as EvaluateTestSuiteWithEvaluateOptions;
      },
    }),
    {
      name: 'ernie-eval-studio',
      version: 2,
      skipHydration: true,
      migrate: (persistedState) => {
        const state = persistedState as { config?: Partial<UnifiedConfig> } | undefined;
        if (!state?.config) {
          return persistedState as EvalConfigState;
        }

        return {
          ...state,
          config: sanitizeConfig(state.config),
        } as EvalConfigState;
      },
    },
  ),
);
