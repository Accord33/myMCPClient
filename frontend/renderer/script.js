document.addEventListener('DOMContentLoaded', function() {
    const chatHistory = document.getElementById('chat-history');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const newSessionButton = document.getElementById('new-session-button');
    const sessionList = document.getElementById('session-list');
    const toolsButton = document.getElementById('tools-button');
    const toolsCount = document.getElementById('tools-count');
    const toolsPopup = document.getElementById('tools-popup');
    const closeToolsPopupButton = document.getElementById('close-tools-popup');
    const toolsList = document.getElementById('tools-list');
    
    let currentSessionId = null; // 初期値はnull
    let sessions = [];
    let toolsInfo = {}; // ツール情報を保存するオブジェクト
    
    // 初期化時にツール情報を取得
    fetchToolsInfo();
    
    // ツールボタンクリック時の処理
    toolsButton.addEventListener('click', () => {
        toolsPopup.classList.toggle('active');
    });
    
    // ポップアップの閉じるボタンクリック時の処理
    closeToolsPopupButton.addEventListener('click', () => {
        toolsPopup.classList.remove('active');
    });
    
    // ポップアップ外クリックで閉じる
    document.addEventListener('click', (event) => {
        if (!toolsPopup.contains(event.target) && event.target !== toolsButton) {
            toolsPopup.classList.remove('active');
        }
    });
    
    // ツール情報を取得する関数
    async function fetchToolsInfo() {
        try {
            const data = await window.electronAPI.apiRequest('GET', '/tools');
            toolsInfo = data.tools || {};
            
            // 有効なツールの数をカウント
            updateToolsCount();
            
            // ツールリストを更新
            updateToolsList();
            
            console.log('ツール情報を取得しました:', toolsInfo);
        } catch (error) {
            console.error('ツール情報取得エラー:', error);
        }
    }
    
    // ツール数を更新する関数
    function updateToolsCount() {
        const activeToolsCount = Object.values(toolsInfo).filter(isActive => isActive).length;
        toolsCount.textContent = activeToolsCount;
    }
    
    // ツールリストを更新する関数
    function updateToolsList() {
        // リストをクリア
        toolsList.innerHTML = '';
        
        // ツールごとに項目を作成
        Object.entries(toolsInfo).forEach(([name, isActive]) => {
            const toolItem = document.createElement('div');
            toolItem.className = 'tool-item';
            
            const toolName = document.createElement('span');
            toolName.className = 'tool-name';
            toolName.textContent = name;
            
            const toggleSwitch = document.createElement('label');
            toggleSwitch.className = 'toggle-switch';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = isActive;
            checkbox.addEventListener('change', () => {
                toggleToolStatus(name, checkbox.checked);
            });
            
            const slider = document.createElement('span');
            slider.className = 'toggle-slider';
            
            toggleSwitch.appendChild(checkbox);
            toggleSwitch.appendChild(slider);
            
            toolItem.appendChild(toolName);
            toolItem.appendChild(toggleSwitch);
            
            toolsList.appendChild(toolItem);
        });
        
        // ツールがない場合のメッセージ
        if (Object.keys(toolsInfo).length === 0) {
            const noTools = document.createElement('div');
            noTools.textContent = '利用可能なツールがありません。';
            toolsList.appendChild(noTools);
        }
    }
    
    // ツールの使用状態を切り替える関数
    async function toggleToolStatus(toolName, useStatus) {
        try {
            const url = `/tools/${toolName}?use=${useStatus}`;
            const response = await window.electronAPI.apiRequest('POST', url);
            
            if (response && response.status === 'success') {
                // 成功したら状態を更新
                toolsInfo[toolName] = useStatus;
                updateToolsCount();
                console.log(`ツール "${toolName}" の状態を ${useStatus} に変更しました。`);
            } else {
                console.error('ツール状態の変更に失敗しました:', response);
                // 失敗したらチェックボックスを元の状態に戻す
                updateToolsList();
            }
        } catch (error) {
            console.error('ツール状態変更エラー:', error);
            // エラー時もチェックボックスを元の状態に戻す
            updateToolsList();
        }
    }
    
    // 自動で新しいセッションを作成しないように初期化時は変更なし
    
    // セッション一覧を取得
    fetchSessionList();
    
    // 「+ 新しいチャット」ボタン押下時はセッションをリセットするだけ
    newSessionButton.addEventListener('click', () => {
        currentSessionId = null;
        chatHistory.innerHTML = '';
        console.log("セッションリセット: 入力があった時に新しい会話が作成されます。");
    });
    
    // メッセージ送信処理
    sendButton.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // ユーザー入力が変更されたときにテキストエリアの高さを自動調整
    userInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight < 200) ? (this.scrollHeight + 'px') : '200px';
    });
    
    // 新しいセッションを作成する関数
    async function createNewSession() {
        try {
            const data = await window.electronAPI.apiRequest('POST', '/create_session');
            currentSessionId = data.session_id;
            
            // チャット履歴をクリア
            chatHistory.innerHTML = '';
            
            // セッション一覧を更新
            fetchSessionList();
            
            console.log(`新しいセッションを作成しました: ${currentSessionId}`);
        } catch (error) {
            console.error('セッション作成エラー:', error);
        }
    }
    
    // セッション一覧を取得する関数
    async function fetchSessionList() {
        try {
            const data = await window.electronAPI.apiRequest('GET', '/sessions');
            
            // セッションリストをクリア
            sessionList.innerHTML = '';
            
            // セッションリストを追加
            if (data && data.sessions && Array.isArray(data.sessions)) {
                sessions = data.sessions;
                
                sessions.forEach(session => {
                    const sessionItem = document.createElement('div');
                    sessionItem.className = 'session-item';
                    sessionItem.textContent = `会話 #${session.id}`;
                    
                    if (session.id === currentSessionId) {
                        sessionItem.classList.add('active');
                    }
                    
                    sessionItem.addEventListener('click', () => {
                        loadSessionHistory(session.id);
                    });
                    
                    sessionList.appendChild(sessionItem);
                });
            } else {
                console.warn('セッションデータが正しい形式ではありません:', data);
            }
        } catch (error) {
            console.error('セッション一覧取得エラー:', error);
        }
    }
    
    // セッション履歴を読み込む関数
    async function loadSessionHistory(sessionId) {
        try {
            // アクティブセッションの更新
            currentSessionId = sessionId;
            
            // セッションリストのアクティブ状態を更新
            const sessionItems = sessionList.querySelectorAll('.session-item');
            sessionItems.forEach(item => {
                if (item.textContent === `会話 #${sessionId}`) {
                    item.classList.add('active');
                } else {
                    item.classList.remove('active');
                }
            });
            
            const data = await window.electronAPI.apiRequest('GET', `/history/${sessionId}`);
            
            // チャット履歴をクリア
            chatHistory.innerHTML = '';
            
            // メッセージを表示
            data.messages.forEach(msg => {
                addMessageToChat(msg.role, msg.content);
            });
            
            // 最新のメッセージまでスクロール
            chatHistory.scrollTop = chatHistory.scrollHeight;
        } catch (error) {
            console.error('履歴読み込みエラー:', error);
        }
    }
    
    // メッセージ送信関数
    async function sendMessage() {
        const message = userInput.value.trim();
        if (!message) return;
        
        // ユーザーメッセージをUIに追加
        addMessageToChat('user', message);
        
        // 入力欄をクリア
        userInput.value = '';
        
        // 入力欄の高さをリセット
        userInput.style.height = 'auto';
        
        // セッションが未作成の場合、ここで新規に作成（ユーザー入力がある場合のみ）
        if (!currentSessionId) {
            try {
                const data = await window.electronAPI.apiRequest('POST', '/create_session');
                currentSessionId = data.session_id;
                // セッション一覧も更新
                fetchSessionList();
                console.log(`新しいセッションを作成しました: ${currentSessionId}`);
            } catch (error) {
                console.error('セッション作成エラー:', error);
                return;
            }
        }
        
        // タイピングインジケーターを表示
        const typingContainer = document.createElement('div');
        typingContainer.className = 'message-container';
        const typingIndicator = document.createElement('div');
        typingIndicator.className = 'typing-indicator message';
        typingIndicator.innerHTML = '<span></span><span></span><span></span>';
        typingContainer.appendChild(typingIndicator);
        chatHistory.appendChild(typingContainer);
        
        // 最新のメッセージまでスクロール
        chatHistory.scrollTop = chatHistory.scrollHeight;
        
        try {
            // AIの応答メッセージ要素を作成
            const aiMessageContainer = document.createElement('div');
            aiMessageContainer.className = 'message-container';
            const aiMessageElem = document.createElement('div');
            aiMessageElem.className = 'message assistant-message';
            aiMessageContainer.appendChild(aiMessageElem);
            
            // ストリーミングレスポンスを取得
            const responseText = await window.electronAPI.streamRequest('/query', {
                query: message,
                session_id: currentSessionId
            });
            
            // タイピングインジケーターを削除
            chatHistory.removeChild(typingContainer);
            
            // SSEレスポンスをパース
            let aiResponse = '';
            const dataRegex = /data: (.*?)(?=\ndata: |$)/gs;
            let match;
            
            while ((match = dataRegex.exec(responseText)) !== null) {
                const chunk = match[1].trim();
                aiResponse += chunk;
                
                // Markdownをパースして表示
                aiMessageElem.innerHTML = marked.parse(aiResponse);
                
                // まだチャット履歴に追加されていなければ追加
                if (!aiMessageContainer.parentNode) {
                    chatHistory.appendChild(aiMessageContainer);
                }
                
                // 最新のメッセージまでスクロール
                chatHistory.scrollTop = chatHistory.scrollHeight;
            }
            
            // パターンに一致しなかった場合（通常の応答）
            if (aiResponse === '') {
                aiResponse = responseText;
                aiMessageElem.innerHTML = marked.parse(aiResponse);
                chatHistory.appendChild(aiMessageContainer);
            }
            
            // 最新のメッセージまでスクロール
            chatHistory.scrollTop = chatHistory.scrollHeight;
            
            // セッションリストを更新（最新のセッションを表示するため）
            fetchSessionList();
        } catch (error) {
            console.error('APIエラー:', error);
            
            // タイピングインジケーターが残っていれば削除
            if (typingContainer.parentNode) {
                chatHistory.removeChild(typingContainer);
            }
            
            // エラーメッセージを表示
            addMessageToChat('assistant', 'エラーが発生しました。もう一度お試しください。');
        }
    }
    
    // チャット履歴にメッセージを追加する関数
    function addMessageToChat(role, content) {
        const messageContainer = document.createElement('div');
        messageContainer.className = 'message-container';
        
        const messageElem = document.createElement('div');
        messageElem.className = `message ${role}-message`;
        
        if (role === 'assistant') {
            // Markdownをパースして表示
            messageElem.innerHTML = marked.parse(content);
        } else {
            // ユーザーメッセージはプレーンテキストで表示
            messageElem.textContent = content;
        }
        
        messageContainer.appendChild(messageElem);
        chatHistory.appendChild(messageContainer);
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }
});
