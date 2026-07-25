import { buildCrossmintCheckoutUrl } from './buildCheckoutUrl';

jest.mock('./config', () => ({
  getCrossmintBaseUrl: jest.fn(() => 'https://staging.crossmint.com'),
  getCrossmintClientApiKey: jest.fn(() => 'ck_staging_test'),
}));

const { getCrossmintClientApiKey } = jest.requireMock('./config') as {
  getCrossmintClientApiKey: jest.Mock;
};

describe('buildCrossmintCheckoutUrl', () => {
  beforeEach(() => {
    getCrossmintClientApiKey.mockReturnValue('ck_staging_test');
  });

  it('builds a staging embedded checkout URL with Apple Pay only', () => {
    const url = buildCrossmintCheckoutUrl({
      orderId: 'order-1',
      clientSecret: 'secret-1',
    });

    expect(url).toMatchInlineSnapshot(
      `"https://staging.crossmint.com/sdk/2024-03-05/embedded-checkout?orderId=order-1&clientSecret=secret-1&apiKey=ck_staging_test&payment=%7B%22crypto%22%3A%7B%22enabled%22%3Afalse%7D%2C%22fiat%22%3A%7B%22enabled%22%3Atrue%2C%22defaultCurrency%22%3A%22usd%22%2C%22allowedMethods%22%3A%7B%22card%22%3Afalse%2C%22googlePay%22%3Afalse%2C%22applePay%22%3Atrue%7D%7D%2C%22defaultMethod%22%3A%22fiat%22%7D&appearance=%7B%22rules%22%3A%7B%22DestinationInput%22%3A%7B%22display%22%3A%22hidden%22%7D%2C%22ReceiptEmailInput%22%3A%7B%22display%22%3A%22hidden%22%7D%7D%7D"`,
    );
  });

  it('throws when client API key is missing', () => {
    getCrossmintClientApiKey.mockReturnValue('');
    expect(() =>
      buildCrossmintCheckoutUrl({
        orderId: 'order-1',
        clientSecret: 'secret-1',
      }),
    ).toThrow('Missing MM_CROSSMINT_CLIENT_API_KEY');
  });
});
