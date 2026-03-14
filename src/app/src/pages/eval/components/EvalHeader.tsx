import React from 'react';

import { Badge } from '@app/components/ui/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@app/components/ui/breadcrumb';
import { Button } from '@app/components/ui/button';
import { Chip } from '@app/components/ui/chip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@app/components/ui/dropdown-menu';
import { EVAL_ROUTES } from '@app/constants/routes';
import { useToast } from '@app/hooks/useToast';
import { cn } from '@app/lib/utils';
import { fetchUserEmail, updateEvalAuthor } from '@app/utils/api';
import { formatDuration } from '@app/utils/date';
import { ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AuthorChip } from './AuthorChip';
import { EvalIdChip } from './EvalIdChip';
import EvalSelectorDialog from './EvalSelectorDialog';
import EvalSelectorKeyboardShortcut from './EvalSelectorKeyboardShortcut';
import { useTableStore } from './store';
import type { ResultLightweightWithLabel } from '@promptfoo/types';

export type ActiveView = 'results';

interface EvalHeaderProps {
  recentEvals: ResultLightweightWithLabel[];
  onRecentEvalSelected: (evalId: string) => void;
  defaultEvalId?: string;
  activeView: ActiveView;
  onActiveViewChange: (view: ActiveView) => void;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  /** Constrain header content width (e.g. "max-w-7xl mx-auto" for report view) */
  contentClassName?: string;
}

