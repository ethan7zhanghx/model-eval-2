import { useState } from 'react';

import { Badge } from '@app/components/ui/badge';
import { Button } from '@app/components/ui/button';
import { Card } from '@app/components/ui/card';
import { IS_V1_MINIMAL_MODE } from '@app/constants';
import { cn } from '@app/lib/utils';
import { Plus, Settings, Trash2 } from 'lucide-react';
import AddProviderDialog from './AddProviderDialog';
import AddProviderV1Dialog from './AddProviderV1Dialog';
import type { ProviderOptions } from '@promptfoo/types';

interface ProvidersListSectionProps {
  providers: ProviderOptions[];
  onChange: (providers: ProviderOptions[]) => void;
  env?: Record<string, string>;
  onEnvChange?: (env: Record<string, string>) => void;
}

function getProviderLabel(provider: ProviderOptions): string {
  if (IS_V1_MINIMAL_MODE && typeof provider.id === 'string') {
    if (provider.id.startsWith('openrouter:')) {
      return provider.label || `OpenRouter · ${provider.id.replace(/^openrouter:/, '')}`;
    }
    if (provider.id.startsWith('openai:')) {
      return provider.label || `OpenAI-compatible · ${provider.id.replace(/^openai:/, '')}`;
    }
  }
  if (provider.label) {
    return provider.label;
  }
  if (typeof provider.id === 'string') {
    return provider.id;
  }
  return '未知来源';
}

function getProviderType(provider: ProviderOptions): string {
  const id = typeof provider.id === 'string' ? provider.id : '';

  if (id.startsWith('openai:')) {
    return 'OpenAI';
  }
  if (id.startsWith('anthropic:')) {
    return 'Anthropic';
  }
  if (id.startsWith('bedrock:')) {
    return 'AWS Bedrock';
  }
  if (id.startsWith('azure:')) {
    return 'Azure';
  }
  if (id.startsWith('vertex:')) {
    return 'Google Vertex';
  }
  if (id.startsWith('openrouter:')) {
    return 'OpenRouter';
  }
  if (id === 'http') {
    return 'HTTP 接口';
  }
  if (id === 'websocket') {
    return 'WebSocket';
  }
  if (id.startsWith('file://') && id.includes('.py')) {
    return 'Python';
  }
  if (id.startsWith('file://') && id.includes('.js')) {
    return 'JavaScript';
  }
  if (id === 'browser') {
    return '浏览器自动化';
  }

  return '自定义';
}

export function ProvidersListSection({
  providers,
  onChange,
  env = {},
  onEnvChange,
}: ProvidersListSectionProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const applyEnvUpdates = (envUpdates?: Record<string, string>) => {
    if (!envUpdates || !onEnvChange) {
      return;
    }
    onEnvChange({ ...env, ...envUpdates });
  };

  const handleAddProvider = (provider: ProviderOptions, envUpdates?: Record<string, string>) => {
    onChange([...providers, provider]);
    applyEnvUpdates(envUpdates);
    setIsAddDialogOpen(false);
  };

  const handleEditProvider = (
    index: number,
    provider: ProviderOptions,
    envUpdates?: Record<string, string>,
  ) => {
    const newProviders = [...providers];
    newProviders[index] = provider;
    onChange(newProviders);
    applyEnvUpdates(envUpdates);
    setEditingIndex(null);
  };

  const handleRemoveProvider = (index: number) => {
    onChange(providers.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      {/* List of providers */}
      {providers.length > 0 ? (
        <div className="space-y-2">
          {providers.map((provider, index) => {
            const label = getProviderLabel(provider);
            const type = getProviderType(provider);

            return (
              <Card
                key={`${provider.id}-${index}`}
                className={cn(
                  'p-4 flex items-center justify-between hover:bg-muted/30 transition-colors',
                  'bg-white dark:bg-zinc-900',
                )}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium truncate">{label}</p>
                      <Badge variant="secondary" className="text-xs">
                        {type}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground font-mono truncate">
                      {typeof provider.id === 'string' ? provider.id : '自定义来源'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingIndex(index)}
                    className="size-8 p-0"
                  >
                    <Settings className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveProvider(index)}
                    className="size-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="p-8 text-center bg-muted/30 border-dashed">
          <p className="text-sm text-muted-foreground mb-4">还没有配置模型来源</p>
          <p className="text-xs text-muted-foreground">
            {IS_V1_MINIMAL_MODE
              ? '演示版建议先从 OpenRouter 或 OpenAI-compatible 接口开始。'
              : '可添加 AI 模型、HTTP 接口、Python 脚本等来源参与评测'}
          </p>
        </Card>
      )}

      {/* Add provider button */}
      <Button onClick={() => setIsAddDialogOpen(true)} className="w-full" variant="outline">
        <Plus className="size-4 mr-2" />
        {IS_V1_MINIMAL_MODE ? '添加模型来源' : '添加模型来源'}
      </Button>

      {/* Add provider dialog */}
      {IS_V1_MINIMAL_MODE ? (
        <AddProviderV1Dialog
          open={isAddDialogOpen}
          onClose={() => setIsAddDialogOpen(false)}
          onSave={({ provider, envUpdates }) => handleAddProvider(provider, envUpdates)}
          initialEnv={env}
        />
      ) : (
        <AddProviderDialog
          open={isAddDialogOpen}
          onClose={() => setIsAddDialogOpen(false)}
          onSave={handleAddProvider}
        />
      )}

      {/* Edit provider dialog */}
      {editingIndex !== null &&
        (IS_V1_MINIMAL_MODE ? (
          <AddProviderV1Dialog
            open={true}
            onClose={() => setEditingIndex(null)}
            onSave={({ provider, envUpdates }) =>
              handleEditProvider(editingIndex, provider, envUpdates)
            }
            initialProvider={providers[editingIndex]}
            initialEnv={env}
          />
        ) : (
          <AddProviderDialog
            open={true}
            onClose={() => setEditingIndex(null)}
            onSave={(provider) => handleEditProvider(editingIndex, provider)}
            initialProvider={providers[editingIndex]}
          />
        ))}
    </div>
  );
}
