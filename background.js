'use strict';

const DEBUG = true;

class Datastore {

  constructor() {
    this.id = { id: 0 };
    this.tabs = {};
    this.tabConnections = [];
    this.loaded = false;
  }

  data() {
    return new Promise(res => {
      if (!this.loaded) {
        chrome.storage.local.get(['id', 'tabs', 'tabConnections'], (result) => {
          console.log(`data initialized as ${JSON.stringify(result, null, 2)}`);
          if (result.id) {
            this.id = result.id;
          }
          if (result.tabs) {
            this.tabs = result.tabs;
          }
          if (result.tabConnections) {
            this.tabConnections = result.tabConnections;
          }
          this.loaded = true;
          res({
            id: this.id,
            tabs: this.tabs,
            tabConnections: this.tabConnections,
          });
        });
      } else {
        res({
          id: this.id,
          tabs: this.tabs,
          tabConnections: this.tabConnections,
        });
      }
    });
  };

  save() {
    const newData = {
      id: this.id,
      tabs: this.tabs,
      tabConnections: this.tabConnections,
    };
    chrome.storage.local.set(newData, () => {
      console.log(`Saved data as ${JSON.stringify(newData, null, 2)}`);
    });
  }

  reset() {
    this.id = { id: 0 };
    this.tabs = {};
    this.tabConnections = [];
    this.save();
  }
};

const datastore = new Datastore();

const redraw = async () => {
  datastore.save();
  let data = await datastore.data();
  chrome.extension.sendMessage({
    type: 'RES_GET_GRAPH',
    data: {
      tabs: data.tabs,
      tabConnections: data.tabConnections,
    },
  });
}

const makeNode = async (label) => {
  let data = await datastore.data();
  const newNode = { "id": data.id.id, label };
  data.id.id += 1;
  return newNode;
};

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  const tabId = sender.tab.id;
  console.log(`${tabId} message ${request.type}`);
  if (request.type === "NEW_PAGE") {
    let data = await datastore.data();
    if (!data.tabs[tabId]) { //if the addon wasn't up when the new tab listener fired
      console.log(`new tab from content script at ${Date.now()}`);
      data.tabs[tabId] = {
        nodes: [await makeNode(request.href)],
        edges: [],
      };
    } else {
      console.log(`${tabId} clicked ${request.href} at ${Date.now()}`);
      const nodes = data.tabs[tabId].nodes;
      const edges = data.tabs[tabId].edges;
      nodes.push(await makeNode(request.href));
      const lastNode = nodes[nodes.length - 2];
      if (lastNode) {
        edges.push({ from: lastNode.id, to: data.id.id - 1 });
      }
    }
    redraw();
  }
  if (request.type === "REQ_GET_GRAPH") {
    redraw();
  }
  if (request.type === "RESET") {
    datastore.reset();
    redraw();
  }
});

chrome.tabs.onCreated.addListener(async (tab) => {
  const openerTabId = tab.openerTabId;
  const tabId = tab.id;
  console.log(`Tab ${tabId} opened by ${openerTabId} at ${Date.now()}`);
  let data = await datastore.data();
  if (!data.tabs[tabId]) {
    console.log(`New tab node`);
    data.tabs[tabId] = {
      nodes: [await makeNode(`New tab`)],
      edges: [],
    };
  }
  if (openerTabId && tabId) {
    if (!data.tabs[openerTabId]) {
      console.log(`No data for ${openerTabId}. Perhaps the tab was already open before the extension was loaded`);
      return;
    }
    console.log(`New tab edge`);
    const openerNodes = data.tabs[openerTabId].nodes;
    const newTabNodes = data.tabs[tabId].nodes;
    data.tabConnections.push({
      from: openerNodes[openerNodes.length - 1].id,
      to: newTabNodes[newTabNodes.length - 1].id,
    });
  }
  redraw();
});
