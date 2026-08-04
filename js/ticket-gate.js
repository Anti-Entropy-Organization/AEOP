(function(){
  var widgetId = null;
  var widgetReadyResolve;
  var widgetReady = new Promise(function(resolve){ widgetReadyResolve = resolve; });
  var turnstileLoading = false;
  window.__aeOnTurnstileLoad = function() {
    var slot = document.getElementById('ae-turnstile-slot');
    widgetId = turnstile.render(slot, {
      sitekey: "0x4AAAAAADy6zg8j1obqhDOl",
      size: 'invisible',
      callback: function(token) {
        if (window.__aePendingResolve) { var r = window.__aePendingResolve; window.__aePendingResolve = null; r(token); }
      },
      'error-callback': function() {
        if (window.__aePendingReject) { var rj = window.__aePendingReject; window.__aePendingReject = null; rj(new Error('turnstile_error')); }
      }
    });
    widgetReadyResolve();
  };
  function ensureTurnstileLoaded() {
    if (turnstileLoading) return;
    turnstileLoading = true;
    var slot = document.createElement('div');
    slot.id = 'ae-turnstile-slot';
    slot.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;overflow:hidden;';
    document.body.appendChild(slot);
    var s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=__aeOnTurnstileLoad&render=explicit';
    s.async = true;
    s.defer = true;
    document.head.appendChild(s);
  }
  function getFreshToken() {
    ensureTurnstileLoaded();
    return widgetReady.then(function() {
      return new Promise(function(resolve, reject) {
        window.__aePendingResolve = resolve;
        window.__aePendingReject = reject;
        try { turnstile.reset(widgetId); } catch (e) {}
        turnstile.execute(widgetId);
      });
    });
  }

  var ticketCache = null;
  var refreshInFlight = null;
  var TICKET_STORAGE_KEY = '__ae_ticket_cache';

  function readTicketFromStorage() {
    try {
      var raw = sessionStorage.getItem(TICKET_STORAGE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || !parsed.ticket || !parsed.exp) return null;
      return parsed;
    } catch (e) {
      return null;
    }
  }
  function writeTicketToStorage(entry) {
    try {
      sessionStorage.setItem(TICKET_STORAGE_KEY, JSON.stringify(entry));
    } catch (e) {}
  }
  function clearTicketStorage() {
    try { sessionStorage.removeItem(TICKET_STORAGE_KEY); } catch (e) {}
  }

  function requestNewTicket() {
    return getFreshToken().then(function(token) {
      return fetch('/_ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token })
      });
    }).then(function(r) {
      if (!r.ok) throw new Error('ticket_failed');
      return r.json();
    }).then(function(data) {
      if (!data || !data.ticket) throw new Error('no_ticket');
      return data.ticket;
    });
  }

  function decodeExpMs(ticket) {
    try {
      var dotIdx = ticket.indexOf('.');
      if (dotIdx < 0) return 0;
      var payloadB64 = ticket.slice(0, dotIdx).replace(/-/g, '+').replace(/_/g, '/');
      while (payloadB64.length % 4) payloadB64 += '=';
      var json = decodeURIComponent(atob(payloadB64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      var payload = JSON.parse(json);
      return (payload && payload.exp) ? payload.exp * 1000 : 0;
    } catch (e) {
      return 0;
    }
  }

  function refreshTicket() {
    if (refreshInFlight) return refreshInFlight;
    refreshInFlight = requestNewTicket().catch(function() {
      try { turnstile.reset(widgetId); } catch (e) {}
      return requestNewTicket();
    }).then(function(ticket) {
      var entry = { ticket: ticket, exp: decodeExpMs(ticket) };
      ticketCache = entry;
      writeTicketToStorage(entry);
      refreshInFlight = null;
      return ticket;
    }).catch(function(e) {
      refreshInFlight = null;
      throw e;
    });
    return refreshInFlight;
  }

  function getValidTicket() {
    if (ticketCache && Date.now() < ticketCache.exp) {
      return Promise.resolve(ticketCache.ticket);
    }
    var stored = readTicketFromStorage();
    if (stored && Date.now() < stored.exp) {
      ticketCache = stored;
      return Promise.resolve(stored.ticket);
    }
    return refreshTicket();
  }

  function appendTicket(url, ticket) {
    var u = new URL(url, window.location.href);
    u.searchParams.set('ticket', ticket);
    return u.pathname + u.search;
  }

  function looksLikeTicketRejected(resp) {
    return resp.status === 403;
  }
  window.__aeFetchWithTicket = function(url, options) {
    options = options || {};
    function doFetch() {
      return getValidTicket().then(function(ticket) {
        return fetch(appendTicket(url, ticket), options);
      });
    }
    return doFetch().then(function(resp) {
      if (!looksLikeTicketRejected(resp)) return resp;
      ticketCache = null;
      clearTicketStorage();
      return refreshTicket().then(function() {
        return doFetch();
      });
    });
  };

  window.__aeGetTicket = function(model_id, file_path) {
    return getValidTicket();
  };

  function triggerBlobDownload(blob, filename) {
    var blobUrl = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename || '';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(blobUrl); }, 30000);
  }
  function guessFilename(actionUrl) {
    try {
      var pathname = new URL(actionUrl, window.location.origin).pathname;
      var last = pathname.split('/').filter(Boolean).pop() || '';
      return decodeURIComponent(last);
    } catch (e) {
      return '';
    }
  }
  // 复用一个隐藏 iframe 当下载表单的提交目标：让浏览器原生发起这次 POST 下载，
  // 边收边写盘（流式），既不会把当前页导航走、也不用先把整个文件读进内存。
  function ensureDownloadFrame() {
    var frame = document.getElementById('__ae_dl_frame');
    if (!frame) {
      frame = document.createElement('iframe');
      frame.id = '__ae_dl_frame';
      frame.name = '__ae_dl_frame';
      frame.style.display = 'none';
      document.body.appendChild(frame);
    }
    return frame;
  }
  window.__aeBindDownloadForms = function(root) {
    (root || document).querySelectorAll('form.ae-download-form').forEach(function(form) {
      if (form.__aeBound) return;
      form.__aeBound = true;
      form.addEventListener('submit', function(ev) {
        ev.preventDefault();
        // 原始 action（不带票据），提交后要还原回去，避免过期票据被下次点击复用。
        var originalAction = form.getAttribute('action');
        var btn = form.querySelector('button[type=submit]');
        if (btn) btn.disabled = true;
        getValidTicket().then(function(ticket) {
          ensureDownloadFrame();
          // 方法保持 POST 不变；票据拼进 URL 查询串（worker 用 searchParams 读），
          // 提交目标设成隐藏 iframe，交给浏览器原生流式下载。早期不知道谁写的fetch到内存，现在改了应该问题不大。
          form.setAttribute('target', '__ae_dl_frame');
          form.setAttribute('action', appendTicket(originalAction, ticket));
          form.submit();
          // 立刻还原 action，让下次点击重新取一张新票据。
          form.setAttribute('action', originalAction);
          if (btn) btn.disabled = false;
        }).catch(function(e) {
          if (btn) btn.disabled = false;
          alert('下载失败，请重试');
        });
      });
    });
  };

  document.addEventListener('DOMContentLoaded', function() {
    window.__aeBindDownloadForms();
    getValidTicket().catch(function() {});
  });
})();