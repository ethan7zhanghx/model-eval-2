import React, { useEffect, useRef, useState } from 'react';

import { Button } from '@app/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@app/components/ui/dialog';
import { ContentCopyIcon, DeleteIcon, EditIcon, UploadIcon } from '@app/components/ui/icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@app/components/ui/tooltip';
import { IS_V1_MINIMAL_MODE } from '@app/constants';
import { cn } from '@app/lib/utils';
import { useStore } from '@app/stores/evalConfig';
import { V1_DEMO_PROMPT } from '../demo/v1Demo';
import PromptDialog from './PromptDialog';

const PromptsSection = () => {
  const [promptDialogOpen, setPromptDialogOpen] = useState(false);
  const [editingPromptIndex, setEditingPromptIndex] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [promptToDelete, setPromptToDelete] = useState<number | null>(null);

  const { config, updateConfig } = useStore();
  const prompts = (config.prompts || []) as string[];
  const setPrompts = (p: string[]) => updateConfig({ prompts: p });
  const newPromptInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingPromptIndex !== null && editingPromptIndex > 0 && newPromptInputRef.current) {
      newPromptInputRef.current.focus();
    }
  }, [editingPromptIndex]);

  const handleEditPrompt = (index: number) => {
    setEditingPromptIndex(index);
    setPromptDialogOpen(true);
  };

  const handleAddPromptFromFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.stopPropagation();
    event.preventDefault();

    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result?.toString();
        if (text) {
          setPrompts([...prompts, text]);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleDuplicatePrompt = (event: React.MouseEvent, index: number) => {
    event.stopPropagation();
    const duplicatedPrompt = prompts[index];
    setPrompts([...prompts, duplicatedPrompt]);
  };

  const handleChangePrompt = (index: number, newPrompt: string) => {
    setPrompts(prompts.map((p, i) => (i === index ? newPrompt : p)));
  };

  const handleRemovePrompt = (event: React.MouseEvent, indexToRemove: number) => {
    event.stopPropagation();
    setPromptToDelete(indexToRemove);
    setDeleteDialogOpen(true);
  };

  const confirmDeletePrompt = () => {
    if (promptToDelete !== null) {
      setPrompts(prompts.filter((_, index) => index !== promptToDelete));
      setPromptToDelete(null);
    }
    setDeleteDialogOpen(false);
  };

  const cancelDeletePrompt = () => {
    setPromptToDelete(null);
    setDeleteDialogOpen(false);
  };

  // Highlight template variables in prompt text
  const highlightVars = (text: string) => {
    const truncated = text.length > 250 ? text.slice(0, 250) + ' ...' : text;
    return truncated.split(/({{\w+}})/g).map((part: string, i: number) =>
      /{{\s*(\w+)\s*}}/g.test(part) ? (
        <span key={i} className="bg-primary/20 text-primary px-1 py-0.5 rounded font-mono text-xs">
          {part}
        </span>
      ) : (
        part
      ),
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{IS_V1_MINIMAL_MODE ? '评测 Prompt' : 'Prompts'}</h2>
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <label className="cursor-pointer" aria-label="从文件导入 Prompt">
                <Button variant="ghost" size="icon" asChild>
                  <span>
                    <UploadIcon className="size-4" />
                  </span>
                </Button>
                <input
                  type="file"
                  accept=".txt,.md"
                  onChange={handleAddPromptFromFile}
                  className="hidden"
                  aria-label="从文件导入 Prompt"
                />
              </label>
            </TooltipTrigger>
            <TooltipContent>
              {IS_V1_MINIMAL_MODE ? '从文件导入 Prompt' : 'Upload prompt from file'}
            </TooltipContent>
          </Tooltip>

          <Button onClick={() => setPromptDialogOpen(true)}>
            {IS_V1_MINIMAL_MODE ? '添加 Prompt' : 'Add Prompt'}
          </Button>

          {IS_V1_MINIMAL_MODE && (
            <Button
              variant="secondary"
              onClick={() => {
                if (prompts.includes(V1_DEMO_PROMPT)) {
                  return;
                }
                setPrompts([...prompts, V1_DEMO_PROMPT]);
              }}
            >
              {IS_V1_MINIMAL_MODE ? '加载演示 Prompt' : '加载演示 Prompt'}
            </Button>
          )}

          {prompts.length === 0 && (
            <Button
              variant="secondary"
              onClick={() => {
                const examplePrompt =
                  'Write a short, fun story about a {{animal}} going on an adventure in {{location}}. Make it entertaining and suitable for children.';
                setPrompts([...prompts, examplePrompt]);
              }}
            >
              添加示例
            </Button>
          )}
        </div>
      </div>

      {/* Prompts List */}
      <div className="rounded-lg border border-border overflow-hidden">
        {prompts.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            {IS_V1_MINIMAL_MODE ? '还没有添加评测 Prompt。' : '还没有添加 Prompt。'}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {prompts.map((prompt, index) => (
              <div
                key={index}
                onClick={() => handleEditPrompt(index)}
                className={cn(
                  'flex items-center justify-between p-4 cursor-pointer',
                  'hover:bg-muted/50 transition-colors',
                )}
              >
                <p className="text-sm flex-1 mr-4">
                  <span className="text-muted-foreground font-medium">Prompt #{index + 1}：</span>
                  {highlightVars(prompt)}
                </p>
                <div className="flex items-center gap-1 shrink-0">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditPrompt(index);
                        }}
                      >
                        <EditIcon className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>编辑</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(event) => handleDuplicatePrompt(event, index)}
                        aria-label={`复制 Prompt ${index + 1}`}
                      >
                        <ContentCopyIcon className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>复制</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(event) => handleRemovePrompt(event, index)}
                        aria-label={`删除 Prompt ${index + 1}`}
                      >
                        <DeleteIcon className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>删除</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Prompt Dialog */}
      <PromptDialog
        open={promptDialogOpen}
        prompt={editingPromptIndex === null ? '' : prompts[editingPromptIndex]}
        index={editingPromptIndex === null ? 0 : editingPromptIndex}
        isEditing={editingPromptIndex !== null}
        onAdd={(newPrompt) => {
          if (editingPromptIndex === null) {
            setPrompts([...prompts, newPrompt]);
          } else {
            handleChangePrompt(editingPromptIndex, newPrompt);
          }
          setEditingPromptIndex(null);
        }}
        onCancel={() => {
          setEditingPromptIndex(null);
          setPromptDialogOpen(false);
        }}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={(open) => !open && cancelDeletePrompt()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除 Prompt</DialogTitle>
            <DialogDescription>确定要删除这个 Prompt 吗？此操作不可撤销。</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={cancelDeletePrompt}>
              取消
            </Button>
            <Button variant="destructive" onClick={confirmDeletePrompt}>
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PromptsSection;
