'use strict';

// eslint-disable-next-line import/no-nodejs-modules
import { EventEmitter } from 'events';
const hub = new EventEmitter();

class DrawerStatusTracker {
  open = false;
  setStatus(status) {
    if (status === 'open') {
      this.open = true;
    } else {
      this.open = false;
    }

    hub.emit(`drawer::${status}`);
  }
}

let instance = null;

const SharedDrawerStatusTracker = {
  init: () => {
    instance = new DrawerStatusTracker();
  },
  setStatus: (status) => {
    instance.setStatus(status);
  },
  getStatus: () => (instance.open ? 'open' : 'closed'),
  hub,
};

export default SharedDrawerStatusTracker;
