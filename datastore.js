export class Datastore {

  constructor(canCache) {
    this.id = { id: 0 };
    this.tabs = {};
    this.tabConnections = [];
    this.loaded = false;
    this.tabUpdated = {};
    this.favicons = {};
    this.storage = chrome.storage.local;
    this.canCache = canCache;
  }

  _data() {
    return {
      id: this.id,
      tabs: this.tabs,
      tabConnections: this.tabConnections,
      tabUpdated: this.tabUpdated,
      favicons: this.favicons,
    };
  }

  data() {
    return new Promise(res => {
      if (!this.loaded) {
        this.storage.get(['id', 'tabs', 'tabConnections', 'tabUpdated', 'favicons'], (result) => {
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
          if (result.favicons) {
            this.favicons = result.favicons;
          }
          if (this.canCache) {
            this.loaded = true;
          }
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
      this.storage.set(newData, () => {
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
    this.favicons = {};
    await this.save();
  }
}
