import React from 'react';

import { Alert, AlertContent, AlertDescription, AlertTitle } from '@app/components/ui/alert';
import { Badge } from '@app/components/ui/badge';
import { Button } from '@app/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@app/components/ui/dialog';
import { DropdownMenuItem } from '@app/components/ui/dropdown-menu';
import { SearchInput } from '@app/components/ui/search-input';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@app/components/ui/select';
import { Separator } from '@app/components/ui/separator';
import { Spinner } from '@app/components/ui/spinner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@app/components/ui/tooltip';
import { IS_RUNNING_LOCALLY } from '@app/constants';
import { EVAL_ROUTES, ROUTES } from '@app/constants/routes';
import { useToast } from '@app/hooks/useToast';
import { useStore as useMainStore } from '@app/stores/evalConfig';
import { callApi } from '@app/utils/api';
import { displayNameOverrides } from '@promptfoo/redteam/constants/metadata';
import { formatPolicyIdentifierAsMetric } from '@promptfoo/redteam/plugins/policy/utils';
import invariant from '@promptfoo/util/invariant';
import { BarChart, Copy, Edit, Eye, Play, Settings, Share, Trash2, X } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDebouncedCallback } from 'use-debounce';
import { IS_V1_MINIMAL_MODE } from '../../../constants';
import { ColumnSelector } from './ColumnSelector';
import CompareEvalMenuItem from './CompareEvalMenuItem';
import ConfigModal from './ConfigModal';
import { ConfirmEvalNameDialog } from './ConfirmEvalNameDialog';
import { DownloadDialog, DownloadMenuItem } from './DownloadMenu';
import EvalHeader from './EvalHeader';
import EvalSelectorDialog from './EvalSelectorDialog';
import { FilterChips } from './FilterChips';
import { useFilterMode } from './FilterModeProvider';
import { FilterModeSelector } from './FilterModeSelector';
import { HiddenColumnChips } from './HiddenColumnChips';
import ResultsCharts from './ResultsCharts';
import FiltersForm from './ResultsFilters/FiltersForm';
import ResultsTable from './ResultsTable';
import ShareModal from './ShareModal';
import { useResultsViewSettingsStore, useTableStore } from './store';
import SettingsModal from './TableSettings/TableSettingsModal';
import { hashVarSchema } from './utils';
import type { EvalResultsFilterMode, ResultLightweightWithLabel } from '@promptfoo/types';
import type { CopyEvalResponse } from '@promptfoo/types/api/eval';
import type { VisibilityState } from '@tanstack/table-core';

import type { ResultsFilter } from './store';


interface ResultsViewProps {
  recentEvals: ResultLightweightWithLabel[];
  onRecentEvalSelected: (file: string) => void;
  defaultEvalId?: string;
}

interface ResultsChartsSectionProps {
  canRenderResultsCharts: boolean;
  isRedteamEval: boolean;
  resultsChartsScores: number[];
  resultsChartsUnavailableReasons: string[];
  children: (toggleButton: React.ReactNode) => React.ReactNode;
}

const FILTER_MODE_LABELS: Record<string, string> = {
  all: '全部',
  failures: '失败',
  passes: '通过',
  errors: '错误',
  different: '不同',
  highlights: '高亮',
  'user-rated': '人工评分',
};

interface AppliedFilterBadgesProps {
  filters: ResultsFilter[];
  isRedteamEval: boolean;
  onRemoveFilter: (id: string) => void;
  policyIdToNameMap?: Record<string, string | undefined>;
}

