__aeTicketPromise.then(function(ticket) {
          var container = document.getElementById('ae-preview-audio');
          var status = document.getElementById('ae-preview-status');
          var audioUrl = "/" + window.__AE_CTX.modelId + "/" + window.__AE_CTX.filePath + "?view&ticket=" + encodeURIComponent(ticket);
          function loadScript(src) {
            return new Promise(function(resolve, reject) {
              var s = document.createElement('script');
              s.src = src; s.onload = resolve; s.onerror = reject;
              document.body.appendChild(s);
            });
          }
          loadScript('https://cdn.jsdelivr.net/npm/aplayer/dist/APlayer.min.js').then(function() {
            status.style.display = 'none';
            container.style.display = '';
            var ap = new APlayer({
              container: container,
              theme: '#5b8cff',
              autoplay: true,
              preload: 'auto',
              lrcType: 1,
              audio: [{
                name: window.__AE_CTX.fileName,
                artist: window.__AE_CTX.orgDisplay,
                url: audioUrl,
                cover: window.__AE_CTX.audioCover,
                lrc: "[00:00.00]SOUND ONLY"
              }]
            });
            var absoluteAudioUrl = location.origin + audioUrl;
            var fallbackTitle = window.__AE_CTX.fileName;
            var fallbackArtist = window.__AE_CTX.orgDisplay;
            var titleElLoading = container.querySelector('.aplayer-title');
            var authorElLoading = container.querySelector('.aplayer-author');
            if (titleElLoading) titleElLoading.textContent = "加载中...";
            if (authorElLoading) authorElLoading.textContent = "加载中...";
            function revertToFallback() {
              var titleEl = container.querySelector('.aplayer-title');
              var authorEl = container.querySelector('.aplayer-author');
              if (titleEl) titleEl.textContent = fallbackTitle;
              if (authorEl) authorEl.textContent = fallbackArtist;
            }
            function pictureTagToObjectUrl(picture) {
              if (!picture || !picture.data || !picture.data.length) return null;
              try {
                var bytes = new Uint8Array(picture.data);
                var blob = new Blob([bytes], { type: picture.format || "image/jpeg" });
                return URL.createObjectURL(blob);
              } catch (e) { return null; }
            }
            function applyCover(coverUrl) {
              if (!coverUrl) return;
              if (ap.list && ap.list.audios && ap.list.audios[0]) {
                ap.list.audios[0].cover = coverUrl;
              }
              var picEl = container.querySelector('.aplayer-pic');
              if (picEl) picEl.style.backgroundImage = "url('" + coverUrl + "')";
              return coverUrl;
            }
            loadScript('https://cdnjs.cloudflare.com/ajax/libs/jsmediatags/3.9.5/jsmediatags.min.js').then(function() {
              try { window.jsmediatags.Config.EXPERIMENTAL_avoidHeadRequests(); } catch (e) {}
              new window.jsmediatags.Reader(absoluteAudioUrl)
                .setTagsToRead(["title", "artist", "album", "picture"])
                .read({
                  onSuccess: function(result) {
                    var t = (result && result.tags) || {};
                    var title = (t.title || "").trim();
                    var artist = (t.artist || "").trim();
                    var album = (t.album || "").trim();
                    var embeddedCoverUrl = pictureTagToObjectUrl(t.picture);
                    if (embeddedCoverUrl) applyCover(embeddedCoverUrl);
                    if (!title && !artist && !album && !embeddedCoverUrl) { revertToFallback(); return; }
                    if (ap.list && ap.list.audios && ap.list.audios[0]) {
                      if (title) ap.list.audios[0].name = title;
                      if (artist) ap.list.audios[0].artist = artist;
                      if (album) ap.list.audios[0].album = album;
                    }
                    var titleEl = container.querySelector('.aplayer-title');
                    var authorEl = container.querySelector('.aplayer-author');
                    if (titleEl) titleEl.textContent = title || fallbackTitle;
                    if (authorEl) authorEl.textContent = artist ? (album ? (artist + " · " + album) : artist) : fallbackArtist;
                    if ('mediaSession' in navigator) {
                      try {
                        navigator.mediaSession.metadata = new MediaMetadata({
                          title: title || window.__AE_CTX.fileName,
                          artist: artist || window.__AE_CTX.orgDisplay,
                          album: album || "",
                          artwork: embeddedCoverUrl
                            ? [{ src: embeddedCoverUrl, sizes: "512x512", type: (t.picture && t.picture.format) || "image/jpeg" }]
                            : [{ src: window.__AE_CTX.audioCover, sizes: "200x200", type: "image/svg+xml" }]
                        });
                      } catch (e) {}
                    }
                  },
                  onError: function() { revertToFallback();  }
                });
            }).catch(function() { revertToFallback();  });
          }).catch(function() {
            status.innerText = "播放器加载失败，请刷新页面重试";
          });
        }).catch(function(e) {
          document.getElementById('ae-preview-status').innerText = "人机验证失败，请刷新页面重试";
        });