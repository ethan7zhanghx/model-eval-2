import { Router } from 'express';
import { z } from 'zod';
import { getEnvString } from '../../envars';
import logger from '../../logger';
import { createTransformRequest, createTransformResponse } from '../../providers/httpTransforms';
import { loadApiProvider } from '../../providers/index';
import {
  doTargetPurposeDiscovery,
  type TargetPurposeDiscoveryResult,
} from '../../redteam/commands/discover';
import { neverGenerateRemote } from '../../redteam/remoteGeneration';
import { ProviderSchemas } from '../../types/api/providers';
import { fetchWithProxy } from '../../util/fetch/index';
import { testProviderConnectivity, testProviderSession } from '../../validators/testProvider';
import { getAvailableProviders } from '../config/serverConfig';
import { sendError } from '../utils/errors';
import type { Request, Response } from 'express';

import type { ProviderOptions, ProviderTestResponse } from '../../types/providers';

export const providersRouter = Router();

function normalizeModelsBaseUrl(value: string): string {
  return value
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/(chat\/completions|completions)$/i, '');
}

function extractModelItems(
  payload: unknown,
  source: 'openrouter' | 'openai-compatible',
): Array<{ id: string; label: string; isFree?: boolean; sortRank: number }> {
  type ProviderModelItem = { id: string; label: string; isFree?: boolean; sortRank: number };
  const items = Array.isArray((payload as { data?: unknown[] })?.data)
    ? ((payload as { data: unknown[] }).data ?? [])
    : [];

  const normalizedItems: Array<ProviderModelItem | null> = items.map((item) => {
    const record = item as Record<string, unknown>;
    const id = typeof record?.id === 'string' ? record.id.trim() : '';
    if (!id) {
      return null;
    }

    const displayName =
      typeof record?.name === 'string' && record.name.trim().length > 0 ? record.name : id;
    const pricing =
      record?.pricing && typeof record.pricing === 'object'
        ? (record.pricing as Record<string, unknown>)
        : undefined;
    const isFree =
      source === 'openrouter' &&
      pricing &&
      String(pricing.prompt ?? '') === '0' &&
      String(pricing.completion ?? '') === '0';
    const inputModalities =
      record?.architecture &&
      typeof record.architecture === 'object' &&
      Array.isArray((record.architecture as Record<string, unknown>).input_modalities)
        ? ((record.architecture as Record<string, unknown>).input_modalities as string[])
        : [];
    const isTextFirstModel =
      inputModalities.length === 0 ||
      (inputModalities.includes('text') && !inputModalities.includes('image'));
    const freeSuffix = isFree ? ' · free' : '';

    const normalizedItem: ProviderModelItem = {
      id,
      label: displayName === id ? `${id}${freeSuffix}` : `${displayName}${freeSuffix} (${id})`,
      isFree,
      sortRank: isFree ? 0 : isTextFirstModel ? 1 : 2,
    };
    return normalizedItem;
  });

  return normalizedItems
    .filter((item): item is ProviderModelItem => item !== null)
    .sort((a, b) => {
      if (a.sortRank !== b.sortRank) {
        return a.sortRank - b.sortRank;
      }
      return a.label.localeCompare(b.label);
    });
}

/**
 * GET /api/providers/config-status
 *
 * Returns whether a custom provider configuration exists.
 * Used by redteam setup UI to determine whether to filter provider types.
 *
 * When custom config exists (hasCustomConfig: true), redteam setup restricts
 * provider types to: http, websocket, python, javascript for testing custom implementations.
 *
 * Response:
 * - hasCustomConfig: Boolean indicating if ui-providers.yaml exists with providers
 */
providersRouter.get('/config-status', (_req: Request, res: Response): void => {
  try {
    const serverProviders = getAvailableProviders();
    const hasCustomConfig = serverProviders.length > 0;

    res.json({
      success: true,
      data: { hasCustomConfig },
    });
  } catch (error) {
    logger.error('[GET /api/providers/config-status] Error loading config status', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to load provider config status',
    });
  }
});

