import { DropdownMenuItem, DropdownMenuItemIcon } from '@app/components/ui/dropdown-menu';
import { GitCompareArrows } from 'lucide-react';

interface CompareEvalMenuItemProps {
  onClick: () => void;
}

function CompareEvalMenuItem({ onClick }: CompareEvalMenuItemProps) {
  return (
    <DropdownMenuItem onSelect={onClick}>
      <DropdownMenuItemIcon>
        <GitCompareArrows className="size-4" />
      </DropdownMenuItemIcon>
      与另一条评测对比
    </DropdownMenuItem>
  );
}

export default CompareEvalMenuItem;
