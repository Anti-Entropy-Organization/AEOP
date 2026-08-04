        __aeTicketPromise.then(function(ticket){
          var img = document.getElementById('ae-preview-img');
          var status = document.getElementById('ae-preview-status');
          status.innerText = "验证通过，正在加载数据…";
          var revealed = false;
          function sizeImage() {
            if (!img.naturalWidth || !img.naturalHeight) return;
            var maxH = window.innerHeight - 288; 
            var frame = img.parentElement;
            var availW = frame.clientWidth - 12; 
            if (availW <= 0) return;
            var ratio = img.naturalWidth / img.naturalHeight;
            var h = Math.min(maxH, availW / ratio);
            var w = h * ratio;
            if (w > availW) { w = availW; h = w / ratio; }
            img.style.width = w + 'px';
            img.style.height = h + 'px';
          }
          function reveal() {
            sizeImage();
            if (revealed) return;
            revealed = true;
            status.style.display = 'none';
            img.style.display = '';
          }
          window.addEventListener('resize', sizeImage);
          img.onerror = function(){
            img.style.display = 'none';
            status.style.display = '';
            status.innerText = "图片加载失败，请刷新页面重试";
          };
          img.onload = reveal; 
          img.src = "/" + window.__AE_CTX.modelId + "/" + window.__AE_CTX.filePath + "?view&ticket=" + encodeURIComponent(ticket);
          (function poll(){
            if (revealed) return;
            if (img.naturalWidth > 0 || img.complete) { reveal(); return; }
            requestAnimationFrame(poll);
          })();
        }).catch(function(e){
          document.getElementById('ae-preview-status').innerText = "人机验证失败，请刷新页面重试";
        });