function getAppliedFilterLabel(
  filter: ResultsFilter,
  policyIdToNameMap?: Record<string, string | undefined>,
): string | null {
  if (filter.type === 'metadata' && filter.operator === 'exists') {
    return filter.field ? `元数据：${filter.field}` : null;
  }

  if (filter.type === 'metric' && filter.operator === 'is_defined') {
    return filter.field ? `指标：${filter.field}` : null;
  }

  if (filter.type === 'metadata' || filter.type === 'metric') {
    if (!filter.value || !filter.field) {
      return null;
    }
  } else if (!filter.value) {
    return null;
  }

  const truncatedValue =
    filter.value.length > 50 ? `${filter.value.slice(0, 50)}...` : filter.value;

  if (filter.type === 'metric') {
    const operatorSymbols: Record<string, string> = {
      is_defined: '已定义',
      eq: '==',
      neq: '!=',
      gt: '>',
      gte: '≥',
      lt: '<',
      lte: '≤',
    };
    const operatorDisplay = operatorSymbols[filter.operator] || filter.operator;
    return `${filter.field} ${operatorDisplay} ${truncatedValue}`;
  }

  if (filter.type === 'plugin') {
    const displayName =
      displayNameOverrides[filter.value as keyof typeof displayNameOverrides] || filter.value;
    return filter.operator === 'not_equals' ? `插件 ≠ ${displayName}` : `插件：${displayName}`;
  }

  if (filter.type === 'strategy') {
    const displayName =
      displayNameOverrides[filter.value as keyof typeof displayNameOverrides] || filter.value;
    return `策略：${displayName}`;
  }

  if (filter.type === 'severity') {
    return `严重级别：${filter.value.charAt(0).toUpperCase() + filter.value.slice(1)}`;
  }

  if (filter.type === 'policy') {
    return formatPolicyIdentifierAsMetric(policyIdToNameMap?.[filter.value] ?? filter.value);
  }

  return `${filter.field} ${filter.operator.replace('_', ' ')} "${truncatedValue}"`;
}

function AppliedFilterBadges({
  filters,
  isRedteamEval,
  onRemoveFilter,
  policyIdToNameMap,
}: AppliedFilterBadgesProps) {
  return filters.map((filter) => {
    if (isRedteamEval && filter.type === 'metric' && filter.operator === 'is_defined') {
      return null;
    }

    const label = getAppliedFilterLabel(filter, policyIdToNameMap);
    if (!label) {
      return null;
    }

    return (
      <Badge key={filter.id} variant="secondary" className="text-xs h-5 gap-1" title={filter.value}>
        {label}
        <button
          type="button"
          onClick={() => onRemoveFilter(filter.id)}
          className="ml-1 hover:bg-muted rounded-full"
        >
          <X className="size-3" />
        </button>
      </Badge>
    );
  });
}

