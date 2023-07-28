export default class SDKLogger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  public debug(msg: string, args?: unknown) {
    // eslint-disable-next-line no-console
    console.debug(`${this.context}::${msg}`, args);
  }

  public info(msg: string, args?: unknown) {
    // eslint-disable-next-line no-console
    console.info(`${this.context}::${msg}`, args);
  }
}
