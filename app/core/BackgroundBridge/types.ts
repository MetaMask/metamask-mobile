// eslint-disable-next-line import/no-nodejs-modules
import EventEmitter from 'events';

/**
 * Type for the port object used in the background bridge.
 */
export type Port = EventEmitter & {
  postMessage: (msg: unknown, origin?: string) => void;
  name?: string;
};
