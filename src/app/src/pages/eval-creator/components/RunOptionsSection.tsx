import { Card } from '@app/components/ui/card';
import { Input } from '@app/components/ui/input';
import { Label } from '@app/components/ui/label';
import RunTestSuiteButton from './RunTestSuiteButton';

interface RunOptionsSectionProps {
  description?: string;
  delay?: number;
  maxConcurrency?: number;
  onChange: (options: { description?: string; delay?: number; maxConcurrency?: number }) => void;
  isReadyToRun?: boolean;
}

export function RunOptionsSection({
  description,
  delay,
  maxConcurrency,
  onChange,
  isReadyToRun = false,
}: RunOptionsSectionProps) {
  const canSetDelay = !maxConcurrency || maxConcurrency === 1;
  const canSetMaxConcurrency = !delay || delay === 0;

  const handleDelayChange = (value: string) => {
    const parsed = value === '' ? undefined : Number(value);
    const safe = parsed !== undefined && (Number.isNaN(parsed) || parsed < 0) ? 0 : parsed;
    onChange({
      description,
      delay: safe,
      maxConcurrency: safe && safe > 0 ? 1 : maxConcurrency,
    });
  };

  const handleMaxConcurrencyChange = (value: string) => {
    const parsed = value === '' ? undefined : Number(value);
    const safe = parsed !== undefined && (Number.isNaN(parsed) || parsed < 1) ? 1 : parsed;
    onChange({
      description,
      delay: safe && safe > 1 ? 0 : delay,
      maxConcurrency: safe,
    });
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-muted/30 border-dashed">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">评测名称 / 说明</Label>
            <Input
              id="description"
              placeholder="例如：客服问答数据集 - 多模型对比"
              value={description || ''}
              onChange={(e) => onChange({ description: e.target.value, delay, maxConcurrency })}
            />
            <p className="text-xs text-muted-foreground">可选，方便后续快速识别这次评测</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="delay" className={canSetDelay ? '' : 'text-muted-foreground'}>
              API 调用间隔（毫秒）
            </Label>
            <Input
              id="delay"
              type="number"
              min="0"
              placeholder="0"
              value={delay?.toString() || ''}
              onChange={(e) => handleDelayChange(e.target.value)}
              disabled={!canSetDelay}
            />
            <p className="text-xs text-muted-foreground">
              {canSetDelay
                ? '为避免限流，可在请求之间增加间隔'
                : '若要设置调用间隔，并发数必须为 1'}
            </p>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="maxConcurrency"
              className={canSetMaxConcurrency ? '' : 'text-muted-foreground'}
            >
              最大并发请求数
            </Label>
            <Input
              id="maxConcurrency"
              type="number"
              min="1"
              placeholder="4"
              value={maxConcurrency?.toString() || ''}
              onChange={(e) => handleMaxConcurrencyChange(e.target.value)}
              disabled={!canSetMaxConcurrency}
            />
            <p className="text-xs text-muted-foreground">
              {canSetMaxConcurrency
                ? '本次评测允许同时发起的最大请求数'
                : '若要设置并发数，调用间隔必须为 0'}
            </p>
          </div>
        </div>
      </Card>

      <p className="text-sm text-muted-foreground">
        这些设置会作用于本次评测中的所有模型来源。注意：调用间隔和最大并发不能同时生效。
      </p>

      {/* Run Evaluation Section */}
      <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">可以开始运行评测了吗？</h3>
            <p className="text-sm text-muted-foreground">
              {isReadyToRun
                ? '必填步骤已经完成，点击下方即可开始评测。'
                : '请先完成模型来源、Prompt 和测试样本这三个必填步骤。'}
            </p>
          </div>

          <RunTestSuiteButton />
        </div>
      </Card>
    </div>
  );
}
