        (function(){
          const clientId = window.__AE_CTX.clientId;
          const msgEl = document.getElementById('pdf-gate-msg');
          const viewEl = document.getElementById('adobe-dc-view');
          function showError(text){ if (msgEl) msgEl.innerText = text; }
          if (!clientId) {
            showError("未配置 Adobe PDF Embed API 的 Client ID，无法预览");
            return;
          }
          window.__aeGetTicket(window.__AE_CTX.modelId, window.__AE_CTX.filePath).then(function(ticket){
            const pdfUrl = window.location.origin + window.__AE_CTX.viewUrlBase + "&ticket=" + encodeURIComponent(ticket);
            function initAdobeViewer(){
              try {
                if (viewEl) viewEl.classList.add('ae-pdf-fullscreen');
                if (msgEl) msgEl.style.display = 'none';
                var footerEl = document.querySelector('.site-footer');
                if (footerEl) footerEl.style.display = 'none';
                const adobeDCView = new AdobeDC.View({ clientId: clientId, divId: "adobe-dc-view" });
                adobeDCView.previewFile({
                  content: { location: { url: pdfUrl } },
                  metaData: { fileName: window.__AE_CTX.pdfFileName }
                }, {
                  embedMode: "FULL_WINDOW",
                  showDownloadPDF: false,
                  showPrintPDF: true,
                  showAnnotationTools: false,
                  enableFormFilling: false
                });
              } catch (e) {
                if (viewEl) viewEl.classList.remove('ae-pdf-fullscreen');
                if (msgEl) msgEl.style.display = '';
                var footerElOnError = document.querySelector('.site-footer');
                if (footerElOnError) footerElOnError.style.display = '';
                showError("Adobe 预览器初始化失败");
              }
            }
            if (window.AdobeDC) {
              initAdobeViewer();
            } else {
              document.addEventListener("adobe_dc_view_sdk.ready", initAdobeViewer);
            }
          }).catch(function(e){
            showError("人机验证失败，请刷新页面重试");
          });
        })();
