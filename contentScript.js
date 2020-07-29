$("a").click((e) => {
    console.log(e.target.href);
    chrome.runtime.sendMessage({ type: "FROM_PAGE", href: e.target.href });
})
