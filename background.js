'use strict';

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

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  console.log(`${tabId} updated to ${JSON.stringify(changeInfo, null, 2)} changeinfo and tab ${JSON.stringify(tab, null, 2)}`);
  if (changeInfo.status === "complete") {
    if (!tabs[tabId]) { //if the addon wasn't up when the new tab listener fired
      console.log(`new tab at ${Date.now()}`);
      tabs[tabId] = {
        nodes: [makeNode(tab.url)],
        edges: [],
      };
    } else {
      console.log(`${tabId} clicked ${tab.url} at ${Date.now()}`);
      const nodes = tabs[tabId].nodes;
      const edges = tabs[tabId].edges;
      nodes.push(makeNode(tab.url));
      const lastNode = nodes[nodes.length - 2];
      if (lastNode) {
        edges.push({ from: lastNode.id, to: id - 1 });
      }
    }
    redraw();
  }
});
