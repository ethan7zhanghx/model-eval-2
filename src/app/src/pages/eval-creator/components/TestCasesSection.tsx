import React from 'react';

import { Button } from '@app/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@app/components/ui/dialog';
import {
  AlertTriangleIcon,
  ContentCopyIcon,
  DeleteIcon,
  EditIcon,
  UploadIcon,
} from '@app/components/ui/icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@app/components/ui/tooltip';
import { IS_V1_MINIMAL_MODE } from '@app/constants';
import { useToast } from '@app/hooks/useToast';
import { cn } from '@app/lib/utils';
import { useStore } from '@app/stores/evalConfig';
import { testCaseFromCsvRow } from '@promptfoo/csv';
import { V1_DEMO_DATASET_SOURCE, V1_DEMO_TEST_CASES } from '../demo/v1Demo';
import TestCaseDialog from './TestCaseDialog';
import type { CsvRow, TestCase } from '@promptfoo/types';

interface TestCasesSectionProps {
  varsList: string[];
}

// Validation function for TestCase structure
function isValidTestCase(obj: unknown): obj is TestCase {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const testCase = obj as Record<string, unknown>;

  // Check required structure - vars should be an object if present
  if (testCase.vars && typeof testCase.vars !== 'object') {
    return false;
  }

  // Check assert array if present
  if (testCase.assert && !Array.isArray(testCase.assert)) {
    return false;
  }

  // Check options if present
  if (testCase.options && typeof testCase.options !== 'object') {
    return false;
  }

  return true;
}

