import { useState } from 'react';

import { Alert, AlertContent, AlertDescription } from '@app/components/ui/alert';
import { Button } from '@app/components/ui/button';
import { Spinner } from '@app/components/ui/spinner';
import { EVAL_ROUTES } from '@app/constants/routes';
import { useEvalHistoryRefresh } from '@app/hooks/useEvalHistoryRefresh';
import { useToast } from '@app/hooks/useToast';
import { useStore } from '@app/stores/evalConfig';
import { callApi } from '@app/utils/api';
import { useNavigate } from 'react-router-dom';
import type { CreateJobResponse, GetJobResponse } from '@promptfoo/types/api/eval';

const RunTestSuiteButton = () => {
  const navigate = useNavigate();
  const { config } = useStore();
  const { signalEvalCompleted } = useEvalHistoryRefresh();
  const { showToast } = useToast();
  const {
    defaultTest,
    derivedMetrics,
    description,
    env,
    evaluateOptions,
    prompts,
    providers,
    scenarios,
    tests,
    extensions,
  } = config;
  const [isRunning, setIsRunning] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [runError, setRunError] = useState<string | null>(null);

  const isDisabled =
    isRunning ||
    !providers ||
    !Array.isArray(providers) ||
    providers.length === 0 ||
    !prompts ||
    prompts.length === 0 ||
    !tests ||
    (Array.isArray(tests) && tests.length === 0);

  const hasOpenRouterProvider =
    Array.isArray(providers) &&
    providers.some(
      (provider) =>
        typeof provider === 'object' &&
        provider !== null &&
        'id' in provider &&
        typeof provider.id === 'string' &&
        provider.id.startsWith('openrouter:'),
    );

  const hasOpenRouterKey =
    typeof env?.OPENROUTER_API_KEY === 'string' && env.OPENROUTER_API_KEY.trim().length > 0;
  const openRouterKeyPrefix =
    typeof env?.OPENROUTER_API_KEY === 'string' ? env.OPENROUTER_API_KEY.trim().slice(0, 12) : '';

  const runTestSuite = async () => {
    setIsRunning(true);
    setRunError(null);
    setProgressPercent(0);

    const testSuite = {
      defaultTest,
      derivedMetrics,
      description,
      env,
      evaluateOptions,
      prompts,
      providers,
      scenarios,
      tests, // Note: This is 'tests' in the API, not 'testCases'
      extensions,
    };

    const handleRunError = (error: unknown) => {
      const message = error instanceof Error ? error.message : '发生未知错误';
      setIsRunning(false);
      setRunError(message);
      showToast(`运行失败：${message}`, 'error');
    };

    try {
      if (hasOpenRouterProvider && !hasOpenRouterKey) {
        throw new Error('缺少 OpenRouter API key，请先在「接口与分享设置」中保存后再运行。');
      }

      if (
        hasOpenRouterProvider &&
        typeof env?.OPENROUTER_API_KEY === 'string' &&
        !env.OPENROUTER_API_KEY.trim().startsWith('sk-or-v1-')
      ) {
        throw new Error(
          `当前保存的 OpenRouter key 不合法，系统读到的是“${openRouterKeyPrefix || '空值'}...”。请在「配置接口」里重新粘贴真正的 sk-or-v1- 开头 key 并保存。`,
        );
      }

      const response = await callApi('/eval/job', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testSuite),
      });

      if (!response.ok) {
        throw new Error(`请求失败，状态码：${response.status}`);
      }

      const job: CreateJobResponse = await response.json();

      const intervalId = setInterval(async () => {
        try {
          const progressResponse = await callApi(`/eval/job/${job.id}/`);

          if (!progressResponse.ok) {
            clearInterval(intervalId);
            throw new Error(`请求失败，状态码：${progressResponse.status}`);
          }

          const progressData: GetJobResponse = await progressResponse.json();

          if (progressData.status === 'complete') {
            clearInterval(intervalId);
            setIsRunning(false);
            signalEvalCompleted();
            if (progressData.evalId) {
              navigate(EVAL_ROUTES.DETAIL(progressData.evalId));
            }
          } else if (progressData.status === 'error') {
            clearInterval(intervalId);
            setIsRunning(false);
            throw new Error(progressData.logs?.join('\n') || '评测任务执行失败');
          } else {
            const percent =
              progressData.total === 0
                ? 0
                : Math.round((progressData.progress / progressData.total) * 100);
            setProgressPercent(percent);
          }
        } catch (error) {
          clearInterval(intervalId);
          handleRunError(error);
        }
      }, 1000);
    } catch (error) {
      handleRunError(error);
    }
  };

  return (
    <div className="space-y-2">
      <Button onClick={runTestSuite} disabled={isDisabled}>
        {isRunning ? (
          <span className="flex items-center gap-2">
            <Spinner className="size-4" />
            已完成 {progressPercent.toFixed(0)}%
          </span>
        ) : (
          '运行评测'
        )}
      </Button>
      {runError && (
        <Alert variant="destructive">
          <AlertContent>
            <AlertDescription>{runError}</AlertDescription>
          </AlertContent>
        </Alert>
      )}
    </div>
  );
};

export default RunTestSuiteButton;
