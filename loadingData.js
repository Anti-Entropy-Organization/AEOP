function showFolderLoadingAndJump(path) {
    var fileList = document.querySelector('.file-list');
    fileList.style.height = '140px';
    fileList.style.overflow = 'hidden';
    fileList.querySelectorAll('.file-row').forEach(function(li) {
    li.style.display = 'none';
    });
    var emptyPlaceholder = fileList.querySelector('.empty-placeholder');
    if (emptyPlaceholder) {
    emptyPlaceholder.style.display = 'none';
    }
    var loading = fileList.querySelector('.file-list-loading');
    if (!loading) {
    loading = document.createElement('div');
    loading.className = 'file-list-loading';
    const listWidth = fileList.clientWidth || 650; // fallback
    loading.innerHTML =
        '<div class="loading-inner" style="position:relative;width:100%;height:70px;">' +
        '<canvas id="ae-folder-loading-canvas" width="' + listWidth + '" height="50" style="display:block;margin:auto;background:transparent;"></canvas>' +
        '<div class="loading-text" style="position:absolute;left:0;right:0;top:40px;text-align:center;color:#b3b6c2;font-size:16px;">LOADING...</div>' +
        '</div>';
    fileList.appendChild(loading);

    (function() {
        const CANVAS_WIDTH = listWidth;
        const CANVAS_HEIGHT = 50;
        const DOT_COUNT = 5;
        const DOT_R = 5;
        const total = 1600;
        const syncDelay = 90;
        const frac1 = 0.55;
        const frac2 = 0.45;
        const time1 = total * frac1;
        const time2 = total * frac2;
        const startX = DOT_R;
        const endX = CANVAS_WIDTH - DOT_R;
        const midX = (startX + endX) / 2;
        const initialGap = Math.max((endX - startX) / (DOT_COUNT + 1), 60);

        function easeOut(t, T) {
        let v0 = 2 * (midX - startX) / T;
        let a = -v0 / T;
        return startX + v0 * t + 0.5 * a * t * t;
        }
        function easeIn(t, T) {
        let a = 2 * (endX - midX) / (T * T);
        return midX + 0.5 * a * t * t;
        }

        const canvas = document.getElementById('ae-folder-loading-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let running = true;
        let cycleStart = performance.now();

        function drawDots() {
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        let now = performance.now();
        let tGlobal = now - cycleStart;
        if (tGlobal >= total) {
            cycleStart += total;
            tGlobal = 0;
        }

        if (tGlobal === 0) {
            for (let i = 0; i < DOT_COUNT; i++) {
            let pos = startX + (i + 1) * initialGap;
            pos = Math.min(pos, endX - DOT_R);
            ctx.globalAlpha = 1;
            ctx.beginPath();
            ctx.arc(pos, CANVAS_HEIGHT / 2, DOT_R, 0, Math.PI * 2);
            ctx.fillStyle = "#b3b6c2";
            ctx.fill();
            }
        } else {
            for (let i = 0; i < DOT_COUNT; i++) {
            let t = tGlobal - i * syncDelay;
            if (t < 0) continue;
            if (t > total) continue;
            let pos;
            if (t < time1) {
                pos = easeOut(t, time1);
            } else if (t < time1 + time2) {
                pos = easeIn(t - time1, time2);
            } else {
                continue;
            }
            ctx.globalAlpha = 1;
            ctx.beginPath();
            ctx.arc(pos, CANVAS_HEIGHT / 2, DOT_R, 0, Math.PI * 2);
            ctx.fillStyle = "#b3b6c2";
            ctx.fill();
            }
        }
        if (running) requestAnimationFrame(drawDots);
        }
        drawDots();
    })();
    } else {
    loading.style.display = 'flex';
    }
    window.location.href = '/' + path;
}
function cleanupFileListLoading() {
    try {
    var fileList = document.querySelector('.file-list');
    if (fileList) {
        var loading = fileList.querySelector('.file-list-loading');
        if (loading) loading.remove();
        fileList.querySelectorAll('.file-row').forEach(function(li){
            li.style.display = '';
        });
        fileList.style.height = '';
        fileList.style.overflow = '';
        }
    }catch(e){}
}
document.addEventListener("DOMContentLoaded", cleanupFileListLoading);
window.addEventListener("pageshow", cleanupFileListLoading);