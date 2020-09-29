console.log(`graph ui alive`);

const container = document.getElementById("mynetwork");
const options = {
  layout: {
    hierarchical: {
      nodeSpacing: 300,
    },
  },
  interaction: {
    hover: true,
  },
  nodes: {
    font: {
      background: '#D2E5FF',
    },
  },
};

let network = new vis.Network(container, {}, options);

const ellipsize = (string) => string.length >= 100 ? string.substring(0, 99) + "..." : string;

const redraw = (tabs, tabConnections, favicons) => {
  const nodeList = Object.entries(tabs)
    .map(([key, value]) => value.nodes)
    .flat()
    .map(item => ({
      ...item,
      label: `${ellipsize(item.label)}\n${new Date(item.lastVisitTime).toLocaleString()}`,
      title: item.url,
      shape: 'image',
      image: favicons[item.url] || chrome.extension.getURL('icon128.png'),
      widthConstraint: 275,
    }));
  const data = {
    nodes: new vis.DataSet(nodeList),
    edges: new vis.DataSet(
      Object.entries(tabs)
        .map(([key, value]) => value.edges)
        .concat(tabConnections)
        .flat()
    ),
  };
  const scale = network.getScale();
  const position = network.getViewPosition();
  const savedView = {
    scale,
    position,
  };
  network = new vis.Network(container, data, options);
  console.log(`Queuing`, savedView, new Date().toLocaleString());
  // network.off('stabilized');
  network.once('afterDrawing', () => {
    network.moveTo(savedView);
    console.log(`moveTo`, savedView, new Date().toLocaleString());
  });
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
    redraw(request.data.tabs, request.data.tabConnections, request.data.favicons);
  }
});

chrome.runtime.sendMessage({ type: "REQ_GET_GRAPH" });

console.log(`sent req get graph`);

document.getElementById("reset").addEventListener("click", (e) => {
  chrome.runtime.sendMessage({ type: "RESET" });
});