const TestCasesSection = ({ varsList }: TestCasesSectionProps) => {
  const { config, updateConfig } = useStore();
  const testCases = (config.tests || []) as TestCase[];
  const setTestCases = (cases: TestCase[]) => updateConfig({ tests: cases });
  const [editingTestCaseIndex, setEditingTestCaseIndex] = React.useState<number | null>(null);
  const [testCaseDialogOpen, setTestCaseDialogOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [testCaseToDelete, setTestCaseToDelete] = React.useState<number | null>(null);
  const { showToast } = useToast();

  const handleAddTestCase = (testCase: TestCase, shouldClose: boolean) => {
    if (editingTestCaseIndex === null) {
      setTestCases([...testCases, testCase]);
    } else {
      const updatedTestCases = testCases.map((tc, index) =>
        index === editingTestCaseIndex ? testCase : tc,
      );
      setTestCases(updatedTestCases);
      setEditingTestCaseIndex(null);
    }

    if (shouldClose) {
      setTestCaseDialogOpen(false);
    }
  };

  const handleAddTestCaseFromFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.stopPropagation();
    event.preventDefault();

    const file = event.target.files?.[0];
    if (file) {
      const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
      if (file.size > MAX_FILE_SIZE) {
        showToast('文件超过 50MB，请换一个更小的文件。', 'error');
        event.target.value = ''; // Reset file input
        return;
      }

      const fileName = file.name.toLowerCase();
      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target?.result?.toString();
        if (!text || text.trim() === '') {
          showToast('文件内容为空，请重新选择。', 'error');
          event.target.value = ''; // Reset file input
          return;
        }

        try {
          let newTestCases: TestCase[] = [];

          if (fileName.endsWith('.csv')) {
            // Handle CSV files
            const { parse: parseCsv } = await import('csv-parse/browser/esm/sync');
            const rows: CsvRow[] = parseCsv(text, { columns: true });
            newTestCases = rows.map((row) => testCaseFromCsvRow(row) as TestCase);
          } else if (fileName.endsWith('.yaml') || fileName.endsWith('.yml')) {
            // Handle YAML files
            const yaml = await import('js-yaml');
            const parsedYaml = yaml.load(text);

            if (Array.isArray(parsedYaml)) {
              // Validate array of test cases
              const validTestCases = parsedYaml.filter(isValidTestCase);
              if (validTestCases.length === 0) {
                throw new Error('YAML 中没有找到有效样本，请检查测试样本结构是否正确。');
              }
              if (validTestCases.length < parsedYaml.length) {
                showToast(
                  `警告：已跳过 ${parsedYaml.length - validTestCases.length} 条无效样本。`,
                  'warning',
                );
              }
              newTestCases = validTestCases;
            } else if (parsedYaml && isValidTestCase(parsedYaml)) {
              // Single test case
              newTestCases = [parsedYaml];
            } else {
              throw new Error('YAML 格式无效，应为测试样本数组，或单个合法的测试样本对象。');
            }
          } else {
            showToast(
              '暂不支持该文件类型，请上传 CSV（.csv）或 YAML（.yaml / .yml）文件。',
              'error',
            );
            event.target.value = ''; // Reset file input
            return;
          }

          if (newTestCases.length === 0) {
            showToast('文件中没有找到任何测试样本。', 'warning');
            event.target.value = ''; // Reset file input
            return;
          }

          // Add description only for YAML files if missing
          if (fileName.endsWith('.yaml') || fileName.endsWith('.yml')) {
            newTestCases = newTestCases.map((tc, idx) => ({
              ...tc,
              description: tc.description || `样本 #${testCases.length + idx + 1}`,
            }));
          }

          setTestCases([...testCases, ...newTestCases]);
          showToast(`成功导入 ${newTestCases.length} 条测试样本`, 'success');
        } catch (error) {
          console.error('Error parsing file:', error);
          const errorMessage = error instanceof Error ? error.message : '未知错误';

          if (fileName.endsWith('.csv')) {
            showToast('CSV 解析失败，请确认文件格式正确且包含表头。', 'error');
          } else if (fileName.endsWith('.yaml') || fileName.endsWith('.yml')) {
            showToast(
              errorMessage.includes('YAML') || errorMessage.includes('样本')
                ? errorMessage
                : 'YAML 解析失败，请确认语法正确。',
              'error',
            );
          }
        }

        // Reset file input
        event.target.value = '';
      };
      reader.readAsText(file);
    }
  };

  const handleRemoveTestCase = (event: React.MouseEvent, index: number) => {
    event.stopPropagation();
    setTestCaseToDelete(index);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteTestCase = () => {
    if (testCaseToDelete !== null) {
      setTestCases(testCases.filter((_, i) => i !== testCaseToDelete));
      setTestCaseToDelete(null);
    }
    setDeleteDialogOpen(false);
  };

  const cancelDeleteTestCase = () => {
    setTestCaseToDelete(null);
    setDeleteDialogOpen(false);
  };

  const handleDuplicateTestCase = (event: React.MouseEvent, index: number) => {
    event.stopPropagation();
    const duplicatedTestCase = JSON.parse(JSON.stringify(testCases[index]));
    setTestCases([...testCases, duplicatedTestCase]);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          {IS_V1_MINIMAL_MODE ? '数据集样本' : 'Test Cases'}
        </h2>
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <label className="cursor-pointer" aria-label="从 CSV 或 YAML 导入测试样本">
                <Button variant="ghost" size="icon" asChild>
                  <span>
                    <UploadIcon className="size-4" />
                  </span>
                </Button>
                <input
                  type="file"
                  accept=".csv,.yaml,.yml"
                  onChange={handleAddTestCaseFromFile}
                  className="hidden"
                />
              </label>
            </TooltipTrigger>
            <TooltipContent>
              {IS_V1_MINIMAL_MODE
                ? '从 CSV 或 YAML 导入数据集样本'
                : 'Upload test cases from CSV or YAML'}
            </TooltipContent>
          </Tooltip>

          <Button onClick={() => setTestCaseDialogOpen(true)}>
            {IS_V1_MINIMAL_MODE ? '添加样本' : 'Add Test Case'}
          </Button>

          {IS_V1_MINIMAL_MODE && (
            <Button
              variant="secondary"
              onClick={() => {
                setTestCases(V1_DEMO_TEST_CASES);
                showToast(
                  `已从 ${V1_DEMO_DATASET_SOURCE.name} 加载 ${V1_DEMO_TEST_CASES.length} 条演示样本`,
                  'success',
                );
              }}
            >
              {IS_V1_MINIMAL_MODE ? '加载 SQuAD 演示集' : '加载 SQuAD 演示集'}
            </Button>
          )}

          {testCases.length === 0 && (
            <Button
              variant="secondary"
              onClick={() => {
                const exampleTestCase: TestCase = {
                  description: 'Fun animal adventure story',
                  vars: {
                    animal: 'penguin',
                    location: 'tropical island',
                  },
                  assert: [
                    {
                      type: 'contains-any',
                      value: ['penguin', 'adventure', 'tropical', 'island'],
                    },
                    {
                      type: 'llm-rubric',
                      value:
                        'Is this a fun, child-friendly story featuring a penguin on a tropical island adventure?\n\nCriteria:\n1. Does it mention a penguin as the main character?\n2. Does the story take place on a tropical island?\n3. Is it entertaining and appropriate for children?\n4. Does it have a sense of adventure?',
                    },
                  ],
                };
                setTestCases([...testCases, exampleTestCase]);
              }}
            >
              添加示例
            </Button>
          )}
        </div>
      </div>

      {/* Test Cases Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr className="border-b border-border">
              <th className="px-4 py-3 text-left text-sm font-semibold">
                {IS_V1_MINIMAL_MODE ? '样本说明' : '样本说明'}
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold">
                {IS_V1_MINIMAL_MODE ? '校验规则' : '断言'}
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold">
                {IS_V1_MINIMAL_MODE ? '变量' : '变量'}
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold w-[120px]"></th>
            </tr>
          </thead>
          <tbody>
            {testCases.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-muted-foreground">
                  {IS_V1_MINIMAL_MODE ? '还没有加载任何数据集样本。' : 'No test cases added yet.'}
                </td>
              </tr>
            ) : (
              testCases.map((testCase, index) => {
                const testCaseVars = Object.keys(testCase.vars || {});
                const missingVars = varsList.filter((v) => !testCaseVars.includes(v));
                const hasMissingVars = varsList.length > 0 && missingVars.length > 0;

                return (
                  <tr
                    key={index}
                    onClick={() => {
                      setEditingTestCaseIndex(index);
                      setTestCaseDialogOpen(true);
                    }}
                    className={cn(
                      'border-b border-border cursor-pointer',
                      'hover:bg-muted/50 transition-colors',
                      hasMissingVars && 'bg-amber-50/50 dark:bg-amber-950/20',
                    )}
                  >
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        {hasMissingVars && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <AlertTriangleIcon className="size-4 text-amber-500 shrink-0" />
                            </TooltipTrigger>
                            <TooltipContent>缺少变量：{missingVars.join(', ')}</TooltipContent>
                          </Tooltip>
                        )}
                        {testCase.description || (
                          <span className="text-muted-foreground italic">样本 #{index + 1}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {testCase.assert?.length ? (
                        `${testCase.assert.length} 条断言`
                      ) : (
                        <span className="text-muted-foreground/60">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                      {Object.keys(testCase.vars || {}).length > 0 ? (
                        Object.entries(testCase.vars || {})
                          .map(([k, v]) => `${k}=${v}`)
                          .join(', ')
                      ) : (
                        <span className="font-sans text-muted-foreground/60">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingTestCaseIndex(index);
                                setTestCaseDialogOpen(true);
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
                              onClick={(event) => handleDuplicateTestCase(event, index)}
                              aria-label="复制测试样本"
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
                              onClick={(event) => handleRemoveTestCase(event, index)}
                              aria-label="删除测试样本"
                            >
                              <DeleteIcon className="size-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>删除</TooltipContent>
                        </Tooltip>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Test Case Dialog */}
      <TestCaseDialog
        open={testCaseDialogOpen}
        onAdd={handleAddTestCase}
        varsList={varsList}
        initialValues={editingTestCaseIndex === null ? undefined : testCases[editingTestCaseIndex]}
        onCancel={() => {
          setEditingTestCaseIndex(null);
          setTestCaseDialogOpen(false);
        }}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={(open) => !open && cancelDeleteTestCase()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除测试样本</DialogTitle>
            <DialogDescription>确定要删除这条测试样本吗？此操作不可撤销。</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={cancelDeleteTestCase}>
              取消
            </Button>
            <Button variant="destructive" onClick={confirmDeleteTestCase}>
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TestCasesSection;
