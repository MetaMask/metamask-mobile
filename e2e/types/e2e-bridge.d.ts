declare global {
  type ElementWrapper =
    | Promise<ChainablePromiseElement | ChainablePromiseArray>
    | DetoxElement;

  type WdioDevice = driver;
}
export {};
