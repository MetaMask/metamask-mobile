declare module 'nock' {
  interface NockScope {
    get(path: string): NockScope;
    query(queries: object | boolean): NockScope;
    reply(
      statusCode: number,
      body?:
        | object
        | unknown[]
        | ((uri: string, requestBody?: string) => object | unknown[]),
    ): NockScope;
    persist(): NockScope;
  }

  interface Nock {
    cleanAll(): void;
    disableNetConnect(): void;
    enableNetConnect(): void;
    (basePath: string): NockScope;
  }

  const nock: Nock;
  export default nock;
}
