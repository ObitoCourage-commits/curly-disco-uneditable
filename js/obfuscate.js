!function(){"use strict";
  var OBS_KEY="hub_obfuscate";
  var ANTI_KEY="hub_anti_close";
  var state = {
    obfuscate: localStorage.getItem(OBS_KEY) === '1',
    antiClose: localStorage.getItem(ANTI_KEY) !== '0'
  };
  window.addEventListener('beforeunload', function (e) {
    if (state.antiClose) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
  var wordsMap = {
    "games": "tasks",
    "game": "task",
    "proxies": "docs",
    "proxy": "doc",
    "web": "net",
    "music": "audio",
    "ai": "tutor",
    "play": "read",
    "player": "user",
    "unblocked": "open",
    "chat": "talk"
  };
  var keys = Object.keys(wordsMap);
  var regex = new RegExp("\\b(" + keys.join("|") + ")\\b", "gi");
  function replaceVisual(str) {
    return str.replace(regex, function(match) {
      var lowerMatch = match.toLowerCase();
      var replacement = wordsMap[lowerMatch];
      if (!replacement) return match;
      if (match === match.toUpperCase() && match.length > 2) {
        return replacement.toUpperCase();
      } else if (match[0] === match[0].toUpperCase()) {
        return replacement.charAt(0).toUpperCase() + replacement.slice(1);
      }
      return replacement;
    });
  }
  function walkDOM(node) {
    if (node.nodeType === 3) {
      var val = node.nodeValue;
      if (val && val.trim() !== '') {
        var newVal = replaceVisual(val);
        if (newVal !== val) {
          node.nodeValue = newVal;
        }
      }
    } else if (node.nodeType === 1 && node.nodeName !== "SCRIPT" && node.nodeName !== "STYLE") {
      var child = node.firstChild;
      while (child) {
        var next = child.nextSibling;
        walkDOM(child);
        child = next;
      }
    }
  }
  var observer = new MutationObserver(function(mutations) {
    if (!state.obfuscate) return;
    observer.disconnect();
    mutations.forEach(function(mutation) {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(function(node) {
          walkDOM(node);
        });
      } else if (mutation.type === 'characterData') {
        walkDOM(mutation.target);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  });
  document.addEventListener("DOMContentLoaded", function() {
    var obsTog = document.getElementById("obfuscateText");
    var antiTog = document.getElementById("antiClose");
    if (obsTog) {
      obsTog.checked = state.obfuscate;
      obsTog.addEventListener("change", function() {
        var wasOn = state.obfuscate;
        state.obfuscate = obsTog.checked;
        localStorage.setItem(OBS_KEY, state.obfuscate ? '1' : '0');
        if (wasOn && !state.obfuscate) {
          location.reload();
          return;
        }
        if (state.obfuscate) {
          walkDOM(document.body);
          observer.observe(document.body, { childList: true, subtree: true, characterData: true });
        }
      });
    }
    if (antiTog) {
      antiTog.checked = state.antiClose;
      antiTog.addEventListener("change", function() {
        state.antiClose = antiTog.checked;
        localStorage.setItem(ANTI_KEY, state.antiClose ? '1' : '0');
      });
    }
    if (state.obfuscate) {
      walkDOM(document.body);
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    }
  });
}();