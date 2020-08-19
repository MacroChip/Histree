'use strict';

document.getElementById('changeColor').onclick = function(element) {
  chrome.tabs.create({url: chrome.extension.getURL('graph_ui.html')});
};
