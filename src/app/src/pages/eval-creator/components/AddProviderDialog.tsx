import AddProviderV1Dialog from './AddProviderV1Dialog';
import type { ProviderOptions } from '@promptfoo/types';

interface AddProviderDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (provider: ProviderOptions) => void;
  initialProvider?: ProviderOptions;
}

export default function AddProviderDialog({
  open,
  onClose,
  onSave,
  initialProvider,
}: AddProviderDialogProps) {
  return (
    <AddProviderV1Dialog
      open={open}
      onClose={onClose}
      onSave={({ provider }) => onSave(provider)}
      initialProvider={initialProvider}
    />
  );
}

export function getProviderTypeFromId(id: string | undefined): string | undefined {
  if (!id || typeof id !== 'string') {
    return undefined;
  }

  if (id.startsWith('openrouter:')) {
    return 'openrouter';
  }

  if (id.startsWith('openai:')) {
    return 'openai-compatible';
  }

  return 'custom';
}
