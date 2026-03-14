import { useEffect, useState } from 'react';

import { Button } from '@app/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@app/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@app/components/ui/dialog';
import { ExpandMoreIcon, SettingsIcon } from '@app/components/ui/icons';
import { Input } from '@app/components/ui/input';
import { Label } from '@app/components/ui/label';
import { IS_V1_MINIMAL_MODE } from '@app/constants';
import { useToast } from '@app/hooks/useToast';
import { cn } from '@app/lib/utils';
import { useStore } from '@app/stores/evalConfig';

interface EnvSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function EnvSection({ title, defaultOpen = false, children }: EnvSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border-b border-border">
      <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 text-left font-medium hover:bg-muted/50 transition-colors">
        {title}
        <ExpandMoreIcon className={cn('size-4 transition-transform', isOpen && 'rotate-180')} />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pb-4 space-y-4">{children}</CollapsibleContent>
    </Collapsible>
  );
}

interface EnvFieldProps {
  label: string;
  envKey: string;
  value: string;
  onChange: (key: string, value: string) => void;
}

function EnvField({ label, envKey, value, onChange }: EnvFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={envKey}>{label}</Label>
      <Input
        id={envKey}
        type="password"
        value={value}
        onChange={(e) => onChange(envKey, e.target.value)}
        placeholder={`请输入${label}`}
      />
    </div>
  );
}

const ConfigureEnvButton = () => {
  const { config, updateConfig } = useStore();
  const { showToast } = useToast();
  const defaultEnv = config.env || {};
  const [dialogOpen, setDialogOpen] = useState(false);
  const [env, setEnv] = useState<Record<string, string>>(defaultEnv as Record<string, string>);

  useEffect(() => {
    setEnv((config.env || {}) as Record<string, string>);
  }, [config.env]);

  const handleOpen = () => {
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
  };

  const handleSave = () => {
    const normalizedEnv = Object.fromEntries(
      Object.entries(env).map(([key, value]) => [key, value.trim()]),
    );

    if (
      normalizedEnv.OPENROUTER_API_KEY &&
      !normalizedEnv.OPENROUTER_API_KEY.startsWith('sk-or-v1-')
    ) {
      showToast('OpenRouter Key 格式不正确：应以 sk-or-v1- 开头。', 'error');
      return;
    }

    updateConfig({ env: normalizedEnv });
    handleClose();
  };

  const handleEnvChange = (key: string, value: string) => {
    setEnv({ ...env, [key]: value });
  };

  return (
    <>
      <Button variant="outline" onClick={handleOpen}>
        <SettingsIcon className="size-4 mr-2" />
        {IS_V1_MINIMAL_MODE ? '配置接口' : '配置接口'}
      </Button>

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{IS_V1_MINIMAL_MODE ? '接口密钥与地址' : '接口配置'}</DialogTitle>
          </DialogHeader>

          <div className="border border-border rounded-lg overflow-hidden">
            {IS_V1_MINIMAL_MODE ? (
              <>
                <EnvSection title="OpenRouter" defaultOpen>
                  <EnvField
                    label={IS_V1_MINIMAL_MODE ? 'OpenRouter 密钥' : 'OpenRouter 密钥'}
                    envKey="OPENROUTER_API_KEY"
                    value={env.OPENROUTER_API_KEY || ''}
                    onChange={handleEnvChange}
                  />
                </EnvSection>

                <EnvSection title="OpenAI-compatible" defaultOpen>
                  <EnvField
                    label={IS_V1_MINIMAL_MODE ? '兼容接口密钥' : '兼容接口密钥'}
                    envKey="OPENAI_COMPAT_API_KEY"
                    value={env.OPENAI_COMPAT_API_KEY || ''}
                    onChange={handleEnvChange}
                  />
                </EnvSection>
              </>
            ) : (
              <>
                <EnvSection title="OpenAI" defaultOpen>
                  <EnvField
                    label="OpenAI API Key"
                    envKey="OPENAI_API_KEY"
                    value={env.OPENAI_API_KEY || ''}
                    onChange={handleEnvChange}
                  />
                  <EnvField
                    label="OpenAI API Host"
                    envKey="OPENAI_API_HOST"
                    value={env.OPENAI_API_HOST || ''}
                    onChange={handleEnvChange}
                  />
                  <EnvField
                    label="OpenAI 组织 ID"
                    envKey="OPENAI_ORGANIZATION"
                    value={env.OPENAI_ORGANIZATION || ''}
                    onChange={handleEnvChange}
                  />
                </EnvSection>

                <EnvSection title="Azure">
                  <EnvField
                    label="Azure API Key"
                    envKey="AZURE_API_KEY"
                    value={env.AZURE_API_KEY || env.AZURE_OPENAI_API_KEY || ''}
                    onChange={handleEnvChange}
                  />
                </EnvSection>

                <EnvSection title="Amazon Bedrock">
                  <EnvField
                    label="Bedrock 区域"
                    envKey="AWS_BEDROCK_REGION"
                    value={env.AWS_BEDROCK_REGION || ''}
                    onChange={handleEnvChange}
                  />
                </EnvSection>

                <EnvSection title="Anthropic">
                  <EnvField
                    label="Anthropic API Key"
                    envKey="ANTHROPIC_API_KEY"
                    value={env.ANTHROPIC_API_KEY || ''}
                    onChange={handleEnvChange}
                  />
                </EnvSection>

                <EnvSection title="Google Vertex AI">
                  <EnvField
                    label="Vertex API Key"
                    envKey="VERTEX_API_KEY"
                    value={env.VERTEX_API_KEY || ''}
                    onChange={handleEnvChange}
                  />
                  <EnvField
                    label="Vertex 项目 ID"
                    envKey="VERTEX_PROJECT_ID"
                    value={env.VERTEX_PROJECT_ID || ''}
                    onChange={handleEnvChange}
                  />
                  <EnvField
                    label="Vertex 区域"
                    envKey="VERTEX_REGION"
                    value={env.VERTEX_REGION || ''}
                    onChange={handleEnvChange}
                  />
                </EnvSection>

                <EnvSection title="Replicate">
                  <EnvField
                    label="Replicate API Key"
                    envKey="REPLICATE_API_KEY"
                    value={env.REPLICATE_API_KEY || ''}
                    onChange={handleEnvChange}
                  />
                </EnvSection>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              {IS_V1_MINIMAL_MODE ? '取消' : '取消'}
            </Button>
            <Button onClick={handleSave}>{IS_V1_MINIMAL_MODE ? '保存' : '保存'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ConfigureEnvButton;
