import { useCallback, useEffect, useMemo, useState } from 'react';

import { Alert, AlertDescription } from '@app/components/ui/alert';
import { Badge } from '@app/components/ui/badge';
import { Button } from '@app/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@app/components/ui/dialog';
import { Input } from '@app/components/ui/input';
import { Label } from '@app/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@app/components/ui/select';
import { Spinner } from '@app/components/ui/spinner';
import { IS_V1_MINIMAL_MODE } from '@app/constants';
import { callApi } from '@app/utils/api';
import type { ProviderOptions } from '@promptfoo/types';

type ProviderSource = 'openrouter' | 'openai-compatible';

type ProviderModelItem = {
  id: string;
  label: string;
  isFree?: boolean;
};

type SavePayload = {
  provider: ProviderOptions;
  envUpdates: Record<string, string>;
};

interface AddProviderV1DialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (payload: SavePayload) => void;
  initialProvider?: ProviderOptions;
  initialEnv?: Record<string, string>;
}

const OPENROUTER_KEY = 'OPENROUTER_API_KEY';
const OPENAI_COMPAT_KEY = 'OPENAI_COMPAT_API_KEY';

function isLocationRestrictedGoogleModel(id: string): boolean {
  return id.startsWith('google/');
}

function normalizeBaseUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, '');
  return trimmed.replace(/\/(chat\/completions|completions)$/i, '');
}

function getSourceFromProvider(provider?: ProviderOptions): ProviderSource {
  const id = typeof provider?.id === 'string' ? provider.id : '';
  if (id.startsWith('openrouter:')) {
    return 'openrouter';
  }
  return 'openai-compatible';
}

function getInitialModelId(provider?: ProviderOptions): string {
  const id = typeof provider?.id === 'string' ? provider.id : '';
  if (id.includes(':')) {
    return id.split(':').slice(1).join(':');
  }
  return '';
}