function ResultsChartsSection({
  canRenderResultsCharts,
  isRedteamEval,
  resultsChartsScores,
  resultsChartsUnavailableReasons,
  children,
}: ResultsChartsSectionProps) {
  const [renderResultsCharts, setRenderResultsCharts] = React.useState(
    !isRedteamEval && window.innerHeight >= 1100 && canRenderResultsCharts,
  );

  if (isRedteamEval) {
    return null;
  }

  const toggleButton = (
    <Button variant="ghost" size="sm" onClick={() => setRenderResultsCharts((prev) => !prev)}>
      <BarChart className="size-4 mr-2" />
      {renderResultsCharts
        ? IS_V1_MINIMAL_MODE
          ? '隐藏图表'
          : '隐藏图表'
        : IS_V1_MINIMAL_MODE
          ? '显示图表'
          : '显示图表'}
    </Button>
  );

  return (
    <>
      {children(toggleButton)}
      <div
        aria-hidden={!renderResultsCharts}
        className="overflow-hidden transition-all duration-200 ease-out motion-reduce:transition-none"
        style={{
          maxHeight: renderResultsCharts ? '1200px' : '0px',
          opacity: renderResultsCharts ? 1 : 0,
          transform: renderResultsCharts ? 'translateY(0)' : 'translateY(-4px)',
          pointerEvents: renderResultsCharts ? 'auto' : 'none',
        }}
      >
        {canRenderResultsCharts ? (
          <ResultsCharts scores={resultsChartsScores} />
        ) : (
          <Alert variant="info" className="mt-4 items-start">
            <BarChart className="size-4 mt-0.5" />
            <AlertContent>
              <AlertTitle>
                {IS_V1_MINIMAL_MODE
                  ? '当前这轮评测暂时无法展示图表'
                  : '当前这轮评测暂时无法展示图表'}
              </AlertTitle>
              <AlertDescription className="space-y-3">
                <p>
                  {IS_V1_MINIMAL_MODE
                    ? '只有当结果里包含可比较的 Prompt 和可图表化分数时，系统才会展示图表。'
                    : '只有结果中包含可比较的 Prompt 和可图表化分数时，系统才会展示图表。'}
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  {resultsChartsUnavailableReasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </AlertDescription>
            </AlertContent>
          </Alert>
        )}
      </div>
    </>
  );
}

export default function ResultsView({
  recentEvals,
  onRecentEvalSelected,
  defaultEvalId,
}: ResultsViewProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    table,

    config,
    setConfig,
    evalId,
    totalResultsCount,
    highlightedResultsCount,
    userRatedResultsCount,
    filters,
    removeFilter,
  } = useTableStore();

  const { filterMode, setFilterMode } = useFilterMode();

  const {
    setInComparisonMode,
    columnStates,
    setColumnState,
    maxTextLength,
    wordBreak,
    showInferenceDetails,
    comparisonEvalIds,
    setComparisonEvalIds,
    hiddenVarNamesBySchema,
    setHiddenVarNamesForSchema,
  } = useResultsViewSettingsStore();

  const { updateConfig } = useMainStore();

  const { showToast } = useToast();
  const initialSearchText = searchParams.get('search') || '';
  const [searchInputValue, setSearchInputValue] = React.useState(initialSearchText); // local, for responsive input
  const [debouncedSearchText, setDebouncedSearchText] = React.useState(initialSearchText); // debounced, for table/URL/pill

  // Debounced update for URL, table, and pill
  const debouncedUpdate = useDebouncedCallback((text: string) => {
    setDebouncedSearchText(text);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (text) {
          next.set('search', text);
        } else {
          next.delete('search');
        }
        return next;
      },
      { replace: true },
    );
  }, 300);

  const handleClearSearch = () => {
    setSearchInputValue('');
    debouncedUpdate.cancel();
    setDebouncedSearchText('');
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('search');
        return next;
      },
      { replace: true },
    );
  };

  const [failureFilter, setFailureFilter] = React.useState<{ [key: string]: boolean }>({});
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
  const handleFailureFilterToggle = React.useCallback(
    (columnId: string, checked: boolean) => {
      setFailureFilter((prevFailureFilter) => ({ ...prevFailureFilter, [columnId]: checked }));
    },
    [setFailureFilter],
  );

  const activeView = 'results' as const;
  const setActiveView = React.useCallback(() => {}, []);

  invariant(table, 'Table data must be loaded before rendering ResultsView');
  const { head } = table;

  const handleFilterModeChange = (mode: EvalResultsFilterMode) => {
    setFilterMode(mode);

    const newFailureFilter: { [key: string]: boolean } = {};
    head.prompts.forEach((_, idx) => {
      const columnId = `Prompt ${idx + 1}`;
      newFailureFilter[columnId] = mode === 'failures';
    });
    setFailureFilter(newFailureFilter);
  };

  const [shareModalOpen, setShareModalOpen] = React.useState(false);
  const [shareLoading, setShareLoading] = React.useState(false);

  // State for compare eval dialog
  const [compareDialogOpen, setCompareDialogOpen] = React.useState(false);

  // State for download dialog
  const [downloadDialogOpen, setDownloadDialogOpen] = React.useState(false);

  const currentEvalId = evalId || defaultEvalId || 'default';

  const handleShareButtonClick = async () => {
    if (IS_RUNNING_LOCALLY) {
      setShareLoading(true);
      setShareModalOpen(true);
    } else {
      // For non-local instances, just show the modal
      setShareModalOpen(true);
    }
  };

  const handleShare = async (id: string): Promise<string> => {
    try {
      if (!IS_RUNNING_LOCALLY) {
        // For non-local instances, include base path in the URL
        const basePath = import.meta.env.VITE_PUBLIC_BASENAME || '';
        return `${window.location.host}${basePath}${EVAL_ROUTES.DETAIL(id)}`;
      }

      const response = await callApi('/results/share', {
        method: 'POST',
        body: JSON.stringify({ id }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error('Failed to generate share URL');
      }
      const { url } = await response.json();
      return url;
    } catch (error) {
      console.error('Failed to generate share URL:', error);
      throw error;
    } finally {
      setShareLoading(false);
    }
  };

  const handleComparisonEvalSelected = async (compareEvalId: string) => {
    // Prevent self-comparison
    if (compareEvalId === currentEvalId) {
      setCompareDialogOpen(false);
      return;
    }
    setInComparisonMode(true);
    setComparisonEvalIds([...comparisonEvalIds, compareEvalId]);
    setCompareDialogOpen(false);
  };

  const hasAnyDescriptions = React.useMemo(
    () => table.body?.some((row) => row.description),
    [table.body],
  );

  const promptOptions = head.prompts.map((prompt, idx) => {
    const label = prompt.label || prompt.display || prompt.raw;
    const provider = prompt.provider || '未知';
    const displayLabel = [
      label && `"${label.slice(0, 60)}${label.length > 60 ? '...' : ''}"`,
      provider && `[${provider}]`,
    ]
      .filter(Boolean)
      .join(' ');

    return {
      value: `Prompt ${idx + 1}`,
      label: displayLabel,
      description: label,
      group: '输出',
    };
  });

  const columnData = React.useMemo(() => {
    return [
      ...(hasAnyDescriptions ? [{ value: 'description', label: '说明' }] : []),
      ...head.vars.map((_, idx) => ({
        value: `Variable ${idx + 1}`,
        label: `变量 ${idx + 1}：${
          head.vars[idx].length > 100 ? head.vars[idx].slice(0, 97) + '...' : head.vars[idx]
        }`,
        group: '变量',
      })),
      ...promptOptions,
    ];
  }, [head.vars, promptOptions, hasAnyDescriptions]);

  const [configModalOpen, setConfigModalOpen] = React.useState(false);
  const [viewSettingsModalOpen, setViewSettingsModalOpen] = React.useState(false);
  const [editNameDialogOpen, setEditNameDialogOpen] = React.useState(false);
  const [copyDialogOpen, setCopyDialogOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const allColumns = React.useMemo(
    () => [
      ...(hasAnyDescriptions ? ['description'] : []),
      ...head.vars.map((_, idx) => `Variable ${idx + 1}`),
      ...head.prompts.map((_, idx) => `Prompt ${idx + 1}`),
    ],
    [hasAnyDescriptions, head.vars, head.prompts],
  );

  const getVarNameFromColumnId = React.useCallback(
    (columnId: string): string | null => {
      const match = columnId.match(/^Variable (\d+)$/);
      if (match) {
        const varIndex = parseInt(match[1], 10) - 1;
        return head.vars[varIndex] ?? null;
      }
      return null;
    },
    [head.vars],
  );

  const schemaHash = React.useMemo(() => hashVarSchema(head.vars), [head.vars]);

  const hiddenVarNames = React.useMemo(
    () => hiddenVarNamesBySchema[schemaHash] ?? [],
    [hiddenVarNamesBySchema, schemaHash],
  );

  const currentColumnState = React.useMemo(() => {
    const savedState = columnStates[currentEvalId];
    const columnVisibility: VisibilityState = {};
    const selectedColumns: string[] = [];

    allColumns.forEach((col) => {
      const varName = getVarNameFromColumnId(col);
      if (varName !== null) {
        const isHidden = hiddenVarNames.includes(varName);
        columnVisibility[col] = !isHidden;
        if (!isHidden) {
          selectedColumns.push(col);
        }
      } else {
        // Non-variable columns (description, prompts): use per-eval state, default to visible
        const isVisible = savedState?.columnVisibility[col] ?? true;
        columnVisibility[col] = isVisible;
        if (isVisible) {
          selectedColumns.push(col);
        }
      }
    });

    return { selectedColumns, columnVisibility };
  }, [allColumns, getVarNameFromColumnId, hiddenVarNames, columnStates, currentEvalId]);

  const visiblePromptCount = React.useMemo(
    () =>
      head.prompts.filter(
        (_, idx) => currentColumnState.columnVisibility[`Prompt ${idx + 1}`] !== false,
      ).length,
    [head.prompts, currentColumnState.columnVisibility],
  );

  const updateColumnVisibility = React.useCallback(
    (columns: string[]) => {
      const newHiddenVarNames: string[] = [];

      allColumns.forEach((col) => {
        const varName = getVarNameFromColumnId(col);
        if (varName !== null) {
          const isVisible = columns.includes(col);
          if (!isVisible) {
            newHiddenVarNames.push(varName);
          }
        }
      });

      setHiddenVarNamesForSchema(schemaHash, newHiddenVarNames);

      const newColumnVisibility: VisibilityState = {};
      allColumns.forEach((col) => {
        newColumnVisibility[col] = columns.includes(col);
      });
      setColumnState(currentEvalId, {
        selectedColumns: columns,
        columnVisibility: newColumnVisibility,
      });
    },
    [
      allColumns,
      getVarNameFromColumnId,
      schemaHash,
      setHiddenVarNamesForSchema,
      setColumnState,
      currentEvalId,
    ],
  );

  const handleChange = React.useCallback(
    (newSelectedColumns: string[]) => {
      updateColumnVisibility(newSelectedColumns);
    },
    [updateColumnVisibility],
  );

  const handleSaveEvalName = React.useCallback(
    async (newName: string) => {
      try {
        invariant(config, 'Config must be loaded before updating its description');
        const newConfig = { ...config, description: newName };

        const response = await callApi(`/eval/${evalId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ config: newConfig }),
        });

        if (!response.ok) {
          throw new Error('更新评测名称失败');
        }

        setConfig(newConfig);
      } catch (error) {
        console.error('Failed to update eval name:', error);
        showToast(
          `更新评测名称失败：${error instanceof Error ? error.message : '未知错误'}`,
          'error',
        );
        throw error;
      }
    },
    [config, evalId, setConfig, showToast],
  );

  const handleCopyEval = React.useCallback(
    async (description: string) => {
      try {
        invariant(evalId, 'Eval ID must be set before copying');

        const response = await callApi(`/eval/${evalId}/copy`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ description }),
        });

        if (!response.ok) {
          throw new Error('复制评测失败');
        }

        const { id: newEvalId, distinctTestCount }: CopyEvalResponse = await response.json();

        // Open in new tab (Google Docs pattern)
        window.open(EVAL_ROUTES.DETAIL(newEvalId), '_blank');

        // Show success toast
        showToast(`已成功复制 ${distinctTestCount.toLocaleString()} 条结果`, 'success');
      } catch (error) {
        console.error('Failed to copy evaluation:', error);
        showToast(`复制评测失败：${error instanceof Error ? error.message : '未知错误'}`, 'error');
        throw error;
      }
    },
    [evalId, showToast],
  );

  /**
   * Determines the next eval to navigate to after deleting the current one
   * @returns The eval ID to navigate to, or null to go home
   */
  const getNextEvalAfterDelete = (): string | null => {
    if (!evalId || recentEvals.length === 0) {
      return null;
    }

    const currentIndex = recentEvals.findIndex((e) => e.evalId === evalId);

    // If current eval not in list or only one eval, go home
    if (currentIndex === -1 || recentEvals.length === 1) {
      return null;
    }

    // Try next eval first
    if (currentIndex < recentEvals.length - 1) {
      return recentEvals[currentIndex + 1].evalId;
    }

    // If this is the last eval, go to previous
    if (currentIndex > 0) {
      return recentEvals[currentIndex - 1].evalId;
    }

    return null;
  };

  const handleDeleteEvalClick = () => {
    if (!evalId) {
      showToast('无法删除：未找到评测 ID', 'error');
      return;
    }

    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!evalId) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await callApi(`/eval/${evalId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '删除评测失败');
      }

      showToast('评测已删除', 'success');

      // Navigate to next eval or home
      const nextEvalId = getNextEvalAfterDelete();
      if (nextEvalId) {
        onRecentEvalSelected(nextEvalId);
      } else {
        navigate('/', { replace: true });
      }
    } catch (error) {
      console.error('Failed to delete eval:', error);
      showToast(`删除评测失败：${error instanceof Error ? error.message : '未知错误'}`, 'error');
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  // Render the charts if a) they can be rendered, and b) the viewport, at mount-time, is tall enough.
  const resultsChartsScores = React.useMemo(() => {
    if (!table?.body) {
      return [];
    }
    return table?.body
      .flatMap((row) => row.outputs.map((output) => output?.score))
      .filter((score) => typeof score === 'number' && !Number.isNaN(score));
  }, [table]);

  // Determine if charts should be rendered based on score variance
  const uniqueScores = React.useMemo(() => new Set(resultsChartsScores), [resultsChartsScores]);
  const hasVariedScores = uniqueScores.size > 1;
  // When all scores are identical, still show charts if the uniform score
  // is not a binary edge value (0 or 1). Graded assertions (like llm-rubric)
  // can produce meaningful uniform scores (e.g., 0.85) that users want to visualize.
  const hasMeaningfulUniformScore =
    uniqueScores.size === 1 && ![0, 1].includes([...uniqueScores][0]);
  const isRedteamEval = config?.redteam !== undefined;

  const resultsChartsUnavailableReasons = React.useMemo(() => {
    const reasons: string[] = [];

    if (!config) {
      reasons.push('当前评测仍在加载图表配置。');
    }

    if (table.head.prompts.length <= 1) {
      reasons.push('图表至少需要两个 Prompt 才能横向对比。');
    }

    if (resultsChartsScores.length === 0) {
      reasons.push('图表至少需要一个有效的数值分数。');
    } else if (!hasVariedScores && !hasMeaningfulUniformScore) {
      reasons.push('所有分数都相同且处于二元边界值（0 或 1），因此没有可视化分布意义。');
    }

    return reasons;
  }, [config, hasMeaningfulUniformScore, hasVariedScores, resultsChartsScores.length, table]);

  const canRenderResultsCharts = resultsChartsUnavailableReasons.length === 0;
  const appliedFilters = React.useMemo(() => Object.values(filters.values), [filters.values]);

  const [resultsTableZoom, setResultsTableZoom] = React.useState(1);

  const evalActionsMenuItems = (
    <>
      <DropdownMenuItem onClick={() => setEditNameDialogOpen(true)}>
        <Edit className="size-4 mr-2" />
        修改名称
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={() => {
          updateConfig(config!);
          navigate(ROUTES.SETUP);
        }}
      >
        <Play className="size-4 mr-2" />
        编辑后重新运行
      </DropdownMenuItem>
      <CompareEvalMenuItem onClick={() => setCompareDialogOpen(true)} />
      <DropdownMenuItem onClick={() => setConfigModalOpen(true)}>
        <Eye className="size-4 mr-2" />
        查看 YAML
      </DropdownMenuItem>
      <DownloadMenuItem onClick={() => setDownloadDialogOpen(true)} />
      <DropdownMenuItem onClick={() => setCopyDialogOpen(true)}>
        <Copy className="size-4 mr-2" />
        复制评测
      </DropdownMenuItem>
      {!IS_V1_MINIMAL_MODE && (
        <DropdownMenuItem onClick={handleShareButtonClick} disabled={shareLoading}>
          {shareLoading ? <Spinner className="size-4 mr-2" /> : <Share className="size-4 mr-2" />}
          分享
        </DropdownMenuItem>
      )}
      <DropdownMenuItem onClick={handleDeleteEvalClick} className="text-destructive">
        <Trash2 className="size-4 mr-2" />
        删除
      </DropdownMenuItem>
    </>
  );

  return (
    <>
      <div
        className="flex flex-col bg-zinc-50 dark:bg-zinc-950 print:bg-white"
        style={{
          isolation: 'isolate',
          minHeight: 'calc(100vh - var(--nav-height) - var(--update-banner-height, 0px))',
        }}
      >
        <EvalHeader
          recentEvals={recentEvals}
          onRecentEvalSelected={onRecentEvalSelected}
          defaultEvalId={defaultEvalId}
          activeView={activeView}
          onActiveViewChange={setActiveView}
          actions={config ? evalActionsMenuItems : undefined}
        >
          {activeView === 'results' && (
            <ResultsChartsSection
              key={`${currentEvalId}:${isRedteamEval ? 'redteam' : canRenderResultsCharts ? 'eligible' : 'ineligible'}`}
              canRenderResultsCharts={canRenderResultsCharts}
              isRedteamEval={isRedteamEval}
              resultsChartsScores={resultsChartsScores}
              resultsChartsUnavailableReasons={resultsChartsUnavailableReasons}
            >
              {(chartsToggleButton) => (
                <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-border/50">
                  <div className="flex flex-wrap gap-2 items-center">
                    <SearchInput
                      value={searchInputValue}
                      onChange={(value) => {
                        setSearchInputValue(value);
                        debouncedUpdate(value);
                      }}
                      onClear={handleClearSearch}
                      containerClassName="w-[200px]"
                      className="h-8 text-xs"
                    />
                    <FiltersForm />
                    <div className="flex-1" />
                    <Select
                      value={String(resultsTableZoom)}
                      onValueChange={(val) => setResultsTableZoom(Number(val))}
                    >
                      <SelectTrigger className="w-[115px] h-8 text-xs">
                        <span>
                          <span className="text-[10px] font-semibold tracking-wider text-muted-foreground">
                            缩放
                          </span>{' '}
                          {Math.round(resultsTableZoom * 100)}%
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0.5">50%</SelectItem>
                        <SelectItem value="0.75">75%</SelectItem>
                        <SelectItem value="0.9">90%</SelectItem>
                        <SelectItem value="1">100%</SelectItem>
                        <SelectItem value="1.25">125%</SelectItem>
                        <SelectItem value="1.5">150%</SelectItem>
                        <SelectItem value="2">200%</SelectItem>
                      </SelectContent>
                    </Select>
                    <ColumnSelector
                      columnData={columnData}
                      selectedColumns={currentColumnState.selectedColumns}
                      onChange={handleChange}
                    />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setViewSettingsModalOpen(true)}
                        >
                          <Settings className="size-4 mr-2" />
                          表格设置
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>调整表格展示设置</TooltipContent>
                    </Tooltip>
                    {chartsToggleButton}
                  </div>
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-xs font-medium text-muted-foreground">显示：</span>
                    <FilterModeSelector
                      filterMode={filterMode}
                      onChange={handleFilterModeChange}
                      showDifferentOption={visiblePromptCount > 1}
                    />
                    {config?.redteam !== undefined && (
                      <>
                        <Separator orientation="vertical" className="h-5 mx-1" />
                        <FilterChips />
                      </>
                    )}
                    {debouncedSearchText && (
                      <Badge variant="secondary" className="text-xs h-5 gap-1">
                        搜索：
                        {debouncedSearchText.length > 4
                          ? debouncedSearchText.substring(0, 5) + '...'
                          : debouncedSearchText}
                        <button
                          type="button"
                          onClick={handleClearSearch}
                          className="ml-1 hover:bg-muted rounded-full"
                        >
                          <X className="size-3" />
                        </button>
                      </Badge>
                    )}
                    {filterMode !== 'all' && (
                      <Badge variant="secondary" className="text-xs h-5 gap-1">
                        筛选：{FILTER_MODE_LABELS[filterMode] ?? filterMode}
                        <button
                          type="button"
                          onClick={() => setFilterMode('all')}
                          className="ml-1 hover:bg-muted rounded-full"
                        >
                          <X className="size-3" />
                        </button>
                      </Badge>
                    )}
                    {filters.appliedCount > 0 && (
                      <AppliedFilterBadges
                        filters={appliedFilters}
                        isRedteamEval={isRedteamEval}
                        onRemoveFilter={removeFilter}
                        policyIdToNameMap={filters.policyIdToNameMap}
                      />
                    )}
                    {highlightedResultsCount > 0 && (
                      <Badge className="bg-primary/10 text-primary border border-primary/20 font-medium">
                        {highlightedResultsCount} 条高亮
                      </Badge>
                    )}
                    {userRatedResultsCount > 0 && (
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge
                            className="bg-purple-50 text-purple-700 border border-purple-200 font-medium cursor-pointer hover:bg-purple-100 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-800 dark:hover:bg-purple-950/50"
                            onClick={() => setFilterMode('user-rated')}
                          >
                            {userRatedResultsCount} 条人工评分
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          共有 {userRatedResultsCount} 条结果带人工评分，点击后可筛选查看。
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>
              )}
            </ResultsChartsSection>
          )}
          {currentColumnState.selectedColumns.length < columnData.length && (
            <div className="flex flex-wrap gap-2 items-center mt-2">
              <HiddenColumnChips
                columnData={columnData}
                selectedColumns={currentColumnState.selectedColumns}
                onChange={handleChange}
              />
            </div>
          )}
        </EvalHeader>
        {activeView === 'results' && (
          <div className="px-4">
            <ResultsTable
              key={currentEvalId}
              maxTextLength={maxTextLength}
              columnVisibility={currentColumnState.columnVisibility}
              wordBreak={wordBreak}
              showStats={showInferenceDetails}
              filterMode={filterMode}
              failureFilter={failureFilter}
              debouncedSearchText={debouncedSearchText}
              onFailureFilterToggle={handleFailureFilterToggle}
              zoom={resultsTableZoom}
            />
          </div>
        )}      </div>
      <ConfigModal open={configModalOpen} onClose={() => setConfigModalOpen(false)} />
      {!IS_V1_MINIMAL_MODE && (
        <ShareModal
          open={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          evalId={currentEvalId}
          onShare={handleShare}
        />
      )}
      <EvalSelectorDialog
        open={compareDialogOpen}
        onClose={() => setCompareDialogOpen(false)}
        onEvalSelected={handleComparisonEvalSelected}
        description="只有使用同一数据集的评测才能进行对比。"
        focusedEvalId={currentEvalId}
        filterByDatasetId
      />
      <DownloadDialog open={downloadDialogOpen} onClose={() => setDownloadDialogOpen(false)} />
      <SettingsModal open={viewSettingsModalOpen} onClose={() => setViewSettingsModalOpen(false)} />
      <ConfirmEvalNameDialog
        open={editNameDialogOpen}
        onClose={() => setEditNameDialogOpen(false)}
        title="修改评测名称"
        label="说明"
        currentName={config?.description || ''}
        actionButtonText="保存"
        onConfirm={handleSaveEvalName}
      />
      <ConfirmEvalNameDialog
        open={copyDialogOpen}
        onClose={() => setCopyDialogOpen(false)}
        title="复制评测"
        label="说明"
        currentName={`${config?.description || '评测结果'}（副本）`}
        actionButtonText="创建副本"
        onConfirm={handleCopyEval}
        showSizeWarning={totalResultsCount > 10000}
        itemCount={totalResultsCount}
        itemLabel="条结果"
      />

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(open) => !isDeleting && setDeleteDialogOpen(open)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="size-5 text-destructive" />
              删除评测？
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Alert variant="warning">
              <AlertContent>
                <AlertDescription>此操作不可撤销。</AlertDescription>
              </AlertContent>
            </Alert>
            <p className="text-sm text-muted-foreground">你即将永久删除：</p>
            <div className="mt-2 p-3 bg-muted/50 rounded-md border border-border">
              <p className="font-medium">{config?.description || evalId || '未命名评测'}</p>
              <div className="flex gap-2 mt-1 text-sm text-muted-foreground">
                <span>{totalResultsCount.toLocaleString()} 条结果</span>
                <span>•</span>
                <span>{head.prompts.length} 个 Prompt</span>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              取消
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={isDeleting}>
              {isDeleting ? (
                <>
                  <Spinner className="size-4 mr-2" />
                  删除中...
                </>
              ) : (
                <>
                  <Trash2 className="size-4 mr-2" />
                  删除
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
