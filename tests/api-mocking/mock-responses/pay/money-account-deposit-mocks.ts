import type { Mockttp } from 'mockttp';

export async function mockMoneyAccountApis(mockServer: Mockttp) {
  await mockServer
    .forGet('/proxy')
    .asPriority(1001)
    .matching((request) => {
      const url = new URL(request.url).searchParams.get('url') || '';
      return url.includes('money.api.cx.metamask.io/v1/positions');
    })
    .thenCallback(() => ({
      statusCode: 200,
      json: { positions: [] },
    }));
}
