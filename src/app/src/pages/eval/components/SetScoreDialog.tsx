import React, { useState } from 'react';

import { Button } from '@app/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@app/components/ui/dialog';
import { Input } from '@app/components/ui/input';

interface SetScoreDialogProps {
  open: boolean;
  currentScore: number;
  onClose: () => void;
  onSave: (score: number) => void;
}

export default function SetScoreDialog({
  open,
  currentScore,
  onClose,
  onSave,
}: SetScoreDialogProps) {
  const [scoreValue, setScoreValue] = useState(String(currentScore));
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    const parsed = Number.parseFloat(scoreValue);
    if (Number.isNaN(parsed) || parsed < 0.0 || parsed > 1.0) {
      setError('请输入 0.0 到 1.0 之间的分数。');
      return;
    }
    onSave(parsed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>设置测试分数</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <label htmlFor="score-input" className="text-sm text-muted-foreground">
            分数（0.0 - 1.0）
          </label>
          <Input
            id="score-input"
            autoFocus
            type="number"
            min={0}
            max={1}
            step={0.01}
            value={scoreValue}
            onChange={(e) => {
              setScoreValue(e.target.value);
              setError(null);
            }}
            onKeyDown={handleKeyDown}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button onClick={onClose} variant="outline">
            取消
          </Button>
          <Button onClick={handleSave}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
