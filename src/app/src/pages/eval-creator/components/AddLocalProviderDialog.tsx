import React from 'react';

import { Button } from '@app/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@app/components/ui/dialog';
import { HelperText } from '@app/components/ui/helper-text';
import { Input } from '@app/components/ui/input';
import { Label } from '@app/components/ui/label';
import { isJavascriptFile } from '@promptfoo/util/fileExtensions';
import type { ProviderOptions } from '@promptfoo/types';

interface AddLocalProviderDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (provider: ProviderOptions) => void;
}

const AddLocalProviderDialog = ({ open, onClose, onAdd }: AddLocalProviderDialogProps) => {
  const [path, setPath] = React.useState('');
  const [error, setError] = React.useState('');

  const handleSubmit = () => {
    const trimmedPath = path.trim();

    if (!trimmedPath) {
      setError('请输入文件路径');
      return;
    }

    if (
      !isJavascriptFile(trimmedPath) &&
      !trimmedPath.endsWith('.py') &&
      !trimmedPath.endsWith('.go') &&
      !trimmedPath.endsWith('.rb')
    ) {
      setError('仅支持 javascript、python、go 和 ruby 文件');
      return;
    }

    const provider: ProviderOptions = {
      id: `file://${trimmedPath}`,
      config: {},
      label: trimmedPath.split('/').pop() || trimmedPath,
    };

    onAdd(provider);
    onClose();
    setPath('');
    setError('');
  };

  const handleClose = () => {
    setPath('');
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>添加本地 Provider</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            输入本地 Provider 实现文件的绝对路径（如 .py、.js、.go 或 .rb）。
            该文件会被写入当前评测配置中。
          </p>

          <div className="space-y-2">
            <Label htmlFor="provider-path">Provider 路径</Label>
            <Input
              id="provider-path"
              placeholder="/absolute/path/to/your/provider.py"
              value={path}
              onChange={(e) => {
                setPath(e.target.value);
                setError('');
              }}
              className={error ? 'border-destructive' : ''}
            />
            <HelperText error={!!error}>
              {error || '示例：/home/user/projects/my-provider.py'}
            </HelperText>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            取消
          </Button>
          <Button onClick={handleSubmit}>添加 Provider</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddLocalProviderDialog;
