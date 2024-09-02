'use strict';

// eslint-disable-next-line import/no-nodejs-modules
import { EventEmitter } from 'events';
const hub = new EventEmitter();

type DrawerStatus = 'open' | 'closed';

class DrawerStatusTracker {
  open = false;
  setStatus(status: DrawerStatus): void {
    if (status === 'open') {
      this.open = true;
    } else {
      this.open = false;
    }

    hub.emit(`drawer::${status}`);
  }
}

let instance: DrawerStatusTracker | null = null;

const SharedDrawerStatusTracker = {
  init: (): void => {
    instance = new DrawerStatusTracker();
  },
  setStatus: (status: DrawerStatus): void => {
    if (instance) {
      instance.setStatus(status);
    }
  },
  getStatus: (): DrawerStatus => (instance?.open ? 'open' : 'closed'),
  hub,
};

export default SharedDrawerStatusTracker;
