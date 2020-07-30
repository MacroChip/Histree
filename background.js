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

const tabs = {};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const tabId = sender.tab.id;
  console.log(`${tabId} clicked ${request.href}`);
  if (!tabs[tabId]) {
    tabs[tabId] = {
      nodes: [],
      edges: [],
    };
  }
  const nodes = tabs[tabId].nodes;
  const edges = tabs[tabId].edges;
  nodes.push({ id: id, label: request.href });
  const lastNode = nodes[nodes.length - 2];
  if (lastNode) {
    edges.push({ from: lastNode.id, to: id });
  }
  id += 1;

  var container = document.getElementById("mynetwork");
  var data = {
    nodes: new vis.DataSet(Object.entries(tabs).map(([key, value]) => value.nodes).flat()),
    edges: new vis.DataSet(Object.entries(tabs).map(([key, value]) => value.edges).flat()),
  };
  var options = { layout: { hierarchical: true } };
  var network = new vis.Network(container, data, options);
});
