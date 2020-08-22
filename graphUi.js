console.log(`graph ui alive`);

const redraw = (tabs, tabConnections) => {
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

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log(`onMessage ${JSON.stringify(request, null, 2)}`);
  if (request.type === "RES_GET_GRAPH") {
    redraw(request.data.tabs, request.data.tabConnections);
  }
});

chrome.runtime.sendMessage({ type: "REQ_GET_GRAPH" });

console.log(`sent req get graph`);

document.getElementById("reset").addEventListener("click", (e) => {
  chrome.runtime.sendMessage({ type: "RESET" });
});