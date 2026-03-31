(function() {
    window.isadmin = false;
    const updateUI = () => {
      const btn = document.getElementById('login-btn');
      if (btn) {
        btn.textContent = window.isadmin ? '逆熵组织' : '匿名访客';
        btn.onclick = window.isadmin ? null : async () => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 100);
          try {const resp = await fetch("http://localhost:42307", { signal: controller.signal });clearTimeout(timeoutId);if (resp.status === 200) {location.reload();return;}} catch (e) {console.log(e); }location.href = 'anti-entropy://';
          location.reload();};}document.querySelectorAll('.delete-link').forEach(el => {el.style.display = window.isadmin ? 'inline-flex' : 'none';});const uploadBtn = document.getElementById('ae-upload-btn');if (uploadBtn) {uploadBtn.style.display = window.isadmin ? 'inline-flex' : 'none';}document.querySelectorAll('.file-row').forEach(i => {i.style.setProperty('grid-template-columns', window.isadmin ? 'minmax(0, 1fr) 110px 85px 130px' : 'minmax(0, 1fr) 110px 55px 130px');});};
    const timeout = 500;
    const controller = new AbortController();
    const timer = setTimeout(() => {controller.abort();window.isadmin = false;updateUI();}, timeout);
    fetch("http://localhost:42307", { signal: controller.signal }).then(r => {clearTimeout(timer);window.isadmin = (r.status === 200); updateUI();}).catch(() => {clearTimeout(timer);window.isadmin = false;updateUI();});
    updateUI();
  })();

  function deleteFile(path) {
    const fileName = path.split('/').pop();
    const modal = document.createElement('div');
    modal.style.cssText = `position: fixed;top: 0;left: 0;width: 100%;height: 100%;background: rgba(0,0,0,0.7);display: flex;align-items: center;justify-content: center;z-index: 9999;`;
    
    modal.innerHTML = `
      <div style="background:#262626; padding:24px; border-radius:8px; width:90%; max-width:500px; color:#fff; font-family: sans-serif;">
        <p style="line-height:1.6;"><strong>风险描述：</strong><br>1. 该删除操作不可撤销<br>2. 文件将被永久删除，请谨慎操作</p>
        <p>请在下方输入文件名称：<strong>${fileName}</strong></p>
        <input type="text" id="delete-confirm-input" style="width:100%; padding:8px; margin:8px 0; border:1px solid #545455; border-radius:4px; background:#262626; color:#fff;">
        <div style="display:flex; gap:10px; margin-top:16px;">
          <button id="confirm-btn" style="flex:1; padding:8px; border:1px solid #ff4d4f; color:#ff4d4f; background:transparent; border-radius:4px; cursor:pointer;">
            删除
          </button>
          <button id="cancel-btn" style="flex:1; padding:8px; border:1px solid #787a7d; color:#fff; background:transparent; border-radius:4px; cursor:pointer;">
            取消
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    const input = modal.querySelector('#delete-confirm-input');
    const confirmBtn = modal.querySelector('#confirm-btn');
    const cancelBtn = modal.querySelector('#cancel-btn');
    const handleConfirm = () => {
    if (input.value !== fileName) {
      alert('文件名输入错误，请重试。');
      return;
    }
    document.body.removeChild(modal);
    const ws = new WebSocket('ws://localhost:47422' + path);
    ws.onopen = () => {
      ws.send(JSON.stringify({ action: 'delete' }));
    };
    ws.onmessage = (e) => {
      if (e.data === 'deleted') {
        alert('文件 ' + fileName + ' 已删除');
        window.location.reload();
      } else if (e.data === 'delete_failed') {
        alert('删除失败');
      }
    };ws.onerror = () => {alert('删除请求失败');};};
  confirmBtn.onclick = handleConfirm;
  cancelBtn.onclick = () => document.body.removeChild(modal);
  input.addEventListener('keyup', (e) => {if (e.key === 'Enter') handleConfirm();});
  input.focus();
}