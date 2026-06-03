// content-ai.js — runs on AI chat pages, extracts messages on demand
(function () {
  'use strict';

  function detectPlatform() {
    var h = location.hostname;
    if (h.includes('chatgpt.com') || h.includes('chat.openai.com')) return 'chatgpt';
    if (h.includes('claude.ai')) return 'claude';
    if (h.includes('gemini.google.com') || h.includes('aistudio.google.com')) return 'gemini';
    if (h.includes('perplexity.ai')) return 'perplexity';
    if (h.includes('grok.com') || h.includes('x.com')) return 'grok';
    if (h.includes('deepseek.com')) return 'deepseek';
    if (h.includes('mistral.ai')) return 'mistral';
    if (h.includes('copilot.microsoft.com')) return 'copilot';
    return 'generic';
  }

  function getTitle() {
    return document.title.replace(/ ?[\-\|] ?(ChatGPT|Claude|Gemini|Grok|Perplexity|DeepSeek|Mistral|Copilot).*/i, '').trim() || 'Extracted Chat';
  }

  function extractMessages() {
    var platform = detectPlatform();
    var messages = [];

    if (platform === 'chatgpt') {
      document.querySelectorAll('[data-message-author-role]').forEach(function (el) {
        var role = el.getAttribute('data-message-author-role') === 'user' ? 'user' : 'assistant';
        var inner = el.querySelector('.markdown, .prose') || el;
        var text = inner.innerText.trim();
        if (text.length > 1) messages.push({ role: role, content: text, htmlContent: inner.innerHTML });
      });
      // Fallback: article-based turns (newer ChatGPT layout)
      if (messages.length === 0) {
        document.querySelectorAll('article[data-testid^="conversation-turn"]').forEach(function (el) {
          var roleEl = el.querySelector('[data-message-author-role]');
          var role = roleEl ? roleEl.getAttribute('data-message-author-role') : null;
          var inner = el.querySelector('.markdown') || el;
          var text = inner.innerText.trim();
          if (!text) return;
          messages.push({ role: (['user','human'].includes(role) ? 'user' : 'assistant'), content: text, htmlContent: inner.innerHTML });
        });
      }
    } else if (platform === 'claude') {
      var seen = new WeakSet();
      ['[data-testid="human-turn"]','[data-testid="ai-turn"]','.font-user-message','.font-claude-message'].forEach(function(sel) {
        document.querySelectorAll(sel).forEach(function(el) {
          if (seen.has(el)) return;
          seen.add(el);
          var cls = (el.className || '').toLowerCase();
          var testId = el.getAttribute('data-testid') || '';
          var role = (cls.includes('font-user-message') || testId.includes('human')) ? 'user' : 'assistant';
          var text = el.innerText.trim();
          if (text.length > 1) messages.push({ role: role, content: text, htmlContent: el.innerHTML });
        });
      });
    } else if (platform === 'gemini') {
      var items = [];
      var i = 0;
      document.querySelectorAll('user-query, .user-query-container, .query-text').forEach(function(el) { items.push({ role: 'user', el: el, idx: i++ }); });
      document.querySelectorAll('model-response, .response-container, .model-response').forEach(function(el) { items.push({ role: 'assistant', el: el, idx: i++ }); });
      items.sort(function(a,b){ return a.idx - b.idx; });
      items.forEach(function(item) {
        var inner = item.el.querySelector('p, .response-content, .formatted-text') || item.el;
        var text = inner.innerText.trim();
        if (text.length > 1) messages.push({ role: item.role, content: text, htmlContent: inner.innerHTML });
      });
    } else if (platform === 'perplexity') {
      document.querySelectorAll('[data-testid="query-text"], [class*="UserMessage"]').forEach(function(el) {
        var text = el.innerText.trim();
        if (text.length > 1) messages.push({ role: 'user', content: text, htmlContent: el.innerHTML });
      });
      document.querySelectorAll('[class*="AnswerLayout"], [class*="AnswerSection"], .prose').forEach(function(el) {
        var text = el.innerText.trim();
        if (text.length > 1) messages.push({ role: 'assistant', content: text, htmlContent: el.innerHTML });
      });
    } else if (platform === 'grok') {
      document.querySelectorAll('[class*="UserMessage"], [class*="BotMessage"], [class*="HumanMessage"], [class*="AssistantMessage"]').forEach(function(el) {
        var cls = (el.className || '').toLowerCase();
        var role = (cls.includes('user') || cls.includes('human')) ? 'user' : 'assistant';
        var text = el.innerText.trim();
        if (text.length > 1) messages.push({ role: role, content: text, htmlContent: el.innerHTML });
      });
    } else if (platform === 'deepseek') {
      var $els = document.querySelectorAll('[data-role="user"], [data-role="assistant"]');
      if (!$els.length) $els = document.querySelectorAll('[class*="messageItem"], [class*="chat-message"]');
      $els.forEach(function(el) {
        var dataRole = el.getAttribute('data-role');
        var cls = (el.className || '').toLowerCase();
        var role = (dataRole === 'user' || cls.includes('user')) ? 'user' : 'assistant';
        var inner = el.querySelector('.ds-markdown, .markdown') || el;
        var text = inner.innerText.trim();
        if (text.length > 1) messages.push({ role: role, content: text, htmlContent: inner.innerHTML });
      });
    } else {
      // Generic fallback
      var tried = false;
      ['[data-message-author-role]','[data-role="user"],[data-role="assistant"]','[class*="UserMessage"],[class*="AssistantMessage"]'].forEach(function(sel) {
        if (tried) return;
        var els = document.querySelectorAll(sel);
        if (!els.length) return;
        tried = true;
        els.forEach(function(el) {
          var role = (el.getAttribute('data-message-author-role') || el.getAttribute('data-role') || (el.className||'')).includes('user') ? 'user' : 'assistant';
          var text = el.innerText.trim();
          if (text.length > 1) messages.push({ role: role, content: text, htmlContent: el.innerHTML });
        });
      });
    }

    // Dedup
    var result = [];
    messages.forEach(function(m) {
      var prev = result[result.length - 1];
      if (prev && prev.role === m.role && prev.content.slice(0, 80) === m.content.slice(0, 80)) return;
      result.push(m);
    });
    while (result.length && result[0].role !== 'user') result.shift();

    return { title: getTitle(), platform: platform, messages: result };
  }

  // Listen for extraction requests from the popup
  chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
    if (msg.type === 'EXTRACT') {
      try {
        var data = extractMessages();
        sendResponse({ ok: true, data: data });
      } catch (e) {
        sendResponse({ ok: false, error: e.message });
      }
    }
    return true; // keep channel open for async
  });
})();
