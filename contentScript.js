chrome.runtime.sendMessage({ type: "NEW_PAGE", href: window.location.href, title: document.title });
let target = document.querySelector('title');
new window.MutationObserver(
    mutations => {
        mutations.forEach(
            mutation => {
                chrome.runtime.sendMessage({ type: "NEW_PAGE", href: window.location.href, title: mutation.target.textContent });
            }
        );
    }
).observe(target, { subtree: true, characterData: true, childList: true });