export default function AddProviderV1Dialog({
  open,
  onClose,
  onSave,
  initialProvider,
  initialEnv,
}: AddProviderV1DialogProps) {
  const [source, setSource] = useState<ProviderSource>('openrouter');
  const [label, setLabel] = useState('');
  const [modelId, setModelId] = useState('');
  const [openRouterApiKey, setOpenRouterApiKey] = useState('');
  const [compatApiKey, setCompatApiKey] = useState('');
  const [compatBaseUrl, setCompatBaseUrl] = useState('');
  const [availableModels, setAvailableModels] = useState<ProviderModelItem[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isFetchingModels, setIsFetchingModels] = useState(false);

  const isEditing = Boolean(initialProvider);
  const isOpenRouter = source === 'openrouter';
  const normalizedCompatBaseUrl = normalizeBaseUrl(compatBaseUrl);
  const canFetchCompatModels = normalizedCompatBaseUrl.length > 0;
  const handleFetchModels = useCallback(
    async (targetSource: ProviderSource = source) => {
      if (targetSource === 'openrouter' && !openRouterApiKey.trim()) {
        setFetchError(
          IS_V1_MINIMAL_MODE
            ? '请先填写 OpenRouter 密钥，再拉取模型列表。'
            : '请先填写 OpenRouter API Key，再拉取模型列表。',
        );
        return;
      }

      if (targetSource === 'openai-compatible' && !canFetchCompatModels) {
        setFetchError(
          IS_V1_MINIMAL_MODE
            ? '请先填写 Base URL，再拉取模型列表。'
            : '请先填写 Base URL，再拉取模型列表。',
        );
        return;
      }

      setIsFetchingModels(true);
      setFetchError(null);

      try {
        const response = await callApi('/providers/models', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            source: targetSource,
            apiBaseUrl: targetSource === 'openai-compatible' ? normalizedCompatBaseUrl : undefined,
            apiKey:
              targetSource === 'openrouter'
                ? openRouterApiKey.trim() || undefined
                : compatApiKey.trim() || undefined,
          }),
        });

        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.error || `HTTP ${response.status}`);
        }

        const items = Array.isArray(payload?.items) ? (payload.items as ProviderModelItem[]) : [];
        setAvailableModels(items);
        if (!modelId && items.length > 0) {
          const recommendedItem =
            items.find((item) => item.isFree && !isLocationRestrictedGoogleModel(item.id)) ||
            items.find((item) => !isLocationRestrictedGoogleModel(item.id)) ||
            items.find((item) => item.isFree) ||
            items[0];
          setModelId(recommendedItem.id);
        }
      } catch (error) {
        setAvailableModels([]);
        setFetchError(
          error instanceof Error
            ? error.message
            : IS_V1_MINIMAL_MODE
              ? '获取模型列表失败'
              : '获取模型列表失败',
        );
      } finally {
        setIsFetchingModels(false);
      }
    },
    [
      source,
      canFetchCompatModels,
      normalizedCompatBaseUrl,
      openRouterApiKey,
      compatApiKey,
      modelId,
    ],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    const nextSource = getSourceFromProvider(initialProvider);
    const nextModelId = getInitialModelId(initialProvider);
    const nextLabel =
      typeof initialProvider?.label === 'string' ? initialProvider.label : nextModelId;
    const nextCompatBaseUrl =
      typeof initialProvider?.config?.apiBaseUrl === 'string'
        ? initialProvider.config.apiBaseUrl
        : '';

    setSource(nextSource);
    setModelId(nextModelId);
    setLabel(nextLabel || '');
    setOpenRouterApiKey(initialEnv?.[OPENROUTER_KEY] || '');
    setCompatApiKey(initialEnv?.[OPENAI_COMPAT_KEY] || '');
    setCompatBaseUrl(nextCompatBaseUrl || '');
    setAvailableModels([]);
    setFetchError(null);
  }, [open, initialProvider, initialEnv]);

  useEffect(() => {
    if (!open || !isOpenRouter || !openRouterApiKey.trim()) {
      return;
    }
    void handleFetchModels('openrouter');
  }, [open, isOpenRouter, openRouterApiKey, handleFetchModels]);

  const canSave = useMemo(() => {
    if (!modelId.trim()) {
      return false;
    }
    if (isOpenRouter) {
      return openRouterApiKey.trim().length > 0;
    }
    return compatApiKey.trim().length > 0 && normalizedCompatBaseUrl.length > 0;
  }, [compatApiKey, isOpenRouter, modelId, normalizedCompatBaseUrl.length, openRouterApiKey]);

  function handleSave() {
    const cleanModelId = modelId.trim();
    const cleanLabel = label.trim() || cleanModelId;

    if (!cleanModelId) {
      return;
    }

    if (isOpenRouter) {
      onSave({
        provider: {
          id: `openrouter:${cleanModelId}`,
          label: cleanLabel,
          config: {
            apiKeyEnvar: OPENROUTER_KEY,
            temperature: 0,
            showThinking: false,
          },
        },
        envUpdates: {
          [OPENROUTER_KEY]: openRouterApiKey.trim(),
        },
      });
      onClose();
      return;
    }

    onSave({
      provider: {
        id: `openai:${cleanModelId}`,
        label: cleanLabel,
        config: {
          apiKeyEnvar: OPENAI_COMPAT_KEY,
          apiBaseUrl: normalizedCompatBaseUrl,
          temperature: 0,
          showThinking: false,
        },
      },
      envUpdates: {
        [OPENAI_COMPAT_KEY]: compatApiKey.trim(),
      },
    });
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(isDialogOpen) => !isDialogOpen && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? IS_V1_MINIMAL_MODE
                ? '编辑模型来源'
                : '编辑模型来源'
              : IS_V1_MINIMAL_MODE
                ? '添加模型来源'
                : '添加模型来源'}
          </DialogTitle>
          <DialogDescription>
            {IS_V1_MINIMAL_MODE
              ? 'V1 版本先聚焦两类来源：OpenRouter 和 OpenAI-compatible 接口。'
              : '当前版本先聚焦两类来源：OpenRouter 和 OpenAI-compatible 接口。'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label>{IS_V1_MINIMAL_MODE ? '模型来源' : '模型来源'}</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={isOpenRouter ? 'default' : 'outline'}
                onClick={() => {
                  setSource('openrouter');
                  setAvailableModels([]);
                  setFetchError(null);
                }}
              >
                OpenRouter
              </Button>
              <Button
                type="button"
                variant={isOpenRouter ? 'outline' : 'default'}
                onClick={() => {
                  setSource('openai-compatible');
                  setAvailableModels([]);
                  setFetchError(null);
                }}
              >
                OpenAI-compatible
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-4">
            {isOpenRouter ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="openrouter-api-key">
                    {IS_V1_MINIMAL_MODE ? 'OpenRouter 密钥' : 'OpenRouter 密钥'}
                  </Label>
                  <Input
                    id="openrouter-api-key"
                    type="password"
                    value={openRouterApiKey}
                    onChange={(e) => setOpenRouterApiKey(e.target.value)}
                    placeholder="sk-or-v1-..."
                  />
                  <p className="text-xs text-muted-foreground">
                    {IS_V1_MINIMAL_MODE
                      ? '系统会自动拉取 OpenRouter 的公开模型列表，并优先把免费模型排在前面，方便演示。'
                      : '系统会自动拉取 OpenRouter 的公开模型列表，并优先展示免费模型，便于演示。'}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label>{IS_V1_MINIMAL_MODE ? '模型' : '模型'}</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void handleFetchModels('openrouter')}
                      disabled={isFetchingModels}
                    >
                      {isFetchingModels ? (
                        <>
                          <Spinner className="size-4 mr-2" />
                          {IS_V1_MINIMAL_MODE ? '刷新中' : '刷新中'}
                        </>
                      ) : IS_V1_MINIMAL_MODE ? (
                        '刷新模型列表'
                      ) : (
                        '刷新模型列表'
                      )}
                    </Button>
                  </div>
                  {availableModels.length > 0 ? (
                    <Select value={modelId} onValueChange={setModelId}>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={IS_V1_MINIMAL_MODE ? '请选择模型' : '请选择模型'}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {availableModels.slice(0, 200).map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={modelId}
                      onChange={(e) => setModelId(e.target.value)}
                      placeholder={
                        IS_V1_MINIMAL_MODE ? '例如：openai/gpt-4o-mini' : '例如：openai/gpt-4o-mini'
                      }
                    />
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="compat-base-url">
                    {IS_V1_MINIMAL_MODE ? 'Base URL' : 'Base URL'}
                  </Label>
                  <Input
                    id="compat-base-url"
                    value={compatBaseUrl}
                    onChange={(e) => setCompatBaseUrl(e.target.value)}
                    placeholder="https://api.openai.com/v1"
                  />
                  <p className="text-xs text-muted-foreground">
                    {IS_V1_MINIMAL_MODE
                      ? '支持 OpenAI-compatible 接口，系统会尝试从'
                      : '支持 OpenAI-compatible 接口。系统会尝试从'}
                    <code className="ml-1">{'{baseUrl}'}/models</code>
                    {IS_V1_MINIMAL_MODE ? ' 自动拉取模型列表。' : '.'}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="compat-api-key">
                    {IS_V1_MINIMAL_MODE ? '接口密钥' : '接口密钥'}
                  </Label>
                  <Input
                    id="compat-api-key"
                    type="password"
                    value={compatApiKey}
                    onChange={(e) => setCompatApiKey(e.target.value)}
                    placeholder="请输入你的 API Key"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label>{IS_V1_MINIMAL_MODE ? '模型' : '模型'}</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void handleFetchModels('openai-compatible')}
                      disabled={isFetchingModels || !canFetchCompatModels}
                    >
                      {isFetchingModels ? (
                        <>
                          <Spinner className="size-4 mr-2" />
                          {IS_V1_MINIMAL_MODE ? '加载中' : '加载中'}
                        </>
                      ) : IS_V1_MINIMAL_MODE ? (
                        '拉取模型列表'
                      ) : (
                        '拉取模型列表'
                      )}
                    </Button>
                  </div>
                  {availableModels.length > 0 ? (
                    <Select value={modelId} onValueChange={setModelId}>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={IS_V1_MINIMAL_MODE ? '请选择模型' : '请选择模型'}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {availableModels.slice(0, 200).map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={modelId}
                      onChange={(e) => setModelId(e.target.value)}
                      placeholder={
                        IS_V1_MINIMAL_MODE
                          ? '如果自动拉取失败，可以手动输入 model id'
                          : '如果自动拉取失败，可手动输入 model id'
                      }
                    />
                  )}
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="provider-label">{IS_V1_MINIMAL_MODE ? '展示名称' : '展示名称'}</Label>
              <Input
                id="provider-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={
                  IS_V1_MINIMAL_MODE
                    ? '可选：给业务同学更容易理解的名称'
                    : '可选：填一个更便于业务同学理解的名称'
                }
              />
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">
                  {isOpenRouter ? 'OpenRouter' : 'OpenAI-compatible'}
                </Badge>
                {isOpenRouter && availableModels.find((item) => item.id === modelId)?.isFree ? (
                  <Badge variant="outline">{IS_V1_MINIMAL_MODE ? '免费模型' : '免费模型'}</Badge>
                ) : null}
                {modelId ? <Badge variant="outline">{modelId}</Badge> : null}
              </div>
            </div>
          </div>

          {fetchError ? (
            <Alert variant="destructive">
              <AlertDescription>{fetchError}</AlertDescription>
            </Alert>
          ) : null}

          {!fetchError && isOpenRouter && isLocationRestrictedGoogleModel(modelId) ? (
            <Alert>
              <AlertDescription>
                {IS_V1_MINIMAL_MODE
                  ? '当前选中的 Google 系模型可能会因为地区限制返回失败。演示时更推荐先选 Mistral、Qwen、Llama 等非 Google 模型。'
                  : '当前 Google 系模型可能会因为地区限制而失败。演示时更建议优先选择 Mistral、Qwen、Llama 等非 Google 模型。'}
              </AlertDescription>
            </Alert>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {IS_V1_MINIMAL_MODE ? '取消' : '取消'}
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {isEditing
              ? IS_V1_MINIMAL_MODE
                ? '保存修改'
                : '保存修改'
              : IS_V1_MINIMAL_MODE
                ? '添加来源'
                : '添加来源'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
