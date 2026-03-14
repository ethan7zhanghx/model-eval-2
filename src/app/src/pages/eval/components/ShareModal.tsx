import { useEffect, useRef, useState } from 'react';

import { Button } from '@app/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@app/components/ui/dialog';
import { Input } from '@app/components/ui/input';
import { Spinner } from '@app/components/ui/spinner';
import { callApi } from '@app/utils/api';
import { Check, Copy } from 'lucide-react';

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  evalId: string;
  onShare: (id: string) => Promise<string>;
}

const ShareModal = ({ open, onClose, evalId, onShare }: ShareModalProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);
  const [showNeedsSignup, setShowNeedsSignup] = useState(false);
  const [shareUrl, setShareUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [portalUrl, setPortalUrl] = useState<string>('');

  // Reset state when evalId changes to prevent stale data
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional
  useEffect(() => {
    setCopied(false);
    setShowNeedsSignup(false);
    setShareUrl('');
    setError(null);
    setPortalUrl('');
  }, [evalId]);

  useEffect(() => {
    const handleShare = async () => {
      if (!open || !evalId || shareUrl) {
        return;
      }

      try {
        const response = await callApi(`/results/share/check-domain?id=${evalId}`);
        const data = (await response.json()) as {
          domain: string;
          isCloudEnabled: boolean;
          error?: string;
        };

        if (response.ok) {
          const normalizedPortalUrl = data.domain.startsWith('http')
            ? data.domain
            : `https://${data.domain}`;
          setPortalUrl(normalizedPortalUrl);
          const isPublicDomain = data.domain.includes('promptfoo.app');
          if (isPublicDomain && !data.isCloudEnabled) {
            setShowNeedsSignup(true);
            return;
          }

          // If it's not a public domain or we already have a URL, no need to generate
          if (!shareUrl && !error) {
            setIsLoading(true);
            try {
              const url = await onShare(evalId);
              setShareUrl(url);
            } catch (error) {
              console.error('Failed to generate share URL:', error);
              setError('生成分享链接失败');
            } finally {
              setIsLoading(false);
            }
          }
        } else {
          setError(data.error || '检查分享域名失败');
        }
      } catch (error) {
        console.error('Failed to check share domain:', error);
        setError('检查分享域名失败');
      }
    };

    handleShare();
  }, [open, evalId, shareUrl, error, onShare]);

  const handleCopyClick = () => {
    if (inputRef.current) {
      inputRef.current.select();
      document.execCommand('copy');
      setCopied(true);
    }
  };

  const handleClose = () => {
    onClose();
    setCopied(false);
    setShareUrl('');
    setError(null);
    setPortalUrl('');
  };

  const handleConfirm = async () => {
    window.open(portalUrl || window.location.origin, '_blank');
  };

  if (error) {
    return (
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>出错了</DialogTitle>
          </DialogHeader>
          <DialogDescription className="text-destructive">{error}</DialogDescription>
          <DialogFooter>
            <Button onClick={handleClose} variant="outline">
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-[660px]">
        {showNeedsSignup ? (
          <>
            <DialogHeader>
              <DialogTitle>分享评测</DialogTitle>
            </DialogHeader>
            <DialogDescription className="py-4">
              你需要先登录团队分享平台，才能分享这次评测结果。
              <br />
              <br />
              可前往以下地址登录已有账号或完成注册：{' '}
              <a
                href={portalUrl || window.location.origin}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {portalUrl || window.location.origin}
              </a>
            </DialogDescription>
            <DialogFooter>
              <Button onClick={handleClose} variant="outline">
                关闭
              </Button>
              <Button onClick={handleConfirm} disabled={isLoading}>
                前往登录
              </Button>
            </DialogFooter>
          </>
        ) : shareUrl ? (
          <>
            <DialogHeader>
              <DialogTitle>分享链接已生成</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-3">
              <div className="flex items-center gap-2">
                <Input ref={inputRef} value={shareUrl} readOnly className="flex-1" />
                <button
                  type="button"
                  onClick={handleCopyClick}
                  className="p-2 rounded hover:bg-muted transition-colors"
                  aria-label="复制分享链接"
                >
                  {copied ? <Check className="size-5" /> : <Copy className="size-5" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                拥有你所在组织访问权限的用户可通过该链接查看结果。
              </p>
            </div>
            <DialogFooter>
              <Button onClick={handleClose} variant="outline">
                关闭
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>分享评测</DialogTitle>
            </DialogHeader>
            <div className="flex items-center gap-3 py-4">
              <Spinner size="sm" />
              <p className="text-muted-foreground">正在生成分享链接...</p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ShareModal;
