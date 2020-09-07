'use strict';

const DEBUG = true;

class Datastore {

  constructor() {
    this.id = { id: 0 };
    this.tabs = {};
    this.tabConnections = [];
    this.loaded = false;
    this.tabUpdated = {};
  }

  _data() {
    return {
      id: this.id,
      tabs: this.tabs,
      tabConnections: this.tabConnections,
      tabUpdated: this.tabUpdated,
    };
  }

  data() {
    return new Promise(res => {
      if (!this.loaded) {
        chrome.storage.local.get(['id', 'tabs', 'tabConnections', 'tabUpdated'], (result) => {
          console.log(`data initialized as`, result);
          if (result.id) {
            this.id = result.id;
          }
          if (result.tabs) {
            this.tabs = result.tabs;
          }
          if (result.tabConnections) {
            this.tabConnections = result.tabConnections;
          }
          if (result.tabUpdated) {
            this.tabUpdated = result.tabUpdated;
          }
          this.loaded = true;
          res(this._data());
        });
      } else {
        res(this._data());
      }
    });
  };

  save() {
    const newData = this._data();
    return new Promise(res => {
      chrome.storage.local.set(newData, () => {
        console.log(`Saved data as`, newData);
        res();
      });
    });
  }

  async reset() {
    this.id = { id: 0 };
    this.tabs = {};
    this.tabConnections = [];
    this.tabUpdated = {};
    await this.save();
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

const makeNode = async (label, url) => {
  let data = await datastore.data();
  const newNode = { "id": data.id.id, label, url };
  data.id.id += 1;
  return newNode;
};

chrome.commands.onCommand.addListener(command => {
  if (command === "show-tree") {
    chrome.tabs.create({ url: chrome.extension.getURL('graph_ui.html') });
  }
});

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  const tabId = sender.tab.id;
  console.log(`${tabId} message ${request.type}`);
  if (request.type === "REQ_GET_GRAPH") {
    redraw();
  }
  if (request.type === "RESET") {
    await datastore.reset();
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
      nodes: [await makeNode(`New tab`, "chrome://newtab")], //TODO: newtab can't be launched from js?
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

const addNodeToExistingTabTree = async (data, tabId, title, url) => {
  const nodes = data.tabs[tabId].nodes;
  const edges = data.tabs[tabId].edges;
  nodes.push(await makeNode(title, url));
  const lastNode = nodes[nodes.length - 2];
  if (lastNode) {
    edges.push({ from: lastNode.id, to: data.id.id - 1 });
  }
};

chrome.history.onVisited.addListener(async historyItem => {
  console.log(`History onVisited`, historyItem);
  let data = await datastore.data();
  const tabId = data.tabUpdated[historyItem.url]
  if (!data.tabs[tabId]) {
    console.log(`Making first node for tabId ${tabId} in history.onVisisted`);
    data.tabs[tabId] = {
      nodes: [await makeNode(`${historyItem.title}`, `${historyItem.url}`)],
      edges: [],
    };
  } else {
    console.log(`Existing node(s) found for tabId ${tabId} in history.onVisited`);
    await addNodeToExistingTabTree(data, tabId, historyItem.title, historyItem.url);
  }
  redraw();
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  console.log(`onUpdated`, changeInfo);
  if (changeInfo.url || changeInfo.title) {
    console.log(`${tabId} updated Url ${changeInfo.url} title ${changeInfo.title}`);
    let data = await datastore.data();
    if (changeInfo.url) {
      data.tabUpdated[changeInfo.url] = tabId; //this does not work if multiple tabs visit the same url before the history listener fires to consume this assignment
    }
    if (changeInfo.title) {
      //TODO restrict this to title updates after onVisited
      console.log(`onupdated tabs at tab id ${tabId}`, data.tabs[tabId]);
      if (data.tabs[tabId]) {
        const nodes = data.tabs[tabId].nodes;
        nodes[nodes.length - 1].label = changeInfo.title;
      }
    }
    redraw();
  }
});
