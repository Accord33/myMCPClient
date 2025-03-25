const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fetch = require('electron-fetch').default;
const fs = require('fs');

// バックエンドサーバーのプロセス参照
let backendProcess = null;
// バックエンドのURL
const BACKEND_URL = 'http://localhost:8000';
// APIサーバーが起動するまでの待機時間（ミリ秒）
const SERVER_STARTUP_WAIT = 3000;

// メインウィンドウの参照を保持（GC対策）
let mainWindow = null;

// 実行可能ファイルのパスを取得（開発/本番環境で異なる）
function getAppPath() {
  const isPackaged = app.isPackaged;
  let basePath;

  if (isPackaged) {
    // 本番環境: リソースパスを使用
    basePath = path.join(process.resourcesPath);
  } else {
    // 開発環境: 現在のディレクトリ
    basePath = path.join(__dirname, '..');
  }

  return basePath;
}

// バックエンドサーバーの起動
function startBackendServer() {
  return new Promise((resolve, reject) => {
    // アプリのパスを取得
    const appPath = getAppPath();
    
    // バックエンドのパス
    const backendPath = path.join(appPath, 'backend/main.py');
    
    console.log(`バックエンドサーバーを起動: ${backendPath}`);
    
    // 実行コマンドを環境に応じて変更
    let command = app.isPackaged ? 'python3' : 'uv';
    let args = app.isPackaged 
      ? [backendPath, 'api'] 
      : ['run', 'python', backendPath, 'api'];
    
    // バックエンドプロセスを起動
    backendProcess = spawn(command, args, {
      stdio: 'pipe'
    });
    
    // 標準出力のログ
    backendProcess.stdout.on('data', (data) => {
      console.log(`バックエンド出力: ${data}`);
    });
    
    // エラー出力のログ
    backendProcess.stderr.on('data', (data) => {
      console.error(`バックエンドエラー: ${data}`);
    });
    
    // プロセス終了時の処理
    backendProcess.on('close', (code) => {
      console.log(`バックエンドプロセスが終了しました (コード: ${code})`);
      backendProcess = null;
    });
    
    // サーバー起動待機
    setTimeout(() => {
      // ヘルスチェックを実行
      fetch(`${BACKEND_URL}/health`)
        .then(response => {
          if (response.ok) {
            console.log('バックエンドサーバーが起動しました');
            resolve();
          } else {
            reject(new Error('バックエンドサーバーのヘルスチェックに失敗しました'));
          }
        })
        .catch(error => {
          console.error('バックエンドサーバー接続エラー:', error);
          reject(error);
        });
    }, SERVER_STARTUP_WAIT);
  });
}

// メインウィンドウの作成
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    title: 'AI チャットアシスタント',
    icon: path.join(__dirname, 'assets/icon.png')
  });

  // レンダラープロセスのHTMLを読み込む
  mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));
  
  // 開発ツールを開く（開発時のみ）
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
  
  // ウィンドウが閉じられたときの処理
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// アプリケーションの初期化処理
app.whenReady().then(async () => {
  try {
    // .envファイルの存在確認と必要な設定
    const appPath = getAppPath();
    const envPath = path.join(appPath, '.env');
    
    // 本番環境でAPIキーが設定されていない場合の処理
    if (app.isPackaged && !process.env.ANTHROPIC_API_KEY) {
      if (!fs.existsSync(envPath)) {
        // アクセストークン入力ダイアログを表示
        const { response } = await dialog.showMessageBox({
          type: 'question',
          buttons: ['OK'],
          title: 'APIキーの設定',
          message: 'Anthropic APIキーが必要です',
          detail: 'アプリを使用するにはAnthropicのAPIキーが必要です。\n.envファイルを作成して設定してください。'
        });
        
        app.quit();
        return;
      }
    }
    
    // バックエンドサーバーの起動
    await startBackendServer();
    // メインウィンドウの作成
    createWindow();
  } catch (error) {
    console.error('アプリケーション初期化エラー:', error);
    dialog.showErrorBox(
      'バックエンド接続エラー',
      'バックエンドサーバーの起動に失敗しました。アプリケーションを終了します。'
    );
    app.quit();
  }
  
  app.on('activate', () => {
    // macOSでドックアイコンクリック時にウィンドウがなければ作成
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// ウィンドウが全て閉じられたときの処理
app.on('window-all-closed', () => {
  // macOS以外ではアプリを終了
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// アプリケーション終了時のクリーンアップ
app.on('will-quit', () => {
  // バックエンドプロセスの終了
  if (backendProcess) {
    console.log('バックエンドプロセスを終了します');
    backendProcess.kill();
    backendProcess = null;
  }
});

// IPC通信の処理（レンダラープロセスからのリクエスト）
ipcMain.handle('api-request', async (event, { method, endpoint, body }) => {
  try {
    const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${BACKEND_URL}${endpoint}`, options);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API リクエストエラー:', error);
    throw error;
  }
});

// ストリーミングリクエスト用のハンドラ
ipcMain.handle('stream-request', async (event, { endpoint, body }) => {
  try {
    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });
    
    // レスポンスをテキストとして取得して返す（バイナリではなく）
    const text = await response.text();
    return text;
  } catch (error) {
    console.error('ストリーミングリクエストエラー:', error);
    throw error;
  }
});
