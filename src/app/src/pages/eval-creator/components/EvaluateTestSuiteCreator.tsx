import React, { useEffect, useState } from 'react';

import { PageContainer, PageHeader } from '@app/components/layout';
import { Button } from '@app/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@app/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@app/components/ui/tabs';
import { IS_V1_MINIMAL_MODE } from '@app/constants';
import { useToast } from '@app/hooks/useToast';
import { cn } from '@app/lib/utils';
import { useStore } from '@app/stores/evalConfig';
import { callApi } from '@app/utils/api';
import yaml from 'js-yaml';
import { Check, Upload } from 'lucide-react';
import { ErrorBoundary } from 'react-error-boundary';
import ConfigureEnvButton from './ConfigureEnvButton';
import { InfoBox } from './InfoBox';
import PromptsSection from './PromptsSection';
import { ProvidersListSection } from './ProvidersListSection';
import { RunOptionsSection } from './RunOptionsSection';
import { StepSection } from './StepSection';
import TestCasesSection from './TestCasesSection';
import YamlEditor from './YamlEditor';
import type { ProviderOptions, UnifiedConfig } from '@promptfoo/types';

function ErrorFallback({
  error,
  resetErrorBoundary,
}: {
  error: unknown;
  resetErrorBoundary: () => void;
}) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive"
    >
      <p className="font-medium">页面发生错误：</p>
      <pre className="mt-2 text-sm">{error instanceof Error ? error.message : String(error)}</pre>
      <Button variant="outline" size="sm" onClick={resetErrorBoundary} className="mt-3">
        重试
      </Button>
    </div>
  );
}

