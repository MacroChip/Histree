'use strict';

import { Datastore } from './datastore.js';

const datastore = new Datastore(chrome.storage.local);

const redraw = async () => {
  datastore.save();
  let data = await datastore.data();
  chrome.extension.sendMessage({
    type: 'RES_GET_GRAPH',
    data: {
      tabs: data.tabs,
      tabConnections: data.tabConnections,
      favicons: data.favicons,
    },
  });
}

const makeNode = async (label, url, lastVisitTime) => {
  let data = await datastore.data();
  const newNode = { "id": data.id.id, label, url, lastVisitTime };
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
      nodes: [await makeNode(`New tab`, "chrome://newtab", Date.now())], //TODO: newtab can't be launched from js?
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

const addNodeToExistingTabTree = async (data, tabId, title, url, lastVisitTime) => {
  const nodes = data.tabs[tabId].nodes;
  const edges = data.tabs[tabId].edges;
  nodes.push(await makeNode(title, url, lastVisitTime));
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
      nodes: [await makeNode(historyItem.title, historyItem.url, historyItem.lastVisitTime)],
      edges: [],
    };
  } else {
    console.log(`Existing node(s) found for tabId ${tabId} in history.onVisited`);
    await addNodeToExistingTabTree(data, tabId, historyItem.title, historyItem.url, historyItem.lastVisitTime);
  }
  redraw();
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  console.log(`onUpdated`, changeInfo, tab);
  if (changeInfo.url || changeInfo.title || changeInfo.favIconUrl) {
    console.log(`${tabId} updated Url ${changeInfo.url} title ${changeInfo.title}`);
    let data = await datastore.data();
    if (changeInfo.url) {
      data.tabUpdated[changeInfo.url] = tabId; //this does not work if multiple tabs visit the same url before the history listener fires to consume this assignment
    }
    if (changeInfo.title) {
      //TODO restrict this to title updates after onVisited
      console.log(`onupdated title at tabId ${tabId}`, data.tabs[tabId]);
      if (data.tabs[tabId]) {
        const nodes = data.tabs[tabId].nodes;
        nodes[nodes.length - 1].label = changeInfo.title;
      }
    }
    if (changeInfo.favIconUrl) {
      data.favicons[tab.url] = tab.favIconUrl;
    }
    redraw();
  }
});
