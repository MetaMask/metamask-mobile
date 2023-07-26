// eslint-disable-next-line import/no-nodejs-modules, import/no-commonjs, @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
const EventEmitter = require('events').EventEmitter;

class AndroidServicePort extends EventEmitter {
  constructor() {
    super();
  }

  postMessage = (msg: any) => {};
}

export default AndroidServicePort;
