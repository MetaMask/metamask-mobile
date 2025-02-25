// eslint-disable-next-line import/no-nodejs-modules, import/no-commonjs, @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
import { EventEmitter } from 'events';
import { Port } from './types';

class RemotePort extends EventEmitter implements Port {
  sendMessage: (params: unknown) => void;

  constructor(sendMessage: (params: unknown) => void) {
    super();
    this.sendMessage = sendMessage;
  }

  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  postMessage = (msg: any) => {
    this.sendMessage(msg);
  };
}

export default RemotePort;
