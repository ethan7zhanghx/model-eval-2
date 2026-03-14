# ERNIE Eval Studio Demo Runbook

## Demo goal

用一轮可视化数据集评测，向产品、运营、策略同学说明：

- 一份数据集是否真的有区分度
- 不同模型在同一任务上的表现差异
- 结果是否值得继续沉淀成长期评测资产

## Recommended demo path

1. 打开「创建评测」
2. 添加 1~2 个模型来源
   - 推荐优先使用 OpenRouter 免费模型
   - 或接入 OpenAI-compatible 接口
3. 点击加载演示 Prompt
4. 点击加载 SQuAD 演示数据集
5. 运行评测
6. 在结果页展示：
   - 模型输出差异
   - 通过率 / 分数差异
   - 单条样本明细
   - 导出配置与结果

## Recommended demo setup

### Option A: fastest path
- 来源：OpenRouter
- 模型数：2 个
- 数据集：内置 SQuAD demo
- 适合：现场快速演示主流程

### Option B: business comparison
- 来源 1：OpenRouter
- 来源 2：OpenAI-compatible
- 数据集：同一份 SQuAD demo
- 适合：演示“同数据集跨来源对比”

## What to emphasize in the meeting

### 1. 数据集价值
不是只看模型能不能答，而是看这批样本能不能把模型差异拉出来。

### 2. 评测过程可复用
Prompt、样本、模型来源可以重复配置，后续可以持续迭代成团队资产。

### 3. 结果可解释
结果页可以回看每条样本、每个模型输出和最终分数，便于业务同学一起判断数据集质量。

## Current deliverables

- Web UI 可用
- Electron 桌面壳可启动
- OpenRouter / OpenAI-compatible 接入已打通
- SQuAD demo 演示链路可用于展示
- 品牌已切换为 ERNIE Eval

## Current known follow-ups

- 继续把前端剩余可见文案统一成中文
- 继续收敛非当前产品需要的底层残留模块
- 完成独立 GitHub 仓库创建与 push
