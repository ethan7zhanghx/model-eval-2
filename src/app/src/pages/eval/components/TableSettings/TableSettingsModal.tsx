import React from 'react';

import { Button } from '@app/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@app/components/ui/dialog';
import { Separator } from '@app/components/ui/separator';
import { RotateCcw, Settings } from 'lucide-react';
import SettingsPanel from './components/SettingsPanel';
import { useSettingsState } from './hooks/useSettingsState';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

const TableSettingsModal = ({ open, onClose }: SettingsModalProps) => {
  const { resetToDefaults } = useSettingsState(open);

  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-[680px] p-0 overflow-hidden">
        <DialogHeader className="p-5 pb-3 border-b border-border/10">
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <Settings className="size-5 text-primary" />
            表格设置
          </DialogTitle>
        </DialogHeader>

        <div className="p-0">
          <SettingsPanel />
        </div>

        <Separator className="opacity-60" />

        <DialogFooter className="px-5 py-3 justify-between">
          <Button
            onClick={resetToDefaults}
            variant="ghost"
            size="sm"
            aria-label="恢复默认设置"
            title="将所有设置恢复为默认值"
          >
            <RotateCcw className="size-4 mr-2" />
            恢复默认设置
          </Button>
          <Button onClick={handleClose}>完成</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default React.memo(TableSettingsModal);
