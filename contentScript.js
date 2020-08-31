chrome.runtime.sendMessage({ type: "NEW_PAGE", href: window.location.href, title: document.title });
let target = document.querySelector('title');
let observer = new window.MutationObserver(
    mutations => {
        mutations.forEach(
            mutation => {
                chrome.runtime.sendMessage({ type: "NEW_PAGE", href: window.location.href, title: mutation.target.textContent });
            }
        );
    }
);
observer.observe(target, { subtree: true, characterData: true, childList: true });

chrome.runtime.connect().onDisconnect.addListener(() => {
    observer.disconnect();
});
