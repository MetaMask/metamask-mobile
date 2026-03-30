import I18n from '../../../../../locales/i18n';
import {
  __TEST_ONLY__,
  getLocalizedPaymentMethodName,
} from './localizePaymentMethodName';

const makePaymentMethod = (overrides?: {
  id?: string;
  paymentType?: string;
  name?: string;
}) => ({
  id: '/payments/debit-credit-card',
  paymentType: 'debit-credit-card',
  name: 'Debit Card',
  ...overrides,
});

describe('localizePaymentMethodName', () => {
  afterEach(() => {
    I18n.locale = 'en';
    jest.restoreAllMocks();
  });

  it('returns localized debit card label on non-English locales', () => {
    I18n.locale = 'es';
    const stringsSpy = jest
      .spyOn(I18n, 't')
      .mockReturnValue('Tarjeta de débito');

    const label = getLocalizedPaymentMethodName(makePaymentMethod());

    expect(label).toBe('Tarjeta de débito');
    expect(stringsSpy).toHaveBeenCalledWith(
      'fiat_on_ramp.debit_card',
      expect.any(Object),
    );
  });

  it('returns original provider label for English locales', () => {
    I18n.locale = 'en-US';

    const label = getLocalizedPaymentMethodName(
      makePaymentMethod({ name: 'Debit Card' }),
    );

    expect(label).toBe('Debit Card');
  });

  it('returns original label for unknown payment methods', () => {
    I18n.locale = 'es';

    const label = getLocalizedPaymentMethodName(
      makePaymentMethod({
        id: '/payments/apple-pay',
        paymentType: 'apple-pay',
        name: 'Apple Pay',
      }),
    );

    expect(label).toBe('Apple Pay');
  });

  it('detects card methods across mixed separators and casing', () => {
    const paymentMethod = makePaymentMethod({
      id: '/PAYMENTS/CREDIT_DEBIT_CARD',
      paymentType: 'Credit-Debit-Card',
      name: 'Credit or Debit Card',
    });

    expect(__TEST_ONLY__.isCardPaymentMethod(paymentMethod)).toBe(true);
  });
});
