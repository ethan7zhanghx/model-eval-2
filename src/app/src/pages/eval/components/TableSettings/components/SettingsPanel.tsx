import React, { useCallback, useState } from 'react';

import { useResultsViewSettingsStore } from '../../store';
import CompactSlider from './CompactSlider';
import CompactToggle from './CompactToggle';

const SectionHeader = ({ children }: { children: React.ReactNode }) => {
  return (
    <span className="block text-[0.6875rem] font-semibold tracking-widest text-muted-foreground/60 mb-2 uppercase">
      {children}
    </span>
  );
};

const SettingsPanel = () => {
  const {
    stickyHeader,
    setStickyHeader,
    showPrompts,
    setShowPrompts,
    showPassFail,
    setShowPassFail,
    showPassReasons,
    setShowPassReasons,
    showInferenceDetails,
    setShowInferenceDetails,
    maxTextLength,
    setMaxTextLength,
    renderMarkdown,
    setRenderMarkdown,
    prettifyJson,
    setPrettifyJson,
    maxImageWidth,
    setMaxImageWidth,
    maxImageHeight,
    setMaxImageHeight,
    wordBreak,
    setWordBreak,
  } = useResultsViewSettingsStore();

  // Local state for text length slider
  const sanitizedMaxTextLength =
    maxTextLength === Number.POSITIVE_INFINITY
      ? Number.POSITIVE_INFINITY
      : Number.isFinite(maxTextLength) && maxTextLength >= 25
        ? maxTextLength
        : 500;
  const [localMaxTextLength, setLocalMaxTextLength] = useState(
    sanitizedMaxTextLength === Number.POSITIVE_INFINITY ? 1001 : sanitizedMaxTextLength,
  );

  const handleTextLengthChange = useCallback((value: number) => {
    setLocalMaxTextLength(value);
  }, []);

  const handleTextLengthCommitted = useCallback(
    (value: number) => {
      const newValue = value === 1001 ? Number.POSITIVE_INFINITY : value;
      setMaxTextLength(newValue);
    },
    [setMaxTextLength],
  );

  const handleWordBreakChange = useCallback(
    (checked: boolean) => {
      setWordBreak(checked ? 'break-all' : 'break-word');
    },
    [setWordBreak],
  );

  return (
    <div className="grid grid-cols-[1fr_1px_1fr] gap-5 p-5 pt-3">
      {/* Left Column - Visibility */}
      <div>
        <SectionHeader>显示</SectionHeader>

        <CompactToggle
          label="固定表头"
          checked={stickyHeader}
          onChange={setStickyHeader}
          tooltipText="滚动时保持表头固定"
        />

        <CompactToggle
          label="通过 / 失败标记"
          checked={showPassFail}
          onChange={setShowPassFail}
          tooltipText="显示每条结果的通过 / 失败状态"
        />

        <CompactToggle
          label="通过原因"
          checked={showPassReasons}
          onChange={setShowPassReasons}
          tooltipText="显示断言通过的原因（例如 llm-rubric 解释）"
          disabled={!showPassFail}
        />

        <CompactToggle
          label="推理详情"
          checked={showInferenceDetails}
          onChange={setShowInferenceDetails}
          tooltipText="显示耗时、token、成本等信息"
        />

        <CompactToggle
          label="完整 Prompt"
          checked={showPrompts}
          onChange={setShowPrompts}
          tooltipText="显示生成当前输出所使用的完整 Prompt"
        />
      </div>

      {/* Subtle Divider */}
      <div className="bg-border/10 my-1" />

      {/* Right Column - Formatting */}
      <div>
        <SectionHeader>格式</SectionHeader>

        <CompactToggle
          label="渲染 Markdown"
          checked={renderMarkdown}
          onChange={setRenderMarkdown}
          tooltipText="按 Markdown 格式渲染输出内容"
        />

        <CompactToggle
          label="美化 JSON"
          checked={prettifyJson}
          onChange={setPrettifyJson}
          tooltipText="以缩进格式展示 JSON"
        />

        <CompactToggle
          label="强制断行"
          checked={wordBreak === 'break-all'}
          onChange={handleWordBreakChange}
          tooltipText="在较窄列中允许按任意字符断行"
        />

        <div className="mt-3">
          <CompactSlider
            label="最大文本长度"
            value={localMaxTextLength}
            onChange={handleTextLengthChange}
            onChangeCommitted={handleTextLengthCommitted}
            min={25}
            max={1001}
            tooltipText="超过该长度后会折叠"
            unlimited
          />

          <CompactSlider
            label="最大图片宽度"
            value={maxImageWidth}
            onChange={setMaxImageWidth}
            min={100}
            max={1000}
            unit="px"
            tooltipText="图片宽度上限（像素）"
          />

          <CompactSlider
            label="最大图片高度"
            value={maxImageHeight}
            onChange={setMaxImageHeight}
            min={100}
            max={1000}
            unit="px"
            tooltipText="图片高度上限（像素）"
          />
        </div>
      </div>
    </div>
  );
};

export default React.memo(SettingsPanel);