export default function EvalHeader({
  recentEvals,
  onRecentEvalSelected,
  defaultEvalId: _defaultEvalId,
  activeView: _activeView,
  onActiveViewChange: _onActiveViewChange,
  actions,
  children,
  contentClassName,
}: EvalHeaderProps) {
  const { showToast } = useToast();

  const { evalId, author, config, totalResultsCount, stats, table, setAuthor } = useTableStore();

  const { head } = table!;

  const [evalSelectorDialogOpen, setEvalSelectorDialogOpen] = React.useState(false);
  const [evalActionsOpen, setEvalActionsOpen] = React.useState(false);
  const [currentUserEmail, setCurrentUserEmail] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetchUserEmail().then((email) => {
      setCurrentUserEmail(email);
    });
  }, []);

  const isRedteam = config?.redteam !== undefined || config?.metadata?.redteam !== undefined;
  const currentEvalData = React.useMemo(
    () => recentEvals.find((e) => e.evalId === evalId),
    [recentEvals, evalId],
  );

  const formattedDate = React.useMemo(() => {
    if (!currentEvalData?.createdAt) {
      return null;
    }
    return new Date(currentEvalData.createdAt).toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, [currentEvalData?.createdAt]);

  const uniqueProviderCount = React.useMemo(
    () => new Set(head.prompts.map((p) => p.provider)).size,
    [head.prompts],
  );

  const probesCount = React.useMemo(() => {
    return head.prompts[0]?.metrics?.tokenUsage?.numRequests || totalResultsCount;
  }, [head.prompts, totalResultsCount]);

  const handleEvalIdCopyClick = () => {
    if (evalId) {
      navigator.clipboard.writeText(evalId).then(
        () => {
          showToast('评测 ID 已复制到剪贴板', 'success');
        },
        () => {
          showToast('复制评测 ID 失败', 'error');
          console.error('Failed to copy to clipboard');
        },
      );
    }
  };

  const handleEditAuthor = async (newAuthor: string) => {
    if (evalId) {
      try {
        await updateEvalAuthor(evalId, newAuthor);
        setAuthor(newAuthor);
      } catch (error) {
        console.error('Failed to update author:', error);
        throw error;
      }
    }
  };

  return (
    <>
      <div className="border-b border-border bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm shrink-0 print:bg-transparent print:border-none">
        <div className={cn('px-4 py-4 print:px-0 print:max-w-none', contentClassName)}>
          {/* Print: eval name as header */}
          <h1 className="hidden print:block text-2xl font-bold">
            {config?.description || evalId || '评测结果'}
          </h1>
          <div className="flex flex-wrap items-center gap-3 eval-header print:hidden">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to={EVAL_ROUTES.LIST}>评测记录</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage
                    onClick={() => setEvalSelectorDialogOpen(true)}
                    className="cursor-pointer hover:text-muted-foreground transition-colors"
                  >
                    <span className="inline-flex items-center gap-1">
                      {config?.description || evalId || '请选择评测'}
                      <ChevronDown className="size-3.5 text-muted-foreground" />
                    </span>
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <EvalSelectorDialog
              open={evalSelectorDialogOpen}
              onClose={() => setEvalSelectorDialogOpen(false)}
              onEvalSelected={(selectedEvalId) => {
                setEvalSelectorDialogOpen(false);
                onRecentEvalSelected(selectedEvalId);
              }}
              focusedEvalId={evalId ?? undefined}
            />
            <div className="flex flex-wrap gap-2 items-center ml-auto">
              {actions && (
                <DropdownMenu open={evalActionsOpen} onOpenChange={setEvalActionsOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      更多操作
                      <ChevronDown className="size-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">{actions}</DropdownMenuContent>
                </DropdownMenu>
              )}            </div>
          </div>
          {/* Screen: interactive chips */}
          <div className="flex flex-wrap gap-2 items-center mt-2 print:hidden">
            {evalId && <EvalIdChip evalId={evalId} onCopy={handleEvalIdCopyClick} />}
            <AuthorChip
              author={author}
              onEditAuthor={handleEditAuthor}
              currentUserEmail={currentUserEmail}
              editable
            />
            {formattedDate && (
              <Chip label="日期" interactive={false}>
                {formattedDate}
              </Chip>
            )}
            <Chip label="模型" interactive={false}>
              {uniqueProviderCount}
            </Chip>
            <Chip label="样本" interactive={false}>
              {totalResultsCount}
            </Chip>
            {isRedteam && (
              <Chip label="探针" interactive={false}>
                {probesCount}
              </Chip>
            )}
            {stats?.durationMs != null && (
              <Chip label="耗时" interactive={false}>
                {formatDuration(stats.durationMs)}
              </Chip>
            )}
            {Object.keys(config?.tags || {}).map((tag) => (
              <Badge key={tag} variant="secondary" className="opacity-70">
                {`${tag}: ${config?.tags?.[tag]}`}
              </Badge>
            ))}
          </div>
          {/* Print: clean property grid */}
          <div className="hidden print:block mt-2">
            <div className="grid grid-cols-3 gap-x-6 gap-y-1 text-sm">
              {evalId && (
                <div>
                  <span className="font-semibold text-gray-700">评测 ID：</span>{' '}
                  <span>{evalId}</span>
                </div>
              )}
              {author && (
                <div>
                  <span className="font-semibold text-gray-700">作者：</span> <span>{author}</span>
                </div>
              )}
              {formattedDate && (
                <div>
                  <span className="font-semibold text-gray-700">日期：</span>{' '}
                  <span>{formattedDate}</span>
                </div>
              )}
              <div>
                <span className="font-semibold text-gray-700">模型：</span>{' '}
                <span>{uniqueProviderCount}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-700">样本：</span>{' '}
                <span>{totalResultsCount}</span>
              </div>
              {isRedteam && (
                <div>
                  <span className="font-semibold text-gray-700">探针：</span>{' '}
                  <span>{probesCount}</span>
                </div>
              )}
              {stats?.durationMs != null && (
                <div>
                  <span className="font-semibold text-gray-700">耗时：</span>{' '}
                  <span>{formatDuration(stats.durationMs)}</span>
                </div>
              )}
              {Object.keys(config?.tags || {}).map((tag) => (
                <div key={tag}>
                  <span className="font-semibold text-gray-700">{tag}:</span>{' '}
                  <span>{config?.tags?.[tag]}</span>
                </div>
              ))}
            </div>
          </div>
          {children}
        </div>
      </div>
      <EvalSelectorKeyboardShortcut onEvalSelected={onRecentEvalSelected} />
    </>
  );
}
