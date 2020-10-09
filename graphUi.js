import { Datastore } from './datastore.js';

console.log(`graph ui alive`);

const datastore = new Datastore(false);
let savedView = { sacle: 1, position: { x: 0, y: 0 } };
let filterIndex = 0;
let nodeList = [];
let nodesMatchingFilter = [];

document.getElementById('filterNext').addEventListener('click', (e) => {
  filterIndex = (filterIndex + 1) % nodesMatchingFilter.length;
  findAndFit();
});

const findAndFit = () => {
  if (network.getScale() != 1) {
    network.moveTo({
      scale: 1,
    });
  }
  const filterText = document.getElementById("filter").value;
  //todo case insensitive
  nodesMatchingFilter = nodeList.filter(item => item.url.includes(filterText) || item.label.includes(filterText)) || [];
  const ids = nodesMatchingFilter.map(item => item.id);
  console.log(nodesMatchingFilter.map(item => item.url));
  if (ids.length) {
    network.fit({
      nodes: [ids[filterIndex]],
      animation: {
        duration: 200,
      },
    });
  }
}

document.getElementById("filter").addEventListener('input', (e) => {
  filterIndex = 0;
  findAndFit();
});

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
    brokenImage: chrome.extension.getURL('icon128.png'),
  },
  physics: {
    enabled: false,
  },
};

let network = new vis.Network(container, {}, options);

const ellipsize = (string) => string.length >= 100 ? string.substring(0, 99) + "..." : string;

const redraw = (tabs, tabConnections, favicons) => {
  nodeList = Object.entries(tabs)
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
  const newSavedView = {
    scale,
    position,
  };
  if (newSavedView.scale != 1 || newSavedView.position.x != 0 || newSavedView.position.y != 0) {
    savedView = newSavedView;
    console.log(`saved`, newSavedView);
  }
  network.destroy();
  network = new vis.Network(container, data, options);
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
};

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  // console.log(`onMessage`, request);
  if (request.type === "RES_GET_GRAPH") {
    const data = await datastore.data();
    redraw(data.tabs, data.tabConnections, data.favicons);
  }
});

chrome.runtime.sendMessage({ type: "REQ_GET_GRAPH" });

console.log(`sent req get graph`);

document.getElementById("reset").addEventListener("click", (e) => {
  chrome.runtime.sendMessage({ type: "RESET" });
});
