        __aeTicketPromise.then(function(ticket){
          var el = document.getElementById('dplayer');
          var status = document.getElementById('ae-preview-status');
          if (status) status.innerText = "验证通过，正在加载播放器…";
          el.setAttribute('data-video-url', "/" + window.__AE_CTX.modelId + "/" + window.__AE_CTX.filePath + "?view&ticket=" + encodeURIComponent(ticket));
          function loadScript(src) {
            return new Promise(function(resolve, reject){
              var s = document.createElement('script');
              s.src = src; s.onload = resolve; s.onerror = reject;
              document.body.appendChild(s);
            });
          }
          loadScript('https://cdn.jsdelivr.net/npm/dplayer/dist/DPlayer.min.js')
            .then(function(){ return loadScript('https://cdn.jsdelivr.net/gh/Anti-Entropy-Organization/AEOP@main/AEOP_DPlayer.min.js'); })
            .then(function(){
              if (status && status.parentNode) status.parentNode.removeChild(status);
            })
            .catch(function(){ if (status) status.innerText = "视频加载失败，请刷新页面重试"; });
        }).catch(function(e){
          var status = document.getElementById('ae-preview-status');
          if (status) status.innerText = "人机验证失败，请刷新页面重试";
        });
