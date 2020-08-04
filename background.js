'use strict';

chrome.declarativeContent.onPageChanged.removeRules(undefined, function () {
  chrome.declarativeContent.onPageChanged.addRules([{
    conditions: [new chrome.declarativeContent.PageStateMatcher({
      pageUrl: { schemes: ['http', 'https'] },
    })],
    actions: [new chrome.declarativeContent.ShowPageAction()]
  }]);
});

const redraw = () => {
  var container = document.getElementById("mynetwork");
  var data = {
    nodes: new vis.DataSet(Object.entries(tabs).map(([key, value]) => value.nodes).flat()),
    edges: new vis.DataSet(
      Object.entries(tabs)
        .map(([key, value]) => value.edges)
        .concat(tabConnections)
        .flat()
    ),
  };
  var options = {
    layout: {
      hierarchical: {
        nodeSpacing: 300,
      },
    },
  };
  var network = new vis.Network(container, data, options);
}

var id = 0;

const tabs = {};
const tabConnections = [];

const makeNode = (label) => {
  const newNode = { id, label };
  id += 1;
  return newNode;
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const tabId = sender.tab.id;
  console.log(`${tabId} message ${request.type}`);
  if (request.type === "NEW_PAGE") {
    if (!tabs[tabId]) { //if the addon wasn't up when the new tab listener fired
      console.log(`new tab from content script at ${Date.now()}`);
      tabs[tabId] = {
        nodes: [makeNode(request.href)],
        edges: [],
      };
    } else {
      console.log(`${tabId} clicked ${request.href} at ${Date.now()}`);
      const nodes = tabs[tabId].nodes;
      const edges = tabs[tabId].edges;
      nodes.push(makeNode(request.href));
      const lastNode = nodes[nodes.length - 2];
      if (lastNode) {
        edges.push({ from: lastNode.id, to: id - 1 });
      }
    }
    redraw();
  }
});

chrome.tabs.onCreated.addListener((tab) => {
  const openerTabId = tab.openerTabId;
  const tabId = tab.id;
  console.log(`Tab ${tabId} opened by ${openerTabId} at ${Date.now()}`);
  if (!tabs[tabId]) {
    console.log(`New tab node`);
    tabs[tabId] = {
      nodes: [makeNode(tab.url || tab.pendingUrl || `Loading...`)],
      edges: [],
    };
  }
  if (openerTabId && tabId) {
    console.log(`New tab edge`);
    const openerNodes = tabs[openerTabId].nodes;
    const newTabNodes = tabs[tabId].nodes;
    tabConnections.push({
      from: openerNodes[openerNodes.length - 1].id,
      to: newTabNodes[newTabNodes.length - 1].id,
    });
  }
  redraw();
});
