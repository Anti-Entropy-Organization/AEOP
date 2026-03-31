let uploadQueue = []; let uploadModal = null; let uploadWs = null;
function openUploadModal(files) { if (document.getElementById("ae-upload-modal")) return; uploadModal = document.createElement("div"); uploadModal.id = "ae-upload-modal"; uploadModal.style.cssText = "position:fixed;left:0;top:0;right:0;bottom:0;z-index:99998;background:rgba(0,0,0,0.50);display:flex;align-items:center;justify-content:center;";
    uploadModal.innerHTML =
    '<div style="min-width:420px;max-width:90vw;background:#262626;border-radius:12px;padding:36px 28px;box-shadow:0 8px 50px #0c0d1477;display:flex;flex-direction:column;position:relative;">' + '<div style="font-weight:bold;font-size:1.08rem;margin-bottom:18px;color:#fff;">上传文件</div>' +
    '<div id="ae-upload-queue" style="margin-bottom:10px;">' + '<table style="width:100%;color:#fff;border-collapse:separate;border-spacing:0 5px;margin-top:12px;">' + '<thead>' + '<tr style="font-size:13px;color:#aaa;">' + '<th style="text-align:left;">文件名</th>' + '<th>哈希进度</th>' + '<th>上传进度</th>' + '<th>状态</th>' + '</tr>' + '</thead>' + '<tbody id="ae-upload-queue-list"></tbody>' +
    '</table>' + '</div>' + '<button id="ae-upload-modal-cancel" style="margin-top:35px;padding:8px 20px;font-size:1.05rem;background:#262626;color:#fff;border:1px solid #464040;border-radius:6px;cursor:pointer;align-self:flex-end;">收起</button>' + '</div>';
    document.body.appendChild(uploadModal); uploadQueue = [];
    for (var i = 0; i < files.length; ++i) {
    uploadQueue.push({
        name: files[i].name,
        size: files[i].size,
        status: "waiting",
        hashProgress: 0,
        uploadProgress: 0,
    });
    }
    updateUploadQueueTable();
    document.getElementById("ae-upload-modal-cancel").onclick = function () {
    if (uploadModal) uploadModal.remove();
    uploadModal = null;
    uploadQueue = [];
    };
}

function getStatusLabel(status) {
    if (status === "waiting") return "等待";
    if (status === "hashing") return "计算哈希";
    if (status === "uploading") return "上传中";
    if (status === "success") return '<span style="color:#008900;">完成</span>';
    if (status === "fail") return '<span style="color:#780000;">失败</span>';
    return status;
}

function updateUploadQueueTable() {
    var q = document.getElementById("ae-upload-queue-list");
    if (!q) return; q.innerHTML = "";
    for (var i = 0; i < uploadQueue.length; ++i) { var f = uploadQueue[i]; var rowBg = ""; if (f.status === "success") rowBg = "background:#2a3a2a;";  else if (f.status === "fail") rowBg = "background:#3a2a2a;"; q.innerHTML += '<tr style="' + rowBg + 'transition:background 0.3s;">' + "<td>" + f.name + "</td>" + "<td>" + (typeof f.hashProgress === "number" ? f.hashProgress + "%" : "-") + "</td>" + "<td>" + (typeof f.uploadProgress === "number" ? f.uploadProgress + "%" : "-") + "</td>" + "<td>" + getStatusLabel(f.status) + "</td></tr>";}}

function connectUploadWebSocket(wsUrl) {
    if (uploadWs) {try {uploadWs.close();} catch (e) {}}
    uploadWs = new WebSocket(wsUrl);
    uploadWs.onopen = function () { uploadWs.send(JSON.stringify({ action: "put", country: window.__AE_COUNTRY__ || "北美支部"  }));};
    uploadWs.onmessage = function (e) {
    if (e.data === 'refresh') { window.location.reload(); return;}
    var data = {};
    try {data = JSON.parse(e.data);} catch (err) {return;}
    if (data && data.action === "start_upload" && Array.isArray(data.files)) { openUploadModal(data.files);}
    if (data && data.action === "progress" && typeof data.name === "string") {
        for (var i = 0; i < uploadQueue.length; ++i) {
        if (uploadQueue[i].name === data.name) {
            if (typeof data.hashProgress === "number") uploadQueue[i].hashProgress = data.hashProgress;
            if (typeof data.uploadProgress === "number") uploadQueue[i].uploadProgress = data.uploadProgress;
            if (typeof data.status === "string") uploadQueue[i].status = data.status; break;
        }} updateUploadQueueTable();}};
    uploadWs.onclose = function () { uploadWs = null;};
    uploadWs.onerror = function(){};}