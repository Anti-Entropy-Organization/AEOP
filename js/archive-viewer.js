        (function(){

        function aeArchiveFmtSize(n) {
          if (!n && n !== 0) return "";
          var units = ["B","KB","MB","GB"];
          var i = 0;
          while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
          return (i === 0 ? n : n.toFixed(2)) + " " + units[i];
        }

        function aeArchiveOpenReader() {
          return window.__aeGetTicket(window.__AE_CTX.modelId, window.__AE_CTX.filePath).then(function(ticket){
            var url = "/" + window.__AE_CTX.modelId + "/" + window.__AE_CTX.filePath + "?view&ticket=" + encodeURIComponent(ticket);
            var reader = new zip.ZipReader(new zip.HttpReader(url, { useRangeHeader: true, preventHeadRequest: true }));
            return reader;
          });
        }

        function aeArchiveBuildTree(entries) {
          var root = { name: "", dir: true, children: {}, path: "" };
          entries.forEach(function(e){
            if (e.directory) return;
            var parts = e.filename.split("/").filter(Boolean);
            var node = root;
            var acc = "";
            for (var i = 0; i < parts.length; i++) {
              acc = acc ? (acc + "/" + parts[i]) : parts[i];
              var isLeaf = (i === parts.length - 1);
              if (isLeaf) {
                node.children[parts[i]] = { name: parts[i], dir: false, path: acc, entry: e };
              } else {
                if (!node.children[parts[i]]) {
                  node.children[parts[i]] = { name: parts[i], dir: true, children: {}, path: acc };
                }
                node = node.children[parts[i]];
              }
            }
          });
          return root;
        }

        function aeArchiveSortedChildren(node) {
          var vals = Object.keys(node.children).map(function(k){ return node.children[k]; });
          vals.sort(function(a,b){
            if (a.dir !== b.dir) return a.dir ? -1 : 1;
            return a.name.localeCompare(b.name);
          });
          return vals;
        }

        function aeArchivePreviewExt(name) {
          var m = /\\.([a-z0-9]+)$/i.exec(name);
          return m ? m[1].toLowerCase() : "";
        }
        var AE_ARCHIVE_IMG_EXT = ["jpg","jpeg","png","gif","bmp","webp","svg"];
        var AE_ARCHIVE_TEXT_EXT = ["txt","md","json","xml","yml","yaml","ini","cfg","conf","log",
          "js","ts","jsx","tsx","py","java","c","cc","cpp","h","hpp","cs","go","rs","rb","php",
          "html","htm","css","scss","less","sh","bat","ps1","sql","toml","gradle","properties"];

        function aeArchiveOpenModal(title) {
          var modal = document.getElementById('ae-archive-preview-modal');
          document.getElementById('ae-archive-modal-title').textContent = title;
          modal.style.display = 'flex';
        }
        document.getElementById('ae-archive-modal-close').onclick = function(){
          document.getElementById('ae-archive-preview-modal').style.display = 'none';
          document.getElementById('ae-archive-modal-body').innerHTML = '';
        };
        document.getElementById('ae-archive-preview-modal').addEventListener('click', function(ev){
          if (ev.target === this) { this.style.display = 'none'; document.getElementById('ae-archive-modal-body').innerHTML = ''; }
        });

        function aeArchiveHandleEntry(node, action) {
          var body = document.getElementById('ae-archive-modal-body');
          aeArchiveOpenModal(node.path);
          body.innerHTML = '<div style="color:var(--ink-dim);padding:20px;text-align:center;">正在读取…</div>';
          aeArchiveOpenReader().then(function(reader){
            return reader.getEntries().then(function(freshEntries){
              var idx = node.entry.__aeIndex;
              var target = freshEntries[idx];
              if (!target) throw new Error("entry not found");
              if (action === "download") {
                return target.getData(new zip.BlobWriter()).then(function(blob){
                  var a = document.createElement('a');
                  var objUrl = URL.createObjectURL(blob);
                  a.href = objUrl; a.download = node.name;
                  document.body.appendChild(a); a.click(); document.body.removeChild(a);
                  setTimeout(function(){ URL.revokeObjectURL(objUrl); }, 30000);
                  reader.close();
                  document.getElementById('ae-archive-preview-modal').style.display = 'none';
                });
              }
              var ext = aeArchivePreviewExt(node.name);
              if (AE_ARCHIVE_IMG_EXT.indexOf(ext) !== -1) {
                return target.getData(new zip.BlobWriter()).then(function(blob){
                  var objUrl = URL.createObjectURL(blob);
                  body.innerHTML = '';
                  var img = document.createElement('img');
                  img.src = objUrl;
                  body.appendChild(img);
                  reader.close();
                });
              }
              if (AE_ARCHIVE_TEXT_EXT.indexOf(ext) !== -1) {
                return target.getData(new zip.TextWriter()).then(function(text){
                  var pre = document.createElement('pre');
                  pre.textContent = text.length > 200000 ? (text.slice(0, 200000) + "\\n\\n…（内容过长，已截断）") : text;
                  body.innerHTML = '';
                  body.appendChild(pre);
                  reader.close();
                });
              }
              return target.getData(new zip.BlobWriter()).then(function(blob){
                var a = document.createElement('a');
                var objUrl = URL.createObjectURL(blob);
                a.href = objUrl; a.download = node.name;
                document.body.appendChild(a); a.click(); document.body.removeChild(a);
                setTimeout(function(){ URL.revokeObjectURL(objUrl); }, 30000);
                reader.close();
                document.getElementById('ae-archive-preview-modal').style.display = 'none';
              });
            });
          }).catch(function(e){
            body.innerHTML = '<div style="color:#e07070;padding:20px;text-align:center;">读取失败，请重试</div>';
          });
        }

        function aeArchiveRenderNode(node, depth) {
          var wrap = document.createElement('div');
          if (node.dir) {
            var row = document.createElement('div');
            row.className = 'archive-row is-dir';
            row.style.paddingLeft = (10 + depth * 16) + 'px';
            row.innerHTML =
              '<span class="archive-icon" data-toggle-icon>▾</span>' +
              '<span class="archive-icon">📁</span>' +
              '<span class="archive-name">' + node.name + '</span>';
            var childrenWrap = document.createElement('div');
            childrenWrap.className = 'archive-children';
            aeArchiveSortedChildren(node).forEach(function(child){
              childrenWrap.appendChild(aeArchiveRenderNode(child, depth + 1));
            });
            row.onclick = function(){
              var collapsed = childrenWrap.classList.toggle('collapsed');
              row.querySelector('[data-toggle-icon]').textContent = collapsed ? '▸' : '▾';
            };
            wrap.appendChild(row);
            wrap.appendChild(childrenWrap);
          } else {
            var frow = document.createElement('div');
            frow.className = 'archive-row is-file';
            frow.style.paddingLeft = (10 + depth * 16) + 'px';
            var sizeText = aeArchiveFmtSize(node.entry.uncompressedSize);
            frow.innerHTML =
              '<span class="archive-icon">📄</span>' +
              '<span class="archive-name">' + node.name + '</span>' +
              '<span class="archive-size">' + sizeText + '</span>' +
              '<span class="archive-actions"><a data-act="preview">预览</a><a data-act="download">下载</a></span>';
            frow.querySelector('[data-act="preview"]').onclick = function(ev){ ev.stopPropagation(); aeArchiveHandleEntry(node, "preview"); };
            frow.querySelector('[data-act="download"]').onclick = function(ev){ ev.stopPropagation(); aeArchiveHandleEntry(node, "download"); };
            wrap.appendChild(frow);
          }
          return wrap;
        }

        var archiveStatus = document.getElementById('ae-preview-status');
        aeArchiveOpenReader().then(function(reader){
          archiveStatus.innerText = "验证通过，正在读取压缩包目录…";
          return reader.getEntries().then(function(entries){
            entries.forEach(function(e, i){ e.__aeIndex = i; });
            var fileEntries = entries.filter(function(e){ return !e.directory; });
            document.getElementById('ae-archive-entry-count').textContent = fileEntries.length;
            var tree = aeArchiveBuildTree(entries);
            var treeEl = document.getElementById('ae-archive-tree');
            aeArchiveSortedChildren(tree).forEach(function(child){
              treeEl.appendChild(aeArchiveRenderNode(child, 0));
            });
            archiveStatus.style.display = 'none';
            document.getElementById('ae-archive-body').style.display = '';
            reader.close().catch(function(){});
          });
        }).catch(function(e){
          archiveStatus.style.display = 'none';
          document.getElementById('ae-unsupported-msg').style.display = '';
        });
        })();
