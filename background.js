'use strict';

const DEBUG = true;

var id = 0;

const tabs = {};
const tabConnections = [];

const redraw = () => {
  chrome.extension.sendMessage({
    type: 'RES_GET_GRAPH',
    data: {
      tabs,
      tabConnections,
    },
  });
}

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
  if (request.type === "REQ_GET_GRAPH") {
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
      nodes: [makeNode(`New tab`)],
      edges: [],
    };
  }
  if (openerTabId && tabId) {
    if (!tabs[openerTabId]) {
      console.log(`No data for ${openerTabId}. Perhaps the tab was already open before the extension was loaded`);
      return;
    }
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
