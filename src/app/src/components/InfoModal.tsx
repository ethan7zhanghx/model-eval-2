import { Button } from '@app/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@app/components/ui/dialog';

export default function InfoModal<T extends { open: boolean; onClose: () => void }>({
  open,
  onClose,
}: T) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>关于 ERNIE Eval</DialogTitle>
          <span className="text-sm text-muted-foreground">
            版本 {import.meta.env.VITE_PROMPTFOO_VERSION}
          </span>
        </DialogHeader>
        <DialogDescription>
          ERNIE Eval 是一个本地优先的数据集评测工具，面向产品、运营和策略团队，
          用来快速比较不同模型在同一批样本上的回答效果，帮助判断数据集是否有业务价值。
        </DialogDescription>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
