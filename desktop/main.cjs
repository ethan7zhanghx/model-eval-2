const { app, BrowserWindow, Menu, dialog, shell } = require('electron');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const HOST = process.env.PROMPTFOO_DESKTOP_HOST || '127.0.0.1';
const PORT = Number(process.env.PROMPTFOO_SERVER_PORT || process.env.PORT || 15500);
const APP_URL = `http://${HOST}:${PORT}/setup`;
const HEALTH_URL = `http://${HOST}:${PORT}/health`;
const PROJECT_ROOT = path.join(__dirname, '..');
const SERVER_ENTRY = path.join(__dirname, '..', 'dist', 'src', 'server', 'index.js');
const APP_HTML = path.join(__dirname, '..', 'dist', 'src', 'app', 'index.html');
const SOURCE_SERVER_ENTRY = path.join(__dirname, '..', 'src', 'server', 'index.ts');
const NPM_CMD = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const NODE_CMD = process.env.PROMPTFOO_NODE_BIN || (process.platform === 'win32' ? 'node.exe' : 'node');
const TSX_CMD = path.join(
  PROJECT_ROOT,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'tsx.cmd' : 'tsx',
);

/** @type {import('node:child_process').ChildProcess | null} */
let serverProcess = null;
let ownsServerProcess = false;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requestOk(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      res.resume();
      resolve((res.statusCode || 500) >= 200 && (res.statusCode || 500) < 300);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForServer(url, timeoutMs = 30000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await requestOk(url)) {
      return true;
    }
    await wait(500);
  }
  return false;
}

function runCommand(command, args, label) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: PROJECT_ROOT,
      env: process.env,
      stdio: 'inherit',
    });

    child.on('error', (error) => {
      reject(new Error(`${label} failed to start: ${error.message}`));
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${label} failed with exit code ${code ?? 'unknown'}`));
    });
  });
}

async function ensureAppBuild() {
  if (fs.existsSync(APP_HTML)) {
    return;
  }

  await runCommand(NPM_CMD, ['run', 'build:app'], 'Frontend build');

  if (!fs.existsSync(APP_HTML)) {
    throw new Error('前端构建已执行，但仍未找到 dist/src/app/index.html');
  }
}

function resolveServerCommand() {
  if (fs.existsSync(SERVER_ENTRY)) {
    return {
      command: NODE_CMD,
      args: [SERVER_ENTRY],
      label: 'bundled server',
    };
  }

  if (fs.existsSync(TSX_CMD) && fs.existsSync(SOURCE_SERVER_ENTRY)) {
    return {
      command: TSX_CMD,
      args: [SOURCE_SERVER_ENTRY],
      label: 'source server',
    };
  }

  throw new Error(
    '未找到可启动的本地服务入口。请先执行 “npm install”，必要时再执行 “npm run build”。',
  );
}

async function ensureServer() {
  await ensureAppBuild();

  if (await requestOk(HEALTH_URL)) {
    return;
  }

  const serverCommand = resolveServerCommand();

  serverProcess = spawn(serverCommand.command, serverCommand.args, {
    cwd: PROJECT_ROOT,
    env: {
      ...process.env,
      PORT: String(PORT),
      PROMPTFOO_V1_MINIMAL_MODE: process.env.PROMPTFOO_V1_MINIMAL_MODE || 'true',
      PROMPTFOO_DISABLE_UPDATE: process.env.PROMPTFOO_DISABLE_UPDATE || 'true',
      PROMPTFOO_DISABLE_TELEMETRY: process.env.PROMPTFOO_DISABLE_TELEMETRY || 'true',
    },
    stdio: 'inherit',
  });
  ownsServerProcess = true;

  const isReady = await waitForServer(HEALTH_URL, 45000);
  if (!isReady) {
    throw new Error(
      `桌面端已尝试拉起 ${serverCommand.label}，但本地服务没有在 ${HEALTH_URL} 成功就绪。`,
    );
  }
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1480,
    height: 980,
    minWidth: 1200,
    minHeight: 760,
    autoHideMenuBar: true,
    title: 'ERNIE Eval',
    backgroundColor: '#09090b',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.webContents.on(
    'did-fail-load',
    (_event, errorCode, errorDescription, validatedURL) => {
      dialog.showErrorBox(
        '桌面端页面加载失败',
        `页面地址：${validatedURL}\n错误码：${errorCode}\n错误信息：${errorDescription}`,
      );
    },
  );

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    dialog.showErrorBox(
      '桌面端发生异常退出',
      `渲染进程已退出，原因：${details.reason}${details.exitCode ? `（exit code: ${details.exitCode}）` : ''}`,
    );
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(`http://${HOST}:${PORT}`) || url.startsWith(`https://${HOST}:${PORT}`)) {
      return { action: 'allow' };
    }
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  void mainWindow.loadURL(APP_URL);

  if (process.argv.includes('--devtools')) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

async function main() {
  Menu.setApplicationMenu(null);

  try {
    await ensureServer();
    createWindow();
  } catch (error) {
    dialog.showErrorBox(
      '桌面端启动失败',
      error instanceof Error ? error.message : String(error),
    );
    app.quit();
  }
}

app.whenReady().then(main);

app.on('window-all-closed', () => {
  app.quit();
});

app.on('before-quit', () => {
  if (ownsServerProcess && serverProcess && !serverProcess.killed) {
    serverProcess.kill('SIGTERM');
  }
});
