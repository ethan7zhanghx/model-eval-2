# ERNIE Eval Studio

一个面向产品、运营、策略同学的本地数据集评测工具。

## 当前定位

- 本地优先的评测工作台
- 支持数据集样本批量评测
- 支持 OpenRouter 与 OpenAI-compatible 接口
- 支持桌面端壳与 Web UI

## 当前保留内容

这个独立仓库只保留当前交付需要的核心内容：

- 前端 Web UI
- 本地 API / server
- 桌面端 Electron 壳
- 运行脚本与必要配置

已移除大量上游仓库中与当前产品无关的内容，例如：

- 官网站点
- 示例目录
- 大量测试与 Storybook 文件
- 红队 / 模型审计等当前不交付页面
- 各类上游协作与发布配置

## 本地运行

### 1. 启动前端 + 服务

```bash
npm run dev
```

### 2. 仅启动前端

```bash
npm run dev:app
```

### 3. 仅启动服务

```bash
npm run dev:server
```

### 4. 构建

```bash
npm run build
```

### 5. 启动桌面端

```bash
npm run desktop
```

## 关键环境建议

```bash
PROMPTFOO_V1_MINIMAL_MODE=true
PROMPTFOO_DISABLE_UPDATE=true
PROMPTFOO_DISABLE_TELEMETRY=true
```

## 当前主流程

1. 选择模型来源
2. 配置 Prompts
3. 导入或编辑测试样本
4. 运行评测
5. 查看结果、导出配置与结果

## 演示建议

- 优先使用 OpenRouter 免费模型跑通流程
- 使用内置 SQuAD demo 数据集进行展示
- 在结果页对比不同模型的输出差异、通过率与明细结果
