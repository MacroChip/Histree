console.log(`graph ui alive`);

let tabs;
let tabConnections;

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

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log(`onMessage ${JSON.stringify(request, null, 2)}`);
  if (request.type === "RES_GET_GRAPH") {
    tabs = request.data.tabs;
    tabConnections = request.data.tabConnections;
    redraw();
  }
});

chrome.runtime.sendMessage({ type: "REQ_GET_GRAPH" });

console.log(`sent req get graph`);