providersRouter.post('/models', async (req: Request, res: Response): Promise<void> => {
  const bodyResult = ProviderSchemas.Models.Request.safeParse(req.body);
  if (!bodyResult.success) {
    res.status(400).json({ error: z.prettifyError(bodyResult.error) });
    return;
  }

  const { source, apiBaseUrl, apiKey } = bodyResult.data;

  try {
    const requestUrl =
      source === 'openrouter'
        ? 'https://openrouter.ai/api/v1/models'
        : `${normalizeModelsBaseUrl(apiBaseUrl || '')}/models`;

    if (source === 'openai-compatible' && !apiBaseUrl?.trim()) {
      res.status(400).json({ error: 'apiBaseUrl is required for openai-compatible sources' });
      return;
    }

    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (apiKey?.trim()) {
      headers.Authorization = `Bearer ${apiKey.trim()}`;
    }

    const response = await fetchWithProxy(requestUrl, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.warn('[POST /api/providers/models] Failed to fetch models', {
        source,
        status: response.status,
        requestUrl,
        errorText,
      });
      res.status(response.status).json({
        error: `Failed to fetch model ids from ${source}`,
        details: errorText || `HTTP ${response.status}`,
      });
      return;
    }

    const payload = await response.json();
    const items = extractModelItems(payload, source).map(({ sortRank, ...item }) => item);

    res.status(200).json({
      source,
      fetchedFrom: requestUrl,
      items,
      total: items.length,
    });
  } catch (error) {
    logger.error('[POST /api/providers/models] Unexpected error', {
      source,
      apiBaseUrl,
      error,
    });
    sendError(res, 500, 'Failed to fetch model ids');
  }
});

providersRouter.post('/test', async (req: Request, res: Response): Promise<void> => {
  const bodyResult = ProviderSchemas.Test.Request.safeParse(req.body);
  if (!bodyResult.success) {
    res.status(400).json({ error: z.prettifyError(bodyResult.error) });
    return;
  }

  const { providerOptions } = bodyResult.data;

  const loadedProvider = await loadApiProvider(providerOptions.id, {
    options: {
      ...(providerOptions as ProviderOptions),
      config: {
        ...providerOptions.config,
        maxRetries: 1,
      },
    },
  });

  // Pass inputs explicitly from providerOptions since loaded provider may not expose config.inputs
  // Check both top-level inputs (from redteam UI) and config.inputs for backwards compatibility
  const result = await testProviderConnectivity({
    provider: loadedProvider,
    prompt: bodyResult.data.prompt,
    inputs: providerOptions.inputs || providerOptions.config?.inputs,
  });

  res.status(200).json({
    testResult: {
      success: result.success,
      message: result.message,
      error: result.error,
      changes_needed: result.analysis?.changes_needed,
      changes_needed_reason: result.analysis?.changes_needed_reason,
      changes_needed_suggestions: result.analysis?.changes_needed_suggestions,
    },
    providerResponse: result.providerResponse,
    transformedRequest: result.transformedRequest,
  } as ProviderTestResponse);
});

providersRouter.post(
  '/discover',
  async (
    req: Request,
    res: Response<TargetPurposeDiscoveryResult | { error: string }>,
  ): Promise<void> => {
    const bodyResult = ProviderSchemas.Discover.Request.safeParse(req.body);
    if (!bodyResult.success) {
      res.status(400).json({ error: z.prettifyError(bodyResult.error) });
      return;
    }
    const providerOptions = bodyResult.data;

    // Check that remote generation is enabled:
    if (neverGenerateRemote()) {
      res.status(400).json({ error: 'Requires remote generation be enabled.' });
      return;
    }

    try {
      const loadedProvider = await loadApiProvider(providerOptions.id, {
        options: providerOptions as ProviderOptions,
      });
      const result = await doTargetPurposeDiscovery(loadedProvider, undefined, false);

      if (result) {
        res.json(result);
      } else {
        res.status(500).json({ error: "Discovery failed to discover the target's purpose." });
      }
    } catch (e) {
      logger.error('Error calling target purpose discovery', {
        error: e,
        providerOptions,
      });
      sendError(res, 500, "Discovery failed to discover the target's purpose");
      return;
    }
  },
);

providersRouter.post('/http-generator', async (req: Request, res: Response): Promise<void> => {
  const bodyResult = ProviderSchemas.HttpGenerator.Request.safeParse(req.body);
  if (!bodyResult.success) {
    res.status(400).json({ error: z.prettifyError(bodyResult.error) });
    return;
  }
  const { requestExample, responseExample } = bodyResult.data;

  const HOST = getEnvString('PROMPTFOO_CLOUD_API_URL', 'https://api.promptfoo.app');

  try {
    logger.debug('[POST /providers/http-generator] Calling HTTP provider generator API', {
      requestExamplePreview: requestExample?.substring(0, 200),
      hasResponseExample: !!responseExample,
    });

    const response = await fetchWithProxy(`${HOST}/api/v1/http-provider-generator`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requestExample,
        responseExample,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('[POST /providers/http-generator] Error from cloud API', {
        status: response.status,
        errorText,
      });
      res.status(response.status).json({
        error: `HTTP error! status: ${response.status}`,
      });
      return;
    }

    const data = await response.json();
    logger.debug('[POST /providers/http-generator] Successfully generated config');
    res.status(200).json(data);
  } catch (error) {
    logger.error('[POST /providers/http-generator] Error calling HTTP provider generator', {
      error,
    });
    sendError(res, 500, 'Failed to generate HTTP configuration');
  }
});

