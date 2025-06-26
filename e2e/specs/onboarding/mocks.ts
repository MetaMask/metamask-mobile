interface MockData {
    urlEndpoint: string;
    responseCode: number;
    response: any;
}

const getDecodedProxiedURL = (url: string) =>
    decodeURIComponent(String(new URL(url).searchParams.get('url')));
  
  export const applyMock = (mockServer: any, mockData: MockData[] = []) => {
    for (const mock of mockData) {
      mockServer
        .forGet()
        .matching((request: any) => {
          const url = getDecodedProxiedURL(request.url);
          return url.includes(mock.urlEndpoint);
        }).thenCallback(() => ({
          statusCode: mock.responseCode,
          json: mock.response,
        }));
    }
  };