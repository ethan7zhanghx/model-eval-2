import logo from '@app/assets/ernie-logo.png';
import { Button } from '@app/components/ui/button';
import { Card } from '@app/components/ui/card';
import { IS_V1_MINIMAL_MODE } from '@app/constants';
import { BarChart2, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const EmptyState = () => {
  const navigate = useNavigate();

  return (
    <div className="flex justify-center items-center min-h-[50vh]">
      <Card className="p-8 text-center max-w-[500px] shadow-lg">
        <div className="flex flex-row gap-2 items-center justify-center mb-4">
          <img src={logo} alt="ERNIE logo" style={{ width: 48, height: 48 }} />
          <h2 className="text-xl font-semibold">
            {IS_V1_MINIMAL_MODE ? '欢迎使用本地评测工具' : '欢迎使用本地评测工具'}
          </h2>
        </div>
        <p className="text-muted-foreground mb-6">
          {IS_V1_MINIMAL_MODE
            ? '先创建一个评测任务，开始比较不同模型在同一份数据集上的表现'
            : '先创建一个评测任务，开始比较不同模型在同一份数据集上的表现'}
        </p>
        <div className="flex gap-4 justify-center">
          <Button size="lg" onClick={() => navigate('/setup')}>
            <BarChart2 className="size-5 mr-2" />
            {IS_V1_MINIMAL_MODE ? '创建评测' : '创建评测'}
          </Button>
          {!IS_V1_MINIMAL_MODE && (
            <Button variant="outline" size="lg" onClick={() => navigate('/redteam/setup')}>
              <Shield className="size-5 mr-2" />
              Create Red Team
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-6">
          先创建一轮评测，快速验证样本集对不同模型是否有区分度。
        </p>
      </Card>
    </div>
  );
};

export default EmptyState;
