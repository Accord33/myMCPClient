document.addEventListener('DOMContentLoaded', function () {
    let currentSessionId = null;
    const chatHistory = document.getElementById('chat-history');
    const userInput = document.getElementById('user-input');
    const newSessionButton = document.getElementById('new-session-button');
    const toolsButton = document.getElementById('tools-button');
    const toolsPopup = document.getElementById('tools-popup');
    const closeToolsPopupButton = document.getElementById('close-tools-popup');

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

    // ユーザー入力が変更されたときにテキストエリアの高さを自動調整
    userInput.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight < 200) ? (this.scrollHeight + 'px') : '200px';
    });

    // 「+ 新しいチャット」ボタン押下時はセッションをリセットするだけ
    newSessionButton.addEventListener('click', () => {
        currentSessionId = null;
        chatHistory.innerHTML = '';
        console.log("セッションリセット: 入力があった時に新しい会話が作成されます。");
    });
});