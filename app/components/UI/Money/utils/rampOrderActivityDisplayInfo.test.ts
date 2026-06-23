import { type RampsOrder, RampsOrderStatus } from '@metamask/ramps-controller';
import { IconName } from '@metamask/design-system-react-native';
import { rampOrderActivityDisplayInfo } from './rampOrderActivityDisplayInfo';

describe('rampOrderActivityDisplayInfo', () => {
  it('formats a completed Money funding order as a confirmed deposit', () => {
    const order = {
      providerOrderId: 'order-1',
      status: RampsOrderStatus.Completed,
      provider: { name: 'Transak' },
      paymentMethod: { name: 'Apple Pay' },
      cryptoAmount: '4.96',
      cryptoCurrency: { symbol: 'MUSD' },
      fiatAmount: 6.14,
      fiatCurrency: { symbol: 'USD' },
    } as RampsOrder;

    expect(rampOrderActivityDisplayInfo(order)).toEqual({
      label: 'Deposited',
      description: 'Apple Pay',
      primaryAmount: '+4.96 mUSD',
      fiatAmount: '+$6.14',
      isIncoming: true,
      icon: IconName.Add,
      status: 'confirmed',
    });
  });

  it('formats pending orders with the pending label and status', () => {
    const order = {
      providerOrderId: 'order-1',
      status: RampsOrderStatus.Pending,
      provider: { name: 'Transak' },
      cryptoAmount: '4.96',
      cryptoCurrency: { symbol: 'MUSD' },
      fiatAmount: 6.14,
      fiatCurrency: { symbol: 'USD' },
    } as RampsOrder;

    expect(rampOrderActivityDisplayInfo(order)).toMatchObject({
      label: 'Depositing',
      description: 'Transak',
      status: 'pending',
    });
  });

  it('formats failed orders with string payment methods and invalid amounts', () => {
    const order = {
      providerOrderId: 'order-1',
      status: RampsOrderStatus.Failed,
      provider: { name: 'Transak' },
      paymentMethod: 'Wire transfer',
      cryptoAmount: 'invalid',
      fiatAmount: 'invalid',
      fiatCurrency: { symbol: 'USD' },
    } as unknown as RampsOrder;

    expect(rampOrderActivityDisplayInfo(order)).toMatchObject({
      label: 'Deposit failed',
      description: 'Wire transfer',
      primaryAmount: '',
      fiatAmount: '',
      status: 'failed',
    });
  });
});
