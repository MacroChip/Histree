'use strict';

chrome.runtime.onInstalled.addListener(() => {
  chrome.history.onVisited.addListener(historyItem => {
    console.log(historyItem);
  });
});

chrome.declarativeContent.onPageChanged.removeRules(undefined, function () {
  chrome.declarativeContent.onPageChanged.addRules([{
    conditions: [new chrome.declarativeContent.PageStateMatcher({
      pageUrl: { schemes: ['http', 'https'] },
    })],
    actions: [new chrome.declarativeContent.ShowPageAction()]
  }]);
});

var id = 0;

var nodes = [];

var edges = [];

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log(`${sender.tab.id} clicked ${request.href}`);

  nodes.push({ id: id, label: request.href });
  edges.push({ from: id, to: id + 1 });
  id += 1;

  var container = document.getElementById("mynetwork");
  var data = {
    nodes: new vis.DataSet(nodes),
    edges: new vis.DataSet(edges),
  };
  var options = {};
  var network = new vis.Network(container, data, options);
});
