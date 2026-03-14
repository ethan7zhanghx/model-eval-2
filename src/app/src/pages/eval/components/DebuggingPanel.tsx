import { Alert, AlertContent, AlertDescription } from '@app/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { ErrorBoundary } from 'react-error-boundary';
import TraceView, { type Trace } from '../../../components/traces/TraceView';

interface DebuggingPanelProps {
  evaluationId?: string;
  testCaseId?: string;
  testIndex?: number;
  promptIndex?: number;
  traces?: Trace[];
}

export function DebuggingPanel({
  evaluationId,
  testCaseId,
  testIndex,
  promptIndex,
  traces = [],
}: DebuggingPanelProps) {
  return (
    <div>
      {evaluationId && (
        <div className="mb-4">
          <h4 className="mb-2 font-medium" aria-label="Trace Timeline">
            Trace 时间线
          </h4>
          <ErrorBoundary
            fallback={
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertContent>
                  <AlertDescription>加载 Trace 失败</AlertDescription>
                </AlertContent>
              </Alert>
            }
          >
            <TraceView
              evaluationId={evaluationId}
              testCaseId={testCaseId}
              testIndex={testIndex}
              promptIndex={promptIndex}
              traces={traces}
            />
          </ErrorBoundary>
        </div>
      )}
    </div>
  );
}
