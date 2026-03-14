import { usePageMeta } from '@app/hooks/usePageMeta';
import EvaluateTestSuiteCreator from './components/EvaluateTestSuiteCreator';

export default function EvalCreatorPage() {
  usePageMeta({ title: '创建评测', description: '配置新的数据集评测任务' });
  return <EvaluateTestSuiteCreator />;
}
