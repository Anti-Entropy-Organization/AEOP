(function(){
      var fileName = window.__AE_CTX.fileName;
      var modelId = window.__AE_CTX.modelId;
      var filePath = window.__AE_CTX.filePath;
      var viewUrlBase = window.__AE_CTX.viewUrlBase;
      function getLang(name){
        var lower = name.toLowerCase();
        if (lower === "dockerfile") return "dockerfile";
        if (lower === "makefile") return "shell";
        var ext = (name.split(".").pop() || "").toLowerCase();
        var map = {
          js:"javascript", mjs:"javascript", cjs:"javascript", jsx:"javascript",
          ts:"typescript", tsx:"typescript", py:"python", json:"json", jsonc:"json",
          yml:"yaml", yaml:"yaml", md:"markdown", markdown:"markdown", html:"html", htm:"html",
          css:"css", scss:"scss", less:"less", java:"java", c:"c", h:"c", cpp:"cpp", cc:"cpp",
          hpp:"cpp", cs:"csharp", go:"go", rs:"rust", rb:"ruby", php:"php", sh:"shell",
          bash:"shell", zsh:"shell", sql:"sql", xml:"xml", ini:"ini", cfg:"ini", conf:"ini",
          toml:"ini", txt:"plaintext", csv:"plaintext", log:"plaintext", r:"r", swift:"swift",
          kt:"kotlin", kts:"kotlin", lua:"lua", pl:"perl", ps1:"powershell", bat:"bat", cmd:"bat",
          vue:"html", graphql:"graphql", gql:"graphql", proto:"protobuf", scala:"scala",
          clj:"clojure", ex:"elixir", exs:"elixir", dart:"dart", hcl:"hcl", tf:"hcl",
          groovy:"java", rst:"restructuredtext", tex:"plaintext"
        };
        return map[ext] || "plaintext";
      }
      function initEditor(content){
        var lang = getLang(fileName);
        var badge = document.getElementById("ae-lang-badge");
        if (badge) badge.textContent = lang;
        require.config({ paths: { vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs" } });
        require(["vs/editor/editor.main"], function(){
          var loadingEl = document.getElementById("ae-editor-loading");
          if (loadingEl) loadingEl.style.display = "none";
          var editor = monaco.editor.create(document.getElementById("ae-monaco-editor"), {
            value: content,
            language: lang,
            theme: "vs-dark",
            readOnly: true,
            automaticLayout: true,
            minimap: { enabled: true },
            fontSize: 14,
            wordWrap: "on",
            renderLineHighlight: "all",
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            contextmenu: true
          });
          var SHIKI_LANG_MAP = {
            javascript: "javascript", typescript: "typescript", python: "python",
            json: "json", yaml: "yaml", markdown: "markdown", html: "html",
            css: "css", scss: "scss", less: "less", java: "java", c: "c",
            cpp: "cpp", csharp: "csharp", go: "go", rust: "rust", ruby: "ruby",
            php: "php", shell: "shellscript", sql: "sql", xml: "xml", ini: "ini",
            r: "r", swift: "swift", kotlin: "kotlin", lua: "lua", perl: "perl",
            powershell: "powershell", bat: "bat", graphql: "graphql",
            protobuf: "proto", scala: "scala", clojure: "clojure",
            elixir: "elixir", dart: "dart", hcl: "hcl", restructuredtext: "rst"
          };
          var SHIKI_THEME = "dark-modern";
          var DARK_MODERN_COLOR_OVERRIDES = {
            "editor.background": "#1f1f1f",
            "editor.foreground": "#cccccc",
            "editorLineNumber.foreground": "#6e7681",
            "editorLineNumber.activeForeground": "#cccccc",
            "editorGutter.addedBackground": "#2ea043",
            "editorGutter.deletedBackground": "#f85149",
            "editorGutter.modifiedBackground": "#0078d4",
            "editorWidget.background": "#202020",
            "editorOverviewRuler.border": "#010409",
            "focusBorder": "#0078d4",
            "widget.border": "#313131"
          };
          var shikiLangId = SHIKI_LANG_MAP[lang];
          if (shikiLangId) {
            Promise.all([
              import("https://esm.sh/shiki@4"),
              import("https://esm.sh/@shikijs/monaco@4")
            ]).then(function(mods){
              var shiki = mods[0];
              var shikiMonaco = mods[1];
              return shiki.createHighlighter({
                themes: ["dark-plus"],
                langs: [shikiLangId]
              }).then(function(highlighter){
                var darkPlus = highlighter.getTheme("dark-plus");
                var darkModern = Object.assign({}, darkPlus, {
                  name: SHIKI_THEME,
                  colors: Object.assign({}, darkPlus.colors, DARK_MODERN_COLOR_OVERRIDES)
                });
                return highlighter.loadTheme(darkModern).then(function(){
                  monaco.languages.register({ id: lang });
                  shikiMonaco.shikiToMonaco(highlighter, monaco);
                  monaco.editor.setTheme(SHIKI_THEME);
                });
              });
            }).catch(function(e){
            });
          }
          if (lang === "typescript" || lang === "javascript") {
            var TS_IGNORE_CODES = [2307, 2304, 2686, 2580, 2792];
            var tsCompilerOptions = {
              target: monaco.languages.typescript.ScriptTarget.ES2020,
              module: monaco.languages.typescript.ModuleKind.ESNext,
              moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
              allowNonTsExtensions: true,
              allowJs: true,
              jsx: monaco.languages.typescript.JsxEmit.Preserve,
              noEmit: true
            };
            monaco.languages.typescript.typescriptDefaults.setCompilerOptions(tsCompilerOptions);
            monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
              noSemanticValidation: false,
              noSyntaxValidation: false,
              diagnosticCodesToIgnore: TS_IGNORE_CODES
            });
            monaco.languages.typescript.javascriptDefaults.setCompilerOptions(
              Object.assign({}, tsCompilerOptions, { checkJs: true })
            );
            monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
              noSemanticValidation: false,
              noSyntaxValidation: false,
              diagnosticCodesToIgnore: TS_IGNORE_CODES
            });
          } else if (lang === "json") {
            monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
              validate: true,
              allowComments: false,
              schemaValidation: "warning"
            });
          } else if (lang === "css" || lang === "less" || lang === "scss") {
            monaco.languages.css.cssDefaults.setDiagnosticsOptions({ validate: true });
            monaco.languages.css.lessDefaults.setDiagnosticsOptions({ validate: true });
            monaco.languages.css.scssDefaults.setDiagnosticsOptions({ validate: true });
          } else if (lang === "python") {
            import("https://esm.sh/@astral-sh/ruff-wasm-web").then(function(mod){
              return mod.default().then(function(){
                var workspace = new mod.Workspace({
                  "line-length": 88,
                  lint: {
                    select: ["E", "W", "F", "E9"]
                  }
                }, mod.PositionEncoding.UTF16);
                var diagnostics = workspace.check(content);
                var markers = diagnostics.map(function(d){
                  var isSyntaxError = !d.code || d.code.indexOf("E9") === 0;
                  return {
                    severity: isSyntaxError ? monaco.MarkerSeverity.Error : monaco.MarkerSeverity.Warning,
                    message: d.code ? ("[" + d.code + "] " + d.message) : d.message,
                    startLineNumber: d.location.row,
                    startColumn: d.location.column,
                    endLineNumber: d.end_location.row,
                    endColumn: d.end_location.column
                  };
                });
                monaco.editor.setModelMarkers(editor.getModel(), "ruff", markers);
              });
            }).catch(function(e){
            });
          }
          var wrapCheckbox = document.getElementById("ae-wrap-checkbox");
          if (wrapCheckbox) {
            wrapCheckbox.addEventListener("change", function(){
              editor.updateOptions({ wordWrap: wrapCheckbox.checked ? "on" : "off" });
            });
          }
          var minimapCheckbox = document.getElementById("ae-minimap-checkbox");
          if (minimapCheckbox) {
            minimapCheckbox.addEventListener("change", function(){
              editor.updateOptions({ minimap: { enabled: minimapCheckbox.checked } });
            });
          }
          var fontSize = 14;
          var fontLabel = document.getElementById("ae-font-size-label");
          function applyFontSize(){
            editor.updateOptions({ fontSize: fontSize });
            if (fontLabel) fontLabel.textContent = fontSize + "px";
          }
          var fontMinusBtn = document.getElementById("ae-font-minus");
          var fontPlusBtn = document.getElementById("ae-font-plus");
          if (fontMinusBtn) fontMinusBtn.addEventListener("click", function(){
            fontSize = Math.max(10, fontSize - 1);
            applyFontSize();
          });
          if (fontPlusBtn) fontPlusBtn.addEventListener("click", function(){
            fontSize = Math.min(28, fontSize + 1);
            applyFontSize();
          });
          var shellEl = document.getElementById("ae-editor-shell");
          var fullscreenBtn = document.getElementById("ae-fullscreen-btn");
          var fullscreenText = document.getElementById("ae-fullscreen-text");
          function setFullscreen(on){
            if (!shellEl) return;
            shellEl.classList.toggle("ae-fullscreen", on);
            if (fullscreenText) fullscreenText.textContent = on ? "退出全屏" : "全屏";
            var footerEl = document.querySelector(".site-footer");
            if (footerEl) footerEl.style.display = on ? "none" : "";
            setTimeout(function(){ editor.layout(); }, 0);
          }
          if (fullscreenBtn) {
            fullscreenBtn.addEventListener("click", function(){
              setFullscreen(!shellEl.classList.contains("ae-fullscreen"));
            });
          }
          document.addEventListener("keydown", function(e){
            if (e.key === "Escape" && shellEl && shellEl.classList.contains("ae-fullscreen")) {
              setFullscreen(false);
            }
          });
          var copyBtn = document.getElementById("ae-copy-btn");
          var copyText = document.getElementById("ae-copy-text");
          if (copyBtn && copyText) {
            copyBtn.addEventListener("click", function(){
              navigator.clipboard.writeText(editor.getValue()).then(function(){
                var old = copyText.textContent;
                copyText.textContent = "已复制";
                setTimeout(function(){ copyText.textContent = old; }, 1200);
              }).catch(function(){});
            });
          }
          var lineLinkBtn = document.getElementById("ae-line-link-btn");
          var lineLinkText = document.getElementById("ae-line-link-text");
          function buildLineHash(startLine, endLine){
            return endLine && endLine !== startLine ? ("#L" + startLine + "-L" + endLine) : ("#L" + startLine);
          }
          if (lineLinkBtn && lineLinkText) {
            lineLinkBtn.addEventListener("click", function(){
              var sel = editor.getSelection();
              var hash = buildLineHash(sel.startLineNumber, sel.endLineNumber);
              history.replaceState(null, "", hash);
              var fullUrl = location.origin + location.pathname + hash;
              navigator.clipboard.writeText(fullUrl).then(function(){
                var old = lineLinkText.textContent;
                lineLinkText.textContent = "已复制";
                setTimeout(function(){ lineLinkText.textContent = old; }, 1200);
              }).catch(function(){});
            });
          }
          function applyHashHighlight(){
            var m = /^#L(\d+)(?:-L(\d+))?$/i.exec(location.hash || "");
            if (!m) return;
            var start = parseInt(m[1], 10);
            var end = m[2] ? parseInt(m[2], 10) : start;
            if (end < start) { var t = start; start = end; end = t; }
            var model = editor.getModel();
            var lastCol = model ? model.getLineMaxColumn(end) : 1;
            editor.setSelection(new monaco.Range(start, 1, end, lastCol));
            editor.revealLineInCenter(start);
            editor.deltaDecorations([], [{
              range: new monaco.Range(start, 1, end, lastCol),
              options: { isWholeLine: true, className: "ae-line-highlight-line", marginClassName: "ae-line-highlight-margin" }
            }]);
          }
          applyHashHighlight();
          var mdToggleBtn = document.getElementById("ae-md-toggle-btn");
          var mdToggleText = document.getElementById("ae-md-toggle-text");
          var mdPreviewEl = document.getElementById("ae-md-preview");
          var monacoEl = document.getElementById("ae-monaco-editor");
          if (lang === "markdown" && mdToggleBtn) {
            mdToggleBtn.hidden = false;
            var mdLibLoading = null;
            function loadMarked(){
              if (window.marked) return Promise.resolve();
              if (mdLibLoading) return mdLibLoading;
              mdLibLoading = new Promise(function(resolve, reject){
                var s = document.createElement("script");
                s.src = "https://cdnjs.cloudflare.com/ajax/libs/marked/12.0.2/marked.min.js";
                s.onload = resolve;
                s.onerror = reject;
                document.head.appendChild(s);
              });
              return mdLibLoading;
            }
            mdToggleBtn.addEventListener("click", function(){
              var showPreview = monacoEl.classList.contains("ae-hidden") === false;
              if (showPreview) {
                loadMarked().then(function(){
                  mdPreviewEl.innerHTML = window.marked.parse(editor.getValue());
                  monacoEl.classList.add("ae-hidden");
                  mdPreviewEl.classList.add("ae-active");
                  mdToggleText.textContent = "查看源码";
                }).catch(function(){
                  mdToggleText.textContent = "渲染失败";
                });
              } else {
                monacoEl.classList.remove("ae-hidden");
                mdPreviewEl.classList.remove("ae-active");
                mdToggleText.textContent = "渲染预览";
                setTimeout(function(){ editor.layout(); }, 0);
              }
            });
          }
          var jsonToggleBtn = document.getElementById("ae-json-toggle-btn");
          var jsonToggleText = document.getElementById("ae-json-toggle-text");
          if (lang === "json" && jsonToggleBtn) {
            jsonToggleBtn.hidden = false;
            var jsonFormatted = false;
            var jsonOriginal = content;
            var jsonPretty = null;
            jsonToggleBtn.addEventListener("click", function(){
              if (!jsonFormatted) {
                if (jsonPretty === null) {
                  try {
                    jsonPretty = JSON.stringify(JSON.parse(jsonOriginal), null, 2);
                  } catch (e) {
                    var old = jsonToggleText.textContent;
                    jsonToggleText.textContent = "JSON 无效";
                    setTimeout(function(){ jsonToggleText.textContent = old; }, 1400);
                    return;
                  }
                }
                editor.setValue(jsonPretty);
                jsonToggleText.textContent = "还原";
                jsonFormatted = true;
              } else {
                editor.setValue(jsonOriginal);
                jsonToggleText.textContent = "格式化";
                jsonFormatted = false;
              }
            });
          }
        });
      }
      var statusEl = document.getElementById("ae-gate-status");
      var ticketObtained = false;
      window.__aeGetTicket(modelId, filePath).then(function(ticket){
        ticketObtained = true;
        if (statusEl) statusEl.innerText = "验证通过，正在加载文件内容…";
        return fetch(viewUrlBase + "&ticket=" + encodeURIComponent(ticket)).then(function(r){
          return r.text().then(function(text){ return { status: r.status, ok: r.ok, text: text }; });
        });
      }).then(function(result){
        if (statusEl) statusEl.style.display = "none";
        if (result.status === 415) {
          var unsupportedEl = document.getElementById("ae-unsupported-msg");
          if (unsupportedEl) unsupportedEl.style.display = "";
          return;
        }
        if (!result.ok) {
          if (statusEl) {
            statusEl.style.display = "";
            statusEl.innerText = result.status === 403
              ? "访问被拒绝，请刷新页面重试"
              : "内容加载失败，请刷新页面重试";
          }
          return;
        }
        var toolbarWrap = document.getElementById("ae-editor-toolbar-wrap");
        var shellEl = document.getElementById("ae-editor-shell");
        if (toolbarWrap) toolbarWrap.style.display = "";
        if (shellEl) shellEl.style.display = "";
        initEditor(result.text || "");
      }).catch(function(e){
        if (statusEl) {
          statusEl.style.display = "";
          statusEl.innerText = ticketObtained ? "内容加载失败，请刷新页面重试" : "人机验证失败，请刷新页面重试";
        }
      });
    })();