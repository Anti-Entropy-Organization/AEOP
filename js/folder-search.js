(function () {
  var input = document.getElementById("ae-folder-search-input");
  var list = document.getElementById("ae-file-list");
  if (!input || !list) return;
  var originalHtml = list.innerHTML;
  var modelId = window.__AE_MODEL_ID__ || "";
  var rootPath = window.__AE_ROOT_PATH__ || "";
  var folderIcon = "https://cdn.jsdelivr.net/gh/Anti-Entropy-Organization/AEOP@main/AEOP_folder.svg";
  var fileIcon = "https://cdn.jsdelivr.net/gh/Anti-Entropy-Organization/AEOP@main/AEOP_file.svg";

  var index = null;
  var indexPromise = null;

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function highlight(text, query) {
    if (!query) return esc(text);
    var lower = text.toLowerCase();
    var q = query.toLowerCase();
    var out = "";
    var i = 0;
    while (i < text.length) {
      var hit = lower.indexOf(q, i);
      if (hit === -1) {
        out += esc(text.slice(i));
        break;
      }
      out += esc(text.slice(i, hit));
      out += '<span class="ae-hl-mark">' + esc(text.slice(hit, hit + q.length)) + '</span>';
      i = hit + q.length;
    }
    return out;
  }

  function loadIndex() {
    if (indexPromise) return indexPromise;
    indexPromise = window.__aeFetchWithTicket("?search=1", { credentials: "same-origin" })
      .then(function (resp) {
        if (!resp.ok) throw new Error("search index request failed: " + resp.status);
        return resp.json();
      })
      .then(function (data) {
        index = (data && typeof data === "object" && !Array.isArray(data)) ? data : {};
        return index;
      })
      .catch(function () {
        index = {};
        return index;
      });
    return indexPromise;
  }

  function collectMatches(node, relPrefix, q, out) {
    if (!node) return;
    if (node.f) {
      for (var i = 0; i < node.f.length; i++) {
        var fname = node.f[i];
        if (fname.toLowerCase().indexOf(q) !== -1) {
          out.push({ n: fname, t: "f", p: relPrefix ? relPrefix + "/" + fname : fname });
        }
      }
    }
    if (node.d) {
      for (var dname in node.d) {
        if (!Object.prototype.hasOwnProperty.call(node.d, dname)) continue;
        var childRel = relPrefix ? relPrefix + "/" + dname : dname;
        if (dname.toLowerCase().indexOf(q) !== -1) {
          out.push({ n: dname, t: "d", p: childRel });
        }
        collectMatches(node.d[dname], childRel, q, out);
      }
    }
  }

  function renderMatches(q) {
    var matches = [];
    collectMatches(index, "", q, matches);
    if (!matches.length) {
      list.innerHTML = '<li class="empty-placeholder" style="padding:20px;">未找到匹配的文件或文件夹</li>';
      return;
    }
    var html = "";
    matches.forEach(function (item) {
      var fullPath = modelId + "/" + (rootPath ? rootPath + "/" + item.p : item.p);
      var isDir = item.t === "d";
      var icon = isDir ? folderIcon : fileIcon;
      var size = isDir ? 20 : 24;

      var relDir = item.p.slice(0, item.p.length - item.n.length);
      if (relDir.slice(-1) === "/") relDir = relDir.slice(0, -1);
      var dirLabel = modelId + (rootPath ? "/" + rootPath : "") + (relDir ? "/" + relDir : "");

      html +=
        '<li class="file-row">' +
          '<div class="file-col name" style="position:relative;">' +
            '<button type="button" class="file-link ae-search-hit" data-jump="' + esc(fullPath) + '" ' +
            'style="background:none; border:none; padding:0; width:100%; text-align:left; cursor:pointer; color:#fff; display:inline-flex; align-items:center; font-family: SFMono-Regular, Consolas, Liberation Mono, Menlo, monospace;">' +
              '<img src="' + icon + '" width="' + size + '" height="' + size + '" style="vertical-align:middle; margin-right:8px; flex:0 0 auto;">' +
              '<span style="display:flex; flex-direction:column; min-width:0; flex:1 1 auto;">' +
                '<span class="truncate" style="font-size:14px; font-weight:normal; line-height:1.15;">' + highlight(item.n, q) + '</span>' +
                '<span class="truncate" style="font-size:10px; line-height:1.15; color:#8fb1ff; opacity:0.65; margin-top:1px;">' + esc(dirLabel) + '</span>' +
              '</span>' +
            '</button>' +
          '</div>' +
          '<div class="file-col size"></div>' +
          '<div class="file-col download"></div>' +
          '<div class="file-col time"></div>' +
        '</li>';
    });
    list.innerHTML = html;
    list.querySelectorAll(".ae-search-hit").forEach(function (btn) {
      btn.addEventListener("click", function () {
        showFolderLoadingAndJump(btn.getAttribute("data-jump"));
      });
    });
    list.querySelectorAll(".file-col.name").forEach(function (col) {
      col.querySelectorAll(".ae-hl-mark").forEach(function (mark) {
        var box = document.createElement("div");
        box.style.cssText =
          "position:absolute; left:" + mark.offsetLeft + "px; top:" + mark.offsetTop + "px; " +
          "width:" + mark.offsetWidth + "px; height:" + mark.offsetHeight + "px; " +
          "background:rgba(255,214,51,0.32); box-shadow:0 0 0 1px rgba(255,214,51,0.85); " +
          "pointer-events:none;";
        col.appendChild(box);
      });
    });
  }

  function render(query) {
    var q = query.trim().toLowerCase();
    if (!q) {
      list.innerHTML = originalHtml;
      return;
    }
    if (index === null) {
      list.innerHTML = '<li class="empty-placeholder" style="padding:20px;">正在搜索…</li>';
      loadIndex().then(function () {
        var latest = input.value.trim().toLowerCase();
        if (latest) {
          renderMatches(latest);
        } else {
          list.innerHTML = originalHtml;
        }
      });
      return;
    }
    renderMatches(q);
  }

  input.addEventListener("focus", loadIndex, { once: true });

  input.addEventListener("input", function () {
    render(input.value);
  });
})();