const EvaluateTestSuiteCreator = () => {
  const { showToast } = useToast();
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [hasCustomConfig, setHasCustomConfig] = useState(false);
  const [activeStep, setActiveStep] = useState(1);
  const [resetKey, setResetKey] = useState(0);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const { config, updateConfig, reset } = useStore();
  const { providers = [], prompts = [] } = config;

  // Ensure providers is always an array of ProviderOptions
  const normalizedProviders: ProviderOptions[] = React.useMemo(() => {
    if (!providers) {
      return [];
    }
    if (Array.isArray(providers)) {
      // Filter out any non-object providers (strings, functions)
      return providers.filter(
        (p): p is ProviderOptions => typeof p === 'object' && p !== null && !Array.isArray(p),
      );
    }
    return [];
  }, [providers]);

  useEffect(() => {
    useStore.persist.rehydrate();
  }, []);

  // Fetch config status to determine if ConfigureEnvButton should be shown
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
  useEffect(() => {
    let isMounted = true;

    const fetchConfigStatus = async () => {
      try {
        const response = await callApi('/providers/config-status');
        if (response.ok) {
          const data = await response.json();
          if (isMounted) {
            setHasCustomConfig(data.hasCustomConfig || false);
          }
        }
      } catch (err) {
        console.error('Failed to fetch provider config status:', err);
        const errorMessage = err instanceof Error ? err.message : '未知错误';
        showToast(`加载配置状态失败：${errorMessage}`, 'error');
        if (isMounted) {
          setHasCustomConfig(false);
        }
      }
    };

    fetchConfigStatus();

    return () => {
      isMounted = false;
    };
  }, []);

  const extractVarsFromPrompts = (prompts: string[]): string[] => {
    const varRegex = /{{\s*(\w+)\s*}}/g;
    const varsSet = new Set<string>();

    prompts.forEach((prompt) => {
      let match;
      while ((match = varRegex.exec(prompt)) !== null) {
        varsSet.add(match[1]);
      }
    });

    return Array.from(varsSet);
  };

  // Normalize prompts to string array
  const normalizedPrompts = React.useMemo(() => {
    if (!prompts || !Array.isArray(prompts)) {
      return [];
    }

    return prompts
      .map((prompt) => {
        if (typeof prompt === 'string') {
          return prompt;
        } else if (typeof prompt === 'object' && prompt !== null && 'raw' in prompt) {
          return (prompt as { raw: string }).raw;
        }
        // For functions or other types, return empty string
        return '';
      })
      .filter((p): p is string => p !== ''); // Filter out empty strings
  }, [prompts]);

  const varsList = extractVarsFromPrompts(normalizedPrompts);

  // Get test count safely
  const testCount = React.useMemo(() => {
    return Array.isArray(config.tests) ? config.tests.length : 0;
  }, [config.tests]);

  const isReadyToRun =
    normalizedProviders.length > 0 && normalizedPrompts.length > 0 && testCount > 0;

  const handleReset = () => {
    reset();
    setResetKey((k) => k + 1);
    setResetDialogOpen(false);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        if (content) {
          try {
            const parsedConfig = yaml.load(content) as Record<string, unknown>;
            if (parsedConfig && typeof parsedConfig === 'object') {
              updateConfig(parsedConfig as Partial<UnifiedConfig>);
              setResetKey((k) => k + 1);
              showToast('配置已成功加载', 'success');
            } else {
              showToast('YAML 配置无效', 'error');
            }
          } catch (err) {
            showToast(
              `YAML 解析失败：${err instanceof Error ? err.message : String(err)}`,
              'error',
            );
          }
        }
      };
      reader.onerror = () => {
        showToast('读取文件失败', 'error');
      };
      reader.readAsText(file);
    }
    // Reset the input so the same file can be uploaded again
    event.target.value = '';
  };

  return (
    <PageContainer>
      <Tabs defaultValue="ui" className="w-full">
        {/* Header */}
        <PageHeader>
          <div className="container max-w-7xl mx-auto px-4 py-10">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">
                  {IS_V1_MINIMAL_MODE ? '创建评测' : '创建评测'}
                </h1>
                <p className="text-muted-foreground">
                  {IS_V1_MINIMAL_MODE
                    ? '配置模型来源、Prompt 和数据集样本，快速完成一轮可演示的对比评测'
                    : '配置模型来源、Prompt 和数据集样本，快速完成一轮可演示的对比评测'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {!hasCustomConfig && <ConfigureEnvButton />}
                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="size-4 mr-2" />
                  {IS_V1_MINIMAL_MODE ? '导入 YAML' : '导入 YAML'}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".yaml,.yml"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button variant="outline" onClick={() => setResetDialogOpen(true)}>
                  {IS_V1_MINIMAL_MODE ? '重置' : '重置'}
                </Button>
              </div>
            </div>

            {/* Tabs Toggle */}
            <div className="mt-6">
              <TabsList>
                <TabsTrigger value="ui">可视化编辑</TabsTrigger>
                <TabsTrigger value="yaml">YAML 编辑器</TabsTrigger>
              </TabsList>
            </div>
          </div>
        </PageHeader>

        {/* Main Content */}
        <TabsContent value="ui">
          <div className="container max-w-7xl mx-auto px-4 py-8">
            <div className="flex gap-8">
              {/* Left Sidebar - Step Navigation */}
              <div className="w-64 shrink-0">
                <div className="sticky top-8 space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground mb-4 px-3">
                    {IS_V1_MINIMAL_MODE ? '操作步骤' : '操作步骤'}
                  </h3>

                  {/* Step 1 */}
                  <button
                    onClick={() => setActiveStep(1)}
                    className={cn(
                      'w-full text-left p-3 rounded-lg transition-all cursor-pointer',
                      'hover:bg-muted/50',
                      activeStep === 1 && 'ring-2 ring-primary',
                      normalizedProviders.length > 0
                        ? 'bg-emerald-50 dark:bg-emerald-950/30'
                        : 'bg-background',
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'flex items-center justify-center size-8 rounded-full border-2 shrink-0',
                          normalizedProviders.length > 0
                            ? 'bg-emerald-100 border-emerald-600 dark:bg-emerald-950/30 dark:border-emerald-400'
                            : 'bg-background border-border',
                        )}
                      >
                        {normalizedProviders.length > 0 ? (
                          <Check className="size-4 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <span className="text-sm font-bold text-muted-foreground">1</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">
                          {IS_V1_MINIMAL_MODE ? '选择模型来源' : '选择模型来源'}
                        </div>
                        {normalizedProviders.length > 0 && (
                          <div className="text-xs text-muted-foreground">
                            已配置 {normalizedProviders.length} 个
                          </div>
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Step 2 */}
                  <button
                    onClick={() => setActiveStep(2)}
                    className={cn(
                      'w-full text-left p-3 rounded-lg transition-all cursor-pointer',
                      'hover:bg-muted/50',
                      activeStep === 2 && 'ring-2 ring-primary',
                      normalizedPrompts.length > 0
                        ? 'bg-emerald-50 dark:bg-emerald-950/30'
                        : 'bg-background',
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'flex items-center justify-center size-8 rounded-full border-2 shrink-0',
                          normalizedPrompts.length > 0
                            ? 'bg-emerald-100 border-emerald-600 dark:bg-emerald-950/30 dark:border-emerald-400'
                            : 'bg-background border-border',
                        )}
                      >
                        {normalizedPrompts.length > 0 ? (
                          <Check className="size-4 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <span className="text-sm font-bold text-muted-foreground">2</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">
                          {IS_V1_MINIMAL_MODE ? '设置评测 Prompt' : '设置评测 Prompt'}
                        </div>
                        {normalizedPrompts.length > 0 && (
                          <div className="text-xs text-muted-foreground">
                            已配置 {normalizedPrompts.length} 条
                          </div>
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Step 3 */}
                  <button
                    onClick={() => setActiveStep(3)}
                    className={cn(
                      'w-full text-left p-3 rounded-lg transition-all cursor-pointer',
                      'hover:bg-muted/50',
                      activeStep === 3 && 'ring-2 ring-primary',
                      testCount > 0 ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-background',
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'flex items-center justify-center size-8 rounded-full border-2 shrink-0',
                          testCount > 0
                            ? 'bg-emerald-100 border-emerald-600 dark:bg-emerald-950/30 dark:border-emerald-400'
                            : 'bg-background border-border',
                        )}
                      >
                        {testCount > 0 ? (
                          <Check className="size-4 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <span className="text-sm font-bold text-muted-foreground">3</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">
                          {IS_V1_MINIMAL_MODE ? '加载数据集样本' : '加载数据集样本'}
                        </div>
                        {testCount > 0 && (
                          <div className="text-xs text-muted-foreground">已配置 {testCount} 条</div>
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Step 4 */}
                  <button
                    onClick={() => setActiveStep(4)}
                    className={cn(
                      'w-full text-left p-3 rounded-lg transition-all cursor-pointer',
                      'hover:bg-muted/50',
                      activeStep === 4 && 'ring-2 ring-primary',
                      config.evaluateOptions?.delay || config.evaluateOptions?.maxConcurrency
                        ? 'bg-blue-50 dark:bg-blue-950/30'
                        : 'bg-background',
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'flex items-center justify-center size-8 rounded-full border-2 shrink-0',
                          config.evaluateOptions?.delay || config.evaluateOptions?.maxConcurrency
                            ? 'bg-blue-100 border-blue-600 dark:bg-blue-950/30 dark:border-blue-400'
                            : 'bg-background border-border',
                        )}
                      >
                        {config.evaluateOptions?.delay || config.evaluateOptions?.maxConcurrency ? (
                          <Check className="size-4 text-blue-600 dark:text-blue-400" />
                        ) : (
                          <span className="text-sm font-bold text-muted-foreground">4</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">
                          {IS_V1_MINIMAL_MODE ? '运行评测' : '运行评测'}
                        </div>
                        <div className="text-xs text-muted-foreground">可选</div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Right Content Area */}
              <div className="flex-1 min-w-0">
                {/* Step 1: Providers */}
                {activeStep === 1 && (
                  <StepSection
                    stepNumber={1}
                    title={IS_V1_MINIMAL_MODE ? '选择模型来源' : '选择模型来源'}
                    description={
                      IS_V1_MINIMAL_MODE
                        ? '添加一个或多个模型来源，让演示时可以并排比较回答效果。'
                        : '选择本次要评测的模型或接口来源。'
                    }
                    isComplete={normalizedProviders.length > 0}
                    isRequired
                    count={normalizedProviders.length}
                    defaultOpen={normalizedProviders.length === 0}
                    guidance={
                      normalizedProviders.length === 0 ? (
                        <InfoBox variant="help">
                          {IS_V1_MINIMAL_MODE ? (
                            <>
                              <strong>这一步要做什么？</strong>
                              <p className="mt-1">选择这次演示里要对比的模型来源。</p>
                              <ul className="mt-2 space-y-1 list-disc list-inside ml-2">
                                <li>
                                  <strong>OpenRouter</strong> - 最快拉取可用模型
                                  ID，并直接跑通演示流程
                                </li>
                                <li>
                                  <strong>OpenAI-compatible</strong> -
                                  适合你的兼容网关或第三方厂商接口
                                </li>
                              </ul>
                              <p className="mt-2">
                                <strong>建议：</strong>
                                至少添加两个模型，这样结果页更容易展示横向对比。
                              </p>
                            </>
                          ) : (
                            <>
                              <strong>这一步要做什么？</strong>
                              <p className="mt-1">
                                选择这次要接入并参与对比的模型或接口来源。
                              </p>
                              <ul className="mt-2 space-y-1 list-disc list-inside ml-2">
                                <li>
                                  <strong>模型接口</strong> - 例如 OpenAI、Anthropic、OpenRouter 或兼容接口
                                </li>
                                <li>
                                  <strong>自定义来源</strong> - 也可以扩展到其他接口或本地实现
                                </li>
                              </ul>
                              <p className="mt-2">
                                建议至少添加两个来源，方便结果页横向比较。
                              </p>
                            </>
                          )}
                        </InfoBox>
                      ) : (
                        <InfoBox variant="tip">
                          <strong>{IS_V1_MINIMAL_MODE ? '演示提示：' : '提示：'}</strong>{' '}
                          {IS_V1_MINIMAL_MODE
                            ? '添加多个模型后，更容易向业务同学解释答案质量和稳定性的差异。'
                            : '同时测试多个来源，更容易找到更适合当前业务场景的方案。'}
                        </InfoBox>
                      )
                    }
                  >
                    <ErrorBoundary
                      FallbackComponent={ErrorFallback}
                      onReset={() => {
                        updateConfig({ providers: [] });
                      }}
                    >
                      <ProvidersListSection
                        providers={normalizedProviders}
                        env={(config.env || {}) as Record<string, string>}
                        onEnvChange={(env) => updateConfig({ env })}
                        onChange={(p) =>
                          updateConfig({
                            providers: p,
                            description:
                              config.description ||
                              (IS_V1_MINIMAL_MODE ? 'SQuAD 样本数据集演示' : config.description),
                          })
                        }
                      />
                    </ErrorBoundary>
                  </StepSection>
                )}

                {/* Step 2: Prompts */}
                {activeStep === 2 && (
                  <StepSection
                    stepNumber={2}
                    title={IS_V1_MINIMAL_MODE ? '设置评测 Prompt' : '设置评测 Prompt'}
                    description={
                      IS_V1_MINIMAL_MODE
                        ? '定义每个模型在回答数据集样本时都会收到的统一指令。'
                        : '配置发送给模型的统一 Prompt，并用变量填充样本内容。'
                    }
                    isComplete={normalizedPrompts.length > 0}
                    isRequired
                    count={normalizedPrompts.length}
                    defaultOpen={normalizedProviders.length > 0 && normalizedPrompts.length === 0}
                    guidance={
                      normalizedPrompts.length === 0 ? (
                        <InfoBox variant="help">
                          {IS_V1_MINIMAL_MODE ? (
                            <>
                              <strong>这个 Prompt 要做什么？</strong>
                              <p className="mt-1">这是所有数据集样本都会共用的一套指令模板。</p>
                              <p className="mt-2">
                                想快速演示的话，直接点击 <strong>加载演示 Prompt</strong>
                                ，它已经和内置的 SQuAD 样本集对齐。
                              </p>
                            </>
                          ) : (
                            <>
                              <strong>这个 Prompt 要做什么？</strong>
                              <p className="mt-1">
                                这是所有数据集样本都会共用的统一指令模板。
                              </p>
                              <p className="mt-2">
                                <strong>变量写法：</strong>使用{' '}
                                <code className="bg-muted px-1 py-0.5 rounded text-xs">
                                  {'{{variable_name}}'}
                                </code>{' '}
                                来创建可动态填充的 Prompt，例如：{' '}
                                <code className="bg-muted px-1 py-0.5 rounded text-xs">
                                  "Summarize this article: {'{{article}}'}"
                                </code>
                              </p>
                              <p className="mt-2">
                                运行时系统会把测试样本里的数据填充进这些变量，从而用同一个 Prompt 测不同输入。
                              </p>
                            </>
                          )}
                        </InfoBox>
                      ) : varsList.length > 0 ? (
                        <InfoBox variant="info">
                          <strong>已识别变量：</strong>{' '}
                          {varsList.map((v, i) => (
                            <span key={v}>
                              <code className="bg-primary/20 text-primary px-1.5 py-0.5 rounded text-xs">
                                {v}
                              </code>
                              {i < varsList.length - 1 ? ', ' : ''}
                            </span>
                          ))}
                          <p className="mt-2">
                            下面的数据集样本需要为这些变量提供取值；每条样本都应补齐所有变量。
                          </p>
                        </InfoBox>
                      ) : (
                        <InfoBox variant="tip">
                          <strong>建议添加变量</strong>，让 Prompt 更灵活。使用{' '}
                          <code className="bg-muted px-1 py-0.5 rounded text-xs">
                            {'{{variable_name}}'}
                          </code>{' '}
                          语法创建占位符，运行时会自动用样本数据填充。
                        </InfoBox>
                      )
                    }
                  >
                    <ErrorBoundary
                      FallbackComponent={ErrorFallback}
                      onReset={() => {
                        updateConfig({ prompts: [] });
                      }}
                    >
                      <PromptsSection />
                    </ErrorBoundary>
                  </StepSection>
                )}

                {/* Step 3: Test Cases */}
                {activeStep === 3 && (
                  <StepSection
                    stepNumber={3}
                    title={IS_V1_MINIMAL_MODE ? '加载数据集样本' : '加载数据集样本'}
                    description={
                      IS_V1_MINIMAL_MODE
                        ? '加载或导入要用于比较模型回答的数据集样本。'
                        : '配置输入样本与校验规则，用不同数据测试 Prompt 的表现。'
                    }
                    isComplete={testCount > 0}
                    isRequired
                    count={testCount}
                    defaultOpen={
                      normalizedProviders.length > 0 &&
                      normalizedPrompts.length > 0 &&
                      testCount === 0
                    }
                    guidance={
                      testCount === 0 ? (
                        <InfoBox variant="help">
                          <strong>
                            {IS_V1_MINIMAL_MODE ? '这一步是什么？' : '什么是测试样本？'}
                          </strong>
                          <p className="mt-1">
                            {IS_V1_MINIMAL_MODE
                              ? '每一行都相当于一条数据集样本。系统会把同一个 Prompt 发给所有已选模型，再检查回答是否符合预期。'
                              : '每条测试样本都包含输入数据和校验规则，用来检查 Prompt 的效果：'}
                          </p>
                          <ul className="mt-2 space-y-1 list-disc list-inside">
                            <li>
                              <strong>变量：</strong>用于填充 Prompt 占位符的输入数据
                              {varsList.length > 0 && (
                                <>
                                  {' '}
                                  （例如{' '}
                                  <code className="bg-muted px-1 py-0.5 rounded text-xs">
                                    {varsList[0]}
                                  </code>
                                  ）
                                </>
                              )}
                            </li>
                            <li>
                              <strong>断言：</strong>用于检查模型回答是否达标（可选但推荐）
                            </li>
                          </ul>
                          <p className="mt-2">
                            {IS_V1_MINIMAL_MODE ? (
                              <>
                                <strong>最快方式：</strong>点击 <strong>加载 SQuAD 演示集</strong>
                                ，预置 8 条稳定样本。
                              </>
                            ) : (
                              <>
                                <strong>示例：</strong>如果 Prompt 中包含{' '}
                                <code className="bg-muted px-1 py-0.5 rounded text-xs">
                                  {'{{topic}}'}
                                </code>{' '}
                                这样的变量，那么每条测试样本都应该提供不同的 topic 值。
                              </>
                            )}
                          </p>
                        </InfoBox>
                      ) : varsList.length > 0 ? (
                        <InfoBox variant="info">
                          <strong>必填变量：</strong>每条样本都需要为以下变量提供取值：{' '}
                          {varsList.map((v, i) => (
                            <span key={v}>
                              <code className="bg-primary/20 text-primary px-1.5 py-0.5 rounded text-xs">
                                {v}
                              </code>
                              {i < varsList.length - 1 ? ', ' : ''}
                            </span>
                          ))}
                          <p className="mt-2">
                            建议添加断言，自动检查回答是否符合质量要求，例如包含关键词、匹配正则或符合
                            JSON 格式。
                          </p>
                        </InfoBox>
                      ) : (
                        <InfoBox variant="tip">
                          <strong>建议添加断言</strong>，自动验证回答质量。
                          常见检查包括：是否包含指定文本、是否符合预期格式、是否满足长度限制，以及是否通过自定义校验。
                        </InfoBox>
                      )
                    }
                  >
                    <ErrorBoundary
                      FallbackComponent={ErrorFallback}
                      onReset={() => {
                        updateConfig({ tests: [] });
                      }}
                    >
                      <TestCasesSection varsList={varsList} />
                    </ErrorBoundary>
                  </StepSection>
                )}

                {/* Step 4: Run Options */}
                {activeStep === 4 && (
                  <StepSection
                    stepNumber={4}
                    title={IS_V1_MINIMAL_MODE ? '运行评测' : '运行评测'}
                    description={
                      IS_V1_MINIMAL_MODE
                        ? '可以先调节运行速度，再启动评测并查看并排对比结果。'
                        : '设置本次评测的运行方式，例如并发数和调用间隔。'
                    }
                    isComplete={
                      !!(config.evaluateOptions?.delay || config.evaluateOptions?.maxConcurrency)
                    }
                    defaultOpen={false}
                  >
                    <RunOptionsSection
                      description={config.description}
                      delay={config.evaluateOptions?.delay}
                      maxConcurrency={config.evaluateOptions?.maxConcurrency}
                      isReadyToRun={isReadyToRun}
                      onChange={(options) => {
                        const { description: newDesc, ...evalOptions } = options;
                        updateConfig({
                          description: newDesc,
                          evaluateOptions: {
                            ...config.evaluateOptions,
                            ...evalOptions,
                          },
                        });
                      }}
                    />
                  </StepSection>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* YAML Editor Tab */}
        <TabsContent value="yaml">
          <div className="container max-w-7xl mx-auto px-4 py-8">
            <YamlEditor key={resetKey} />
          </div>
        </TabsContent>
      </Tabs>

      {/* Reset Confirmation Dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认重置</DialogTitle>
            <DialogDescription>确定要重置所有内容吗？此操作不可撤销。</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetDialogOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleReset}>
              重置
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
};

export default EvaluateTestSuiteCreator;
