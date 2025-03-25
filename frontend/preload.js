const { contextBridge, ipcRenderer } = require('electron');

// レンダラープロセスに公開するAPI
contextBridge.exposeInMainWorld('electronAPI', {
  // 通常のAPIリクエスト
  apiRequest: async (method, endpoint, body) => {
    return await ipcRenderer.invoke('api-request', { method, endpoint, body });
  },
  
  // ストリーミングリクエスト
  streamRequest: async (endpoint, body) => {
    return await ipcRenderer.invoke('stream-request', { endpoint, body });
  }
});
