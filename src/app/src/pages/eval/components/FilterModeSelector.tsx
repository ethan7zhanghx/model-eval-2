import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@app/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@app/components/ui/tooltip';
import { cn } from '@app/lib/utils';
import type { EvalResultsFilterMode } from '@promptfoo/types';

interface FilterModeSelectorProps {
  filterMode: EvalResultsFilterMode;
  onChange: (value: EvalResultsFilterMode) => void;
  showDifferentOption?: boolean;
}

const BASE_OPTIONS: { value: EvalResultsFilterMode; label: string; tooltip: string }[] = [
  { value: 'all', label: '全部结果', tooltip: '显示全部测试结果' },
  { value: 'failures', label: '仅失败', tooltip: '仅显示断言失败的样本' },
  { value: 'passes', label: '仅通过', tooltip: '仅显示通过所有断言的样本' },
  { value: 'errors', label: '仅错误', tooltip: '仅显示运行报错的样本' },
  {
    value: 'different',
    label: '输出不同',
    tooltip: '仅显示不同模型输出不一致的样本',
  },
  { value: 'highlights', label: '仅高亮', tooltip: '仅显示已高亮的结果' },
  {
    value: 'user-rated',
    label: '仅人工评分',
    tooltip: '仅显示带人工评分（赞 / 踩）的结果',
  },
];

const TOGGLE_LABELS: Record<EvalResultsFilterMode, string> = {
  all: '全部',
  failures: '失败',
  passes: '通过',
  errors: '错误',
  different: '不同',
  highlights: '高亮',
  'user-rated': '人工评分',
};

export const FilterModeSelector = ({
  filterMode,
  onChange,
  showDifferentOption = true,
}: FilterModeSelectorProps) => {
  const options = showDifferentOption
    ? BASE_OPTIONS
    : BASE_OPTIONS.filter((o) => o.value !== 'different');

  return (
    <>
      {/* Mobile: dropdown */}
      <div className="md:hidden">
        <Select value={filterMode} onValueChange={onChange}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue placeholder="全部结果" />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Desktop: toggle chips */}
      <div className="hidden md:flex items-center gap-1.5">
        {options.map((option) => (
          <Tooltip key={option.value} disableHoverableContent>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => onChange(option.value)}
                className={cn(
                  'px-2.5 py-1 text-xs font-medium rounded-md transition-all duration-150 border cursor-pointer',
                  filterMode === option.value
                    ? 'bg-primary/10 text-primary border-primary/30 hover:bg-primary/20'
                    : 'bg-background text-muted-foreground border-border hover:bg-muted hover:text-foreground',
                )}
              >
                {TOGGLE_LABELS[option.value]}
              </button>
            </TooltipTrigger>
            <TooltipContent>{option.tooltip}</TooltipContent>
          </Tooltip>
        ))}
      </div>
    </>
  );
};
