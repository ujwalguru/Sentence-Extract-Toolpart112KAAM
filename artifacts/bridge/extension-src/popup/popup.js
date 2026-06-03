// popup.js — Seamless Bridge extension popup
(function () {
  'use strict';

  var bridgeUrl = null;
  // BAKED_API_URL is injected at download time by the API server; fallback is used if undefined

  var extractedData = null; // { title, platform, messages }
  var sourcePlatformLabel = '';

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function $(id) { return document.getElementById(id); }

  var PLATFORM_LABELS = {
    chatgpt: 'ChatGPT', claude: 'Claude', gemini: 'Gemini',
    perplexity: 'Perplexity', grok: 'Grok', deepseek: 'DeepSeek',
    mistral: 'Mistral', copilot: 'Copilot', generic: 'AI'
  };

  function platformLabel(p) { return PLATFORM_LABELS[p] || 'AI'; }

  function showScreen(name) {
    ['state-loading', 'state-empty', 'state-result'].forEach(function (id) {
      var el = $(id);
      if (el) el.style.display = (id === name) ? '' : 'none';
    });
  }

  function showStatus(msg, type) {
    // type: '' (success) | 'error' | 'info'
    var el = $('share-status');
    el.textContent = msg;
    el.className = 'share-status' + (type ? ' ' + type : '');
    el.style.display = 'block';
    if (type !== 'error') {
      setTimeout(function () { el.style.display = 'none'; }, 5000);
    }
  }

  function hideStatus() { $('share-status').style.display = 'none'; }

  function setProgress(show, label, pct) {
    var wrap = $('progress-wrap');
    wrap.style.display = show ? 'block' : 'none';
    if (show) {
      $('progress-label-text').textContent = label || 'Generating...';
      $('progress-pct').textContent = (pct || 0) + '%';
      $('progress-fill').style.width = (pct || 0) + '%';
    }
  }

  function copyToClipboard(text) {
    return navigator.clipboard.writeText(text).catch(function () {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed'; ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select(); document.execCommand('copy');
      document.body.removeChild(ta);
    });
  }

  function downloadFile(content, filename, type) {
    var blob = new Blob([content], { type: type });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ── Formatters ────────────────────────────────────────────────────────────────
  function formatMarkdown(data) {
    if (!data) return '';
    var lines = ['# ' + data.title, ''];
    data.messages.forEach(function (m) {
      lines.push('**' + (m.role === 'user' ? 'User' : 'Assistant') + ':**');
      lines.push(m.content);
      lines.push('');
    });
    return lines.join('\n');
  }

  function formatText(data) {
    if (!data) return '';
    return data.messages.map(function (m) {
      return (m.role === 'user' ? 'User: ' : 'Assistant: ') + m.content;
    }).join('\n\n');
  }

  // ── API: create public bridge link ────────────────────────────────────────────
  async function createPublicLink() {
    var text = formatMarkdown(extractedData);
    var candidates = [];
    if (bridgeUrl && !/^https?:\/\/replit\.com/.test(bridgeUrl)) candidates.push(bridgeUrl);
    if (typeof BAKED_API_URL !== 'undefined' && BAKED_API_URL) candidates.push(BAKED_API_URL);
    if (!candidates.includes('https://seamlessbridge.replit.app')) candidates.push('https://seamlessbridge.replit.app');
    // deduplicate
    candidates = candidates.filter(function (v, i, a) { return a.indexOf(v) === i; });

    var lastErr = null;
    for (var i = 0; i < candidates.length; i++) {
      try {
        var r = await fetch(candidates[i] + '/api/public-bridge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: text })
        });
        var ct = r.headers.get('content-type') || '';
        if (!ct.includes('json')) throw new Error('non_json_response');
        var d = await r.json();
        if (!r.ok || !d.url) throw new Error(d.error || 'no_url');
        return d.url;
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error('all_candidates_failed');
  }

  // ── Render messages ────────────────────────────────────────────────────────────
  function renderMessages(data) {
    var list = $('messages-list');
    list.innerHTML = '';
    var msgs = data.messages.slice(0, 6); // preview max 6
    msgs.forEach(function (m) {
      var div = document.createElement('div');
      div.className = 'msg ' + m.role;
      var roleLabel = m.role === 'user' ? 'You' : platformLabel(data.platform);
      div.innerHTML = '<div class="msg-role">' + roleLabel + '</div><div class="msg-content">' +
        escHtml(m.content.slice(0, 120)) + (m.content.length > 120 ? '…' : '') + '</div>';
      list.appendChild(div);
    });
    if (data.messages.length > 6) {
      var more = document.createElement('div');
      more.className = 'msg';
      more.style.color = '#555';
      more.style.fontSize = '9px';
      more.style.textAlign = 'center';
      more.textContent = '+ ' + (data.messages.length - 6) + ' more messages';
      list.appendChild(more);
    }
  }

  function escHtml(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // ── Show result screen ─────────────────────────────────────────────────────────
  function showResult(data) {
    extractedData = data;
    sourcePlatformLabel = platformLabel(data.platform);

    $('msg-count').textContent = data.messages.length;
    $('chat-title').textContent = data.title || 'Untitled Chat';
    $('platform-badge').textContent = sourcePlatformLabel;

    renderMessages(data);
    hideStatus();
    setProgress(false);
    showScreen('state-result');
  }

  // ── Extract from current tab ────────────────────────────────────────────────
  function doExtract() {
    showScreen('state-loading');
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (!tabs || !tabs[0]) { showScreen('state-empty'); return; }
      var tab = tabs[0];

      // Try to register a bridge URL from the tab's origin
      try {
        var u = new URL(tab.url || '');
        if (!u.hostname.includes('replit.com') && u.hostname.includes('replit.app')) {
          bridgeUrl = u.origin;
        }
      } catch (e) {}

      chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT' }, function (resp) {
        if (chrome.runtime.lastError || !resp) {
          // Content script not injected yet — inject it
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content-ai.js']
          }, function () {
            if (chrome.runtime.lastError) { showScreen('state-empty'); return; }
            setTimeout(function () {
              chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT' }, function (resp2) {
                if (chrome.runtime.lastError || !resp2 || !resp2.ok) { showScreen('state-empty'); return; }
                if (!resp2.data || !resp2.data.messages || resp2.data.messages.length === 0) { showScreen('state-empty'); return; }
                showResult(resp2.data);
              });
            }, 400);
          });
          return;
        }
        if (!resp.ok || !resp.data || !resp.data.messages || resp.data.messages.length === 0) {
          showScreen('state-empty'); return;
        }
        showResult(resp.data);
      });
    });
  }

  // ── Platform "CONTINUE WITH" button click ─────────────────────────────────────
  // NEW BEHAVIOR: generates a public bridge link, copies a short passage with the link,
  // then opens the target platform. No full chat text copied inline.
  async function handleContinueWith(btn) {
    if (!extractedData) { showStatus('Extract a chat first.', 'error'); return; }

    var targetLabel = btn.getAttribute('data-label') || 'AI';
    var targetUrl = btn.getAttribute('data-url');

    // Disable all platform buttons during generation
    var allBtns = document.querySelectorAll('.platform-btn');
    allBtns.forEach(function (b) { b.classList.add('loading'); b.disabled = true; });

    hideStatus();
    setProgress(true, 'Generating public link…', 10);

    try {
      setProgress(true, 'Uploading conversation…', 35);
      var publicUrl = await createPublicLink();

      setProgress(true, 'Preparing passage…', 80);
      await new Promise(function (r) { setTimeout(r, 200); });

      // Build the short passage — just the link, no full chat inline
      var passage =
        'I had the following conversation with ' + sourcePlatformLabel + '. ' +
        'Please read it carefully and continue from where it left off, maintaining the same context and tone.\n\n' +
        'Full conversation: ' + publicUrl;

      await copyToClipboard(passage);

      setProgress(false);

      btn.classList.remove('loading');
      btn.classList.add('done');
      btn.textContent = '✓ Link copied!';

      showStatus('✓ Public link copied! Paste it into ' + targetLabel + ' when the new tab opens.', '');

      // Open the target platform
      setTimeout(function () {
        chrome.tabs.create({ url: targetUrl });
      }, 400);

      // Reset button after 3s
      setTimeout(function () {
        btn.classList.remove('done', 'loading');
        btn.disabled = false;
        btn.innerHTML = '<span class="platform-icon">' + btn.getAttribute('data-icon') + '</span>' + targetLabel;
      }, 3000);

    } catch (err) {
      setProgress(false);
      showStatus('⚠ Could not generate link: ' + (err.message || 'network error'), 'error');
      allBtns.forEach(function (b) { b.classList.remove('loading'); b.disabled = false; });
    }
  }

  // ── Get Public Link button ────────────────────────────────────────────────────
  async function handleGetPublicLink() {
    if (!extractedData) { showStatus('Extract a chat first.', 'error'); return; }

    $('public-link-btn').textContent = '⏳ Generating…';
    $('public-link-btn').disabled = true;
    hideStatus();
    setProgress(true, 'Creating public paste…', 40);

    try {
      var url = await createPublicLink();
      setProgress(true, 'Done!', 100);
      await new Promise(function (r) { setTimeout(r, 200); });
      setProgress(false);
      await copyToClipboard(url);
      $('public-link-btn').textContent = '✓ Copied!';
      showStatus('Public link copied: ' + url, '');
      setTimeout(function () {
        $('public-link-btn').textContent = 'Get Public Link';
        $('public-link-btn').disabled = false;
      }, 3000);
    } catch (err) {
      setProgress(false);
      showStatus('Failed to generate link: ' + (err.message || 'network error'), 'error');
      $('public-link-btn').textContent = 'Get Public Link';
      $('public-link-btn').disabled = false;
    }
  }

  // ── Open in Bridge ────────────────────────────────────────────────────────────
  async function handleOpenInBridge() {
    if (!extractedData) { showStatus('Extract a chat first.', 'error'); return; }
    $('open-bridge-btn').textContent = '⏳ Opening…';
    $('open-bridge-btn').disabled = true;
    try {
      var url = await createPublicLink();
      chrome.tabs.create({ url: url });
      $('open-bridge-btn').textContent = '✓ Opened';
      setTimeout(function () {
        $('open-bridge-btn').textContent = 'Open in Bridge';
        $('open-bridge-btn').disabled = false;
      }, 2000);
    } catch (err) {
      showStatus('Failed to open bridge: ' + (err.message || 'error'), 'error');
      $('open-bridge-btn').textContent = 'Open in Bridge';
      $('open-bridge-btn').disabled = false;
    }
  }

  // ── Wire up events ────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    // Store data-icon values before we overwrite innerHTML
    document.querySelectorAll('.platform-btn').forEach(function (btn) {
      var iconEl = btn.querySelector('.platform-icon');
      if (iconEl) btn.setAttribute('data-icon', iconEl.textContent);
    });

    // Platform "CONTINUE WITH" buttons
    document.getElementById('platform-grid').addEventListener('click', function (e) {
      var btn = e.target.closest('.platform-btn');
      if (!btn || btn.disabled) return;
      handleContinueWith(btn);
    });

    // Download buttons
    $('dl-md').addEventListener('click', function () {
      if (!extractedData) return;
      downloadFile(formatMarkdown(extractedData), 'chat-export.md', 'text/markdown');
    });
    $('dl-txt').addEventListener('click', function () {
      if (!extractedData) return;
      downloadFile(formatText(extractedData), 'chat-export.txt', 'text/plain');
    });
    $('dl-json').addEventListener('click', function () {
      if (!extractedData) return;
      downloadFile(JSON.stringify(extractedData.messages, null, 2), 'chat-export.json', 'application/json');
    });
    $('dl-copy').addEventListener('click', function () {
      if (!extractedData) return;
      copyToClipboard(formatText(extractedData)).then(function () {
        $('dl-copy').textContent = '✓';
        setTimeout(function () { $('dl-copy').textContent = 'Copy'; }, 2000);
      });
    });

    // Share buttons
    $('public-link-btn').addEventListener('click', handleGetPublicLink);
    $('open-bridge-btn').addEventListener('click', handleOpenInBridge);

    // Reset / retry
    $('btn-reset').addEventListener('click', function () {
      extractedData = null;
      showScreen('state-loading');
      doExtract();
    });
    $('btn-retry').addEventListener('click', doExtract);

    // Auto-extract on popup open
    doExtract();
  });
})();
