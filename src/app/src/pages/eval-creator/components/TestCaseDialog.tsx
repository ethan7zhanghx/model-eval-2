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
import { Label } from '@app/components/ui/label';
import AssertsForm from './AssertsForm';
import VarsForm from './VarsForm';
import type { Assertion, TestCase } from '@promptfoo/types';

interface TestCaseFormProps {
  open: boolean;
  onAdd: (testCase: TestCase, shouldClose: boolean) => void;
  varsList: string[];
  initialValues?: TestCase;
  onCancel: () => void;
}

const TestCaseForm = ({ open, onAdd, varsList, initialValues, onCancel }: TestCaseFormProps) => {
  const [description, set样本说明] = useState(initialValues?.description || '');
  const [vars, setVars] = useState(initialValues?.vars || {});
  const [asserts, setAsserts] = useState(initialValues?.assert || []);
  const [assertsFormKey, setAssertsFormKey] = useState(0);

  React.useEffect(() => {
    if (initialValues) {
      set样本说明(initialValues.description || '');
      setVars(initialValues.vars || {});
      setAsserts(initialValues.assert || []);
    } else {
      set样本说明('');
      setVars({});
      setAsserts([]);
    }
  }, [initialValues]);

  const handleAdd = (close: boolean) => {
    onAdd(
      {
        description,
        vars,
        assert: asserts,
      },
      close,
    );
    if (close) {
      onCancel();
    }
    set样本说明('');
    setVars({});
    setAsserts([]);
    setAssertsFormKey((prevKey) => prevKey + 1);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialValues ? '编辑测试样本' : '添加测试样本'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <div className="flex items-baseline gap-1.5">
              <Label htmlFor="test-case-description" className="text-lg font-semibold">
                样本说明
              </Label>
              <span className="text-xs text-muted-foreground">（可选）</span>
            </div>
            <Input
              id="test-case-description"
              placeholder="输入这条测试样本的说明"
              value={description}
              onChange={(e) => set样本说明(e.target.value)}
            />
          </div>
          <VarsForm
            onAdd={(vars) => setVars(vars)}
            varsList={varsList}
            initialValues={initialValues?.vars as Record<string, string>}
          />
          <AssertsForm
            key={assertsFormKey}
            onAdd={(asserts) => setAsserts(asserts)}
            initialValues={
              ((initialValues?.assert || []).filter(
                (item) => item.type !== 'assert-set',
              ) as Assertion[]) || []
            }
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onCancel}>
            取消
          </Button>
          {!initialValues && (
            <Button variant="secondary" onClick={() => handleAdd(false)}>
              继续添加
            </Button>
          )}
          <Button onClick={() => handleAdd(true)}>{initialValues ? '保存样本' : '添加样本'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TestCaseForm;
