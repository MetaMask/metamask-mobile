import { Messenger } from '@metamask/messenger';
import {
  TransakEnvironment,
  TransakService,
  type TransakServiceMessenger,
} from '@metamask/ramps-controller';

const PAYMENT_METHOD_ONLY_TRANSLATION = { paymentMethod: 'credit_debit_card' };

const FULL_TRANSLATION = {
  paymentMethod: 'credit_debit_card',
  cryptoCurrency: 'USDC',
  network: 'monad',
  fiatCurrency: 'USD',
};

function createFetchReturning(
  body: unknown,
): jest.MockedFunction<typeof fetch> {
  return jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => body,
  });
}

describe('TransakService.getTranslation', () => {
  const services: TransakService[] = [];

  afterEach(() => {
    services.splice(0).forEach((service) => service.destroy());
  });

  function buildService(fetchFunction: typeof fetch): TransakService {
    const messenger: TransakServiceMessenger = new Messenger({
      namespace: 'TransakService',
    });
    const service = new TransakService({
      messenger,
      environment: TransakEnvironment.Staging,
      context: 'mobile-ios',
      fetch: fetchFunction,
    });
    services.push(service);
    return service;
  }

  it('accepts a payment-method-only response for a payment-method-only request', async () => {
    const service = buildService(
      createFetchReturning(PAYMENT_METHOD_ONLY_TRANSLATION),
    );

    const translation = await service.getTranslation({
      paymentMethod: 'credit_debit_card',
    });

    expect(translation).toStrictEqual(PAYMENT_METHOD_ONLY_TRANSLATION);
  });

  it('accepts a full response for a full request', async () => {
    const service = buildService(createFetchReturning(FULL_TRANSLATION));

    const translation = await service.getTranslation({
      cryptoCurrencyId:
        'eip155:143/erc20:0xaca92e438df0b2401ff60da7e4337b687a2435da',
      chainId: 'eip155:143',
      fiatCurrencyId: 'USD',
      paymentMethod: 'credit_debit_card',
    });

    expect(translation).toStrictEqual(FULL_TRANSLATION);
  });
});
