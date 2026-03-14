import React from 'react';

import { Button } from '@app/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@app/components/ui/dialog';
import { Label } from '@app/components/ui/label';
import { Textarea } from '@app/components/ui/textarea';

interface PromptDialogProps {
  open: boolean;
  prompt: string;
  index: number;
  onAdd: (prompt: string) => void;
  onCancel: () => void;
  isEditing?: boolean;
}

const PromptDialog = ({
  open,
  prompt,
  index,
  onAdd,
  onCancel,
  isEditing = false,
}: PromptDialogProps) => {
  const [editingPrompt, setEditingPrompt] = React.useState(prompt);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    setEditingPrompt(prompt);
  }, [prompt]);

  const handleAdd = (close: boolean) => {
    onAdd(editingPrompt);
    setEditingPrompt('');
    if (close) {
      onCancel();
    } else if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? `编辑 Prompt ${index + 1}` : '添加 Prompt'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 py-4">
          <Label htmlFor="prompt-input">Prompt 内容</Label>
          <Textarea
            id="prompt-input"
            ref={textareaRef}
            value={editingPrompt}
            onChange={(e) => setEditingPrompt(e.target.value)}
            placeholder="请描述一个包含 {{question}}、{{context}} 等变量的评测 Prompt"
            className="min-h-[200px] font-mono text-sm"
          />
          <p className="text-sm text-muted-foreground">
            提示：可使用 {'{{varname}}'} 语法为 Prompt 添加变量。
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onCancel}>
            取消
          </Button>
          {!isEditing && (
            <Button variant="secondary" onClick={() => handleAdd(false)} disabled={!editingPrompt}>
              继续添加
            </Button>
          )}
          <Button onClick={() => handleAdd(true)} disabled={!editingPrompt}>
            {isEditing ? '保存' : '添加'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PromptDialog;
