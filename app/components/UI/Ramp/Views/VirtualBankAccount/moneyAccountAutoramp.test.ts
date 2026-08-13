import { buildMoneyAccountAutorampParams } from './moneyAccountAutoramp';
import {
  DEMO_AUTORAMP_DESTINATION_BLOCKCHAIN,
  DEMO_AUTORAMP_DESTINATION_TOKEN,
  DEMO_AUTORAMP_SOURCE_CURRENCY_CODE,
} from './constants';

describe('buildMoneyAccountAutorampParams', () => {
  it('builds the demo autoramp request routed to the given address', () => {
    const address = '0xabc';

    const params = buildMoneyAccountAutorampParams(address);

    expect(params).toStrictEqual({
      source_currencies: [
        { type: 'Fiat', code: DEMO_AUTORAMP_SOURCE_CURRENCY_CODE },
      ],
      destination_currency: {
        type: 'Crypto',
        token: DEMO_AUTORAMP_DESTINATION_TOKEN,
        blockchain: DEMO_AUTORAMP_DESTINATION_BLOCKCHAIN,
      },
      recipient_account: {
        type: 'Crypto',
        chain: DEMO_AUTORAMP_DESTINATION_BLOCKCHAIN,
        address,
      },
      source_is_third_party: false,
    });
  });
});
