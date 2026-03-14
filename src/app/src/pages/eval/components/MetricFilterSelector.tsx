import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@app/components/ui/select';
import { useTableStore } from './store';

export const MetricFilterSelector = () => {
  const { filters, addFilter, resetFilters } = useTableStore();
  const availableMetrics = filters.options.metric;

  const handleChange = (value: string) => {
    // Always reset any existing filters.
    resetFilters();

    if (value && value !== 'all') {
      addFilter({
        type: 'metric',
        operator: 'equals',
        value,
      });
    }
  };

  const selectedMetric =
    Object.keys(filters.values).length > 0 ? Object.values(filters.values)[0].value : null;

  return (
    <Select value={selectedMetric ?? 'all'} onValueChange={handleChange}>
      <SelectTrigger className="min-w-[180px] h-9" aria-label="按指标筛选">
        <SelectValue placeholder="按指标筛选" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">全部指标</SelectItem>
        {availableMetrics.map((metric) => (
          <SelectItem key={metric} value={metric}>
            {metric}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
