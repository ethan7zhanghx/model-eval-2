import { useState } from 'react';

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@app/components/ui/navigation-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@app/components/ui/tooltip';
import { IS_RUNNING_LOCALLY, IS_V1_MINIMAL_MODE } from '@app/constants';
import { cn } from '@app/lib/utils';
import { Info, Settings } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import ApiSettingsModal from './ApiSettingsModal';
import DarkMode from './DarkMode';
import InfoModal from './InfoModal';
import Logo from './Logo';

interface NavLinkProps {
  href: string;
  label: string;
}

function NavLink({ href, label }: NavLinkProps) {
  const location = useLocation();

  // Special handling for Model Audit to activate on both /model-audit and /model-audit/:id
  let isActive: boolean;
  if (href === '/model-audit') {
    isActive =
      location.pathname === '/model-audit' ||
      (location.pathname.startsWith('/model-audit/') &&
        !location.pathname.startsWith('/model-audit/setup') &&
        !location.pathname.startsWith('/model-audit/history'));
  } else {
    isActive = location.pathname.startsWith(href);
  }

  return (
    <Link
      to={href}
      className={cn(
        'inline-flex h-8 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        isActive
          ? 'bg-primary/10 text-primary hover:bg-primary/15 focus-visible:bg-primary/15'
          : 'text-foreground hover:bg-accent focus-visible:bg-accent',
      )}
    >
      {label}
    </Link>
  );
}

interface MenuItem {
  href: string;
  label: string;
  description: string;
}

interface NavDropdownProps {
  label: string;
  items: MenuItem[];
  isActiveCheck: (pathname: string) => boolean;
}

function NavDropdown({ label, items, isActiveCheck }: NavDropdownProps) {
  const location = useLocation();
  const isActive = isActiveCheck(location.pathname);

  return (
    <NavigationMenuItem>
      <NavigationMenuTrigger
        className={cn(
          'h-8 bg-transparent px-3 text-sm font-medium',
          'data-[state=open]:bg-accent',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          isActive
            ? 'bg-primary/10 text-primary hover:bg-primary/15 focus-visible:bg-primary/15'
            : 'text-foreground hover:bg-accent focus-visible:bg-accent',
        )}
      >
        {label}
      </NavigationMenuTrigger>
      <NavigationMenuContent>
        <ul className="w-[300px] p-1.5">
          {items.map((item, index) => (
            <li key={item.href}>
              <NavigationMenuLink asChild>
                <Link
                  to={item.href}
                  className={cn(
                    'block select-none rounded-lg px-3 py-2.5 outline-none transition-colors no-underline',
                    'hover:bg-accent hover:no-underline',
                    'focus:bg-accent',
                    index !== items.length - 1 && 'mb-0.5',
                  )}
                >
                  <div className="text-sm font-medium text-foreground">{item.label}</div>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </Link>
              </NavigationMenuLink>
            </li>
          ))}
        </ul>
      </NavigationMenuContent>
    </NavigationMenuItem>
  );
}

const createMenuItems: MenuItem[] = IS_V1_MINIMAL_MODE
  ? [
      {
        href: '/setup',
        label: '新建评测',
        description: '配置模型、Prompt 和数据集评测流程',
      },
    ]
  : [
      {
        href: '/setup',
        label: '评测',
        description: '创建并配置评测任务',
      },
      {
        href: '/redteam/setup',
        label: '红队',
        description: '配置安全测试场景',
      },
      {
        href: '/model-audit/setup',
        label: '模型审计',
        description: '配置并运行模型安全扫描',
      },
    ];

const resultsMenuItems: MenuItem[] = IS_V1_MINIMAL_MODE
  ? [
      {
        href: '/eval',
        label: '最近结果',
        description: '查看最近一次评测结果',
      },
      {
        href: '/evals',
        label: '全部结果',
        description: '查看和管理所有评测记录',
      },
      {
        href: '/media',
        label: '媒体库',
        description: '查看生成的图片、视频和音频',
      },
    ]
  : [
      {
        href: '/eval',
        label: '最近评测',
        description: '查看最近一次评测结果',
      },
      {
        href: '/evals',
        label: '全部评测',
        description: '浏览和管理所有评测记录',
      },
      {
        href: '/reports',
        label: '红队漏洞报告',
        description: '查看红队测试发现的问题',
      },
      {
        href: '/media',
        label: '媒体库',
        description: '浏览生成的图片、视频和音频',
      },
    ];

export default function Navigation({ onToggleDarkMode }: { onToggleDarkMode: () => void }) {
  const [showInfoModal, setShowInfoModal] = useState<boolean>(false);
  const [showApiSettingsModal, setShowApiSettingsModal] = useState<boolean>(false);

  const handleModalToggle = () => setShowInfoModal((prevState) => !prevState);
  const handleApiSettingsModalToggle = () => setShowApiSettingsModal((prevState) => !prevState);

  return (
    <>
      <header className="sticky top-0 z-(--z-appbar) w-full border-b border-border bg-card shadow-sm">
        <div className="flex h-14 items-center justify-between px-4">
          {/* Left section: Logo and Navigation */}
          <div className="flex items-center gap-6">
            <Logo />
            <NavigationMenu>
              <NavigationMenuList className="gap-1">
                <NavDropdown
                  label={IS_V1_MINIMAL_MODE ? '开始' : '新建'}
                  items={createMenuItems}
                  isActiveCheck={(pathname) =>
                    (IS_V1_MINIMAL_MODE
                      ? ['/setup']
                      : ['/setup', '/redteam/setup', '/model-audit/setup']
                    ).some((route) => pathname.startsWith(route))
                  }
                />
                <NavDropdown
                  label={IS_V1_MINIMAL_MODE ? '查看结果' : '查看结果'}
                  items={resultsMenuItems}
                  isActiveCheck={(pathname) =>
                    ['/eval', '/evals', '/reports', '/media'].some((route) =>
                      pathname.startsWith(route),
                    )
                  }
                />
              </NavigationMenuList>
            </NavigationMenu>
            {!IS_V1_MINIMAL_MODE && (
              <nav className="hidden items-center gap-1 md:flex">
                <NavLink href="/prompts" label="Prompts" />
                <NavLink href="/datasets" label="数据集" />
                <NavLink href="/history" label="历史" />
                <NavLink href="/model-audit" label="模型审计" />
              </nav>
            )}
          </div>

          {/* Right section: Actions */}
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={handleModalToggle}
                  className="inline-flex size-9 items-center justify-center rounded-md text-foreground/60 transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <Info className="size-5" />
                  <span className="sr-only">{IS_V1_MINIMAL_MODE ? '说明' : '说明'}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {IS_V1_MINIMAL_MODE ? '说明' : '说明'}
              </TooltipContent>
            </Tooltip>

            {IS_RUNNING_LOCALLY && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={handleApiSettingsModalToggle}
                    className="inline-flex size-9 items-center justify-center rounded-md text-foreground/60 transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <Settings className="size-5" />
                    <span className="sr-only">
                      {IS_V1_MINIMAL_MODE ? '接口与分享设置' : '接口与分享设置'}
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {IS_V1_MINIMAL_MODE ? '接口与分享设置' : '接口与分享设置'}
                </TooltipContent>
              </Tooltip>
            )}

            <DarkMode onToggleDarkMode={onToggleDarkMode} />
          </div>
        </div>
      </header>
      <InfoModal open={showInfoModal} onClose={handleModalToggle} />
      <ApiSettingsModal open={showApiSettingsModal} onClose={handleApiSettingsModalToggle} />
    </>
  );
}
