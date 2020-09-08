console.log(`graph ui alive`);

const redraw = (tabs, tabConnections) => {
  var container = document.getElementById("mynetwork");
  const nodeList = Object.entries(tabs)
    .map(([key, value]) => value.nodes)
    .flat()
    .map(item => {
      item.label = `${item.label}\n${new Date(item.lastVisitTime).toLocaleString()}`;
      return item;
    });
  var data = {
    nodes: new vis.DataSet(nodeList),
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
    interaction: {
      hover: true,
    },
  };
  var network = new vis.Network(container, data, options);
  network.addEventListener("doubleClick", (e) => {
    console.log(`double clicked ${JSON.stringify(e.nodes, null, 2)}`);
    if (e.nodes[0]) {
      window.open(nodeList.find(node => node.id === e.nodes[0]).url);
    }
  });
  network.addEventListener("hoverNode", e => {
    console.log(`hovered node ${e.node}`);
    console.log(`which is url ${nodeList.find(node => node.id === e.node).url}`);
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log(`onMessage`, request);
  if (request.type === "RES_GET_GRAPH") {
    redraw(request.data.tabs, request.data.tabConnections);
  }
});

chrome.runtime.sendMessage({ type: "REQ_GET_GRAPH" });

console.log(`sent req get graph`);

document.getElementById("reset").addEventListener("click", (e) => {
  chrome.runtime.sendMessage({ type: "RESET" });
});