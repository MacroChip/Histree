'use strict';

const DEBUG = true;

const datastore = class {
  let id = 0;
  let tabs = {};
  let tabConnections = [];
  let loaded = false;

  data() {
    return new Promise(res => {
      if (!loaded) {
        chrome.storage.local.get(['id', 'tabs', 'tabConnections'], function(result) {
          console.log(`data initialized as ${JSON.stringify(result, null, 2)}`);
          if (result.id) {
            id = result.id;
          }
          if (result.tabs) {
            tabs = result.tabs;
          }
          if (result.tabConnections) {
            tabConnections = result.tabConnections;
          }
        });
      }
      res({
        id,
        tabs,
        tabConnections,
      });
    });
  };
};

const redraw = async () => {
  let data = await datastore.data();
  chrome.extension.sendMessage({
    type: 'RES_GET_GRAPH',
    data: {
      tabs: data.tabs,
      tabConnections: data.tabConnections,
    },
  });
}

const makeNode = (label) => {
  return new Promise(res => {
    const newNode = { id, label };
    id += 1;
    chrome.storage.local.set({'id': id}, function() {
      console.log(`id saved as ${id}`);
      res(newNode);
    });
  });
};

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  const tabId = sender.tab.id;
  console.log(`${tabId} message ${request.type}`);
  if (request.type === "NEW_PAGE") {
    if (!tabs[tabId]) { //if the addon wasn't up when the new tab listener fired
      console.log(`new tab from content script at ${Date.now()}`);
      tabs[tabId] = {
        nodes: [await makeNode(request.href)],
        edges: [],
      };
    } else {
      console.log(`${tabId} clicked ${request.href} at ${Date.now()}`);
      const nodes = tabs[tabId].nodes;
      const edges = tabs[tabId].edges;
      nodes.push(await makeNode(request.href));
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
  if (request.type === "RESET") {
    id = 0;
    tabs = {};
    tabConnections = [];
    redraw();
  }
});

chrome.tabs.onCreated.addListener(async (tab) => {
  const openerTabId = tab.openerTabId;
  const tabId = tab.id;
  console.log(`Tab ${tabId} opened by ${openerTabId} at ${Date.now()}`);
  if (!tabs[tabId]) {
    console.log(`New tab node`);
    tabs[tabId] = {
      nodes: [await makeNode(`New tab`)],
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