// Test request transform endpoint
providersRouter.post(
  '/test-request-transform',
  async (req: Request, res: Response): Promise<void> => {
    const bodyResult = ProviderSchemas.TestRequestTransform.Request.safeParse(req.body);
    if (!bodyResult.success) {
      res.status(400).json({ success: false, error: z.prettifyError(bodyResult.error) });
      return;
    }
    const { transformCode, prompt } = bodyResult.data;

    try {
      // Treat empty string as undefined to show base behavior
      const normalizedTransformCode =
        transformCode && transformCode.trim() ? transformCode : undefined;

      // Use the actual HTTP provider's transform function
      const transformFn = await createTransformRequest(normalizedTransformCode);
      const result = await transformFn(
        prompt,
        {},
        { prompt: { raw: prompt, label: prompt }, vars: {} },
      );

      // Check if result is completely empty (no value at all)
      if (result === null || result === undefined) {
        res.json({
          success: false,
          error:
            'Transform returned null or undefined. Check your transform function. Did you forget to `return` the result?',
        });
        return;
      }

      res.json({
        success: true,
        result,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('[POST /providers/test-request-transform] Error', {
        error,
      });
      res.status(200).json({
        success: false,
        error: errorMessage,
      });
    }
  },
);

// Test response transform endpoint
providersRouter.post(
  '/test-response-transform',
  async (req: Request, res: Response): Promise<void> => {
    const bodyResult = ProviderSchemas.TestResponseTransform.Request.safeParse(req.body);
    if (!bodyResult.success) {
      res.status(400).json({ success: false, error: z.prettifyError(bodyResult.error) });
      return;
    }
    const { transformCode, response: responseText } = bodyResult.data;

    try {
      // Treat empty string as undefined to show base behavior
      const normalizedTransformCode =
        transformCode && transformCode.trim() ? transformCode : undefined;

      // Parse the response as JSON if possible
      let jsonData;
      try {
        jsonData = JSON.parse(responseText);
      } catch {
        jsonData = null;
      }

      // Use the actual HTTP provider's transform function
      const transformFn = await createTransformResponse(normalizedTransformCode);
      const result = transformFn(jsonData, responseText);

      // The result is always a ProviderResponse object with an 'output' field
      const output = result?.output ?? result?.raw ?? result;

      if (output === null || output === undefined || output === '') {
        res.json({
          success: false,
          error:
            'Transform returned empty result. Ensure that your sample response is correct, and check your extraction path or transform function are returning a valid result.',
          result: JSON.stringify(output),
        });
        return;
      }

      res.json({
        success: true,
        result: output,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('[POST /providers/test-response-transform] Error', {
        error,
      });
      res.status(200).json({
        success: false,
        error: errorMessage,
      });
    }
  },
);

// Test multi-turn session functionality
providersRouter.post('/test-session', async (req: Request, res: Response): Promise<void> => {
  const bodyResult = ProviderSchemas.TestSession.Request.safeParse(req.body);
  if (!bodyResult.success) {
    res.status(400).json({ error: z.prettifyError(bodyResult.error) });
    return;
  }
  const { provider: validatedProvider, sessionConfig, mainInputVariable } = bodyResult.data;

  try {
    const loadedProvider = await loadApiProvider(validatedProvider.id, {
      options: {
        ...validatedProvider,
        config: {
          ...validatedProvider.config,
          maxRetries: 1,
          sessionSource: sessionConfig?.sessionSource || validatedProvider.config?.sessionSource,
          sessionParser: sessionConfig?.sessionParser || validatedProvider.config?.sessionParser,
        },
      },
    });

    // Pass inputs from validatedProvider since loaded provider may not expose config.inputs
    // Check both top-level inputs (from redteam UI) and config.inputs for backwards compatibility
    const result = await testProviderSession({
      provider: loadedProvider,
      sessionConfig,
      inputs: validatedProvider.inputs || validatedProvider.config?.inputs,
      mainInputVariable,
    });

    res.json(result);
  } catch (error) {
    logger.error('[POST /providers/test-session] Error testing session', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to test session',
      error: 'Failed to test session',
    });
  }
});
