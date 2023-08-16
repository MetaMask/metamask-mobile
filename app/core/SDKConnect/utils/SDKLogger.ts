/* eslint-disable @typescript-eslint/no-floating-promises */
import Logger from '../../../util/Logger';
export default class SDKLogger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  public debug(msg: string, args?: unknown) {
    // only log in dev mode
    if (__DEV__) {
      if (args) {
        Logger.log(`[${this.context}] ${msg}`, args);
      } else {
        Logger.log(`[${this.context}] ${msg}`);
      }
    }
  }
}
