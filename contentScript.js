chrome.runtime.sendMessage({ type: "NEW_PAGE", href: window.location.href, title: document.title });
