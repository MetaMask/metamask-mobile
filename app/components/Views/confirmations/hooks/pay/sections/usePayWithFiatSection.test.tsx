import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { useNavigation } from '@react-navigation/native';
import PaymentMethodIcon from '../../../../../UI/Ramp/Aggregator/components/PaymentMethodIcon';
import { HighlightedItem } from '../../../types/token';
import { useFiatPaymentHighlightedActions } from '../useFiatPaymentHighlightedActions';
import { usePayWithFiatSection } from './usePayWithFiatSection';

jest.mock('../useFiatPaymentHighlightedActions');
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn().mockReturnValue(undefined),
}));
jest.mock('../../transactions/useTransactionMetadataRequest', () => ({
  useTransactionMetadataRequest: jest.fn().mockReturnValue(undefined),
}));
jest.mock('../../../../../../core/Engine', () => ({
  context: {
    TransactionPayController: {
      setTransactionConfig: jest.fn(),
    },
  },
}));
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));
jest.mock(
  '../../../../../UI/Ramp/Aggregator/components/PaymentMethodIcon',
  () => jest.fn(() => null),
);
jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const translations: Record<string, string> = {
      'confirm.pay_with_bottom_sheet.bank_and_card': 'Bank and card',
    };
    return translations[key] ?? key;
  },
}));

const ACTION_MOCK = jest.fn();

const CARD_ITEM_MOCK: HighlightedItem = {
  position: 'outside_of_asset_list',
  icon: 'card-icon',
  paymentType: 'debit-credit-card',
  name: 'Credit Card',
  name_description: '~3 min',
  action: ACTION_MOCK,
  isSelected: false,
};

const APPLE_PAY_ITEM_MOCK: HighlightedItem = {
  position: 'outside_of_asset_list',
  icon: 'apple-icon',
  paymentType: 'apple-pay',
  name: 'Apple Pay',
  name_description: '~3 min',
  action: jest.fn(),
  isSelected: false,
};

describe('usePayWithFiatSection', () => {
  const useFiatPaymentHighlightedActionsMock = jest.mocked(
    useFiatPaymentHighlightedActions,
  );
  const useNavigationMock = jest.mocked(useNavigation);
  const goBackMock = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();
    useFiatPaymentHighlightedActionsMock.mockReturnValue([]);
    useNavigationMock.mockReturnValue({
      goBack: goBackMock,
    } as never);
  });

  it('returns null when there are no fiat payment methods', () => {
    const { result } = renderHook(() => usePayWithFiatSection());

    expect(result.current).toBeNull();
  });

  it('returns a section config with id, title, and testID when items are available', () => {
    useFiatPaymentHighlightedActionsMock.mockReturnValue([CARD_ITEM_MOCK]);

    const { result } = renderHook(() => usePayWithFiatSection());

    expect(result.current).toMatchObject({
      id: 'bank-card',
      title: 'Bank and card',
      testID: 'pay-with-section-bank-card',
    });
  });

  it('maps each fiat highlighted item to a row preserving title, subtitle, and selected state', () => {
    useFiatPaymentHighlightedActionsMock.mockReturnValue([
      CARD_ITEM_MOCK,
      APPLE_PAY_ITEM_MOCK,
    ]);

    const { result } = renderHook(() => usePayWithFiatSection());

    expect(result.current?.rows).toHaveLength(2);
    expect(result.current?.rows[0]).toMatchObject({
      id: 'pay-with-fiat-debit-credit-card',
      title: 'Credit Card',
      subtitle: '~3 min',
      isSelected: false,
      isLastUsed: false,
      trailingElement: 'none',
      testID: 'pay-with-fiat-debit-credit-card-row',
    });
    expect(result.current?.rows[1]).toMatchObject({
      id: 'pay-with-fiat-apple-pay',
      title: 'Apple Pay',
      subtitle: '~3 min',
      isSelected: false,
      trailingElement: 'none',
    });
  });

  it('renders the row icon via PaymentMethodIcon with paymentType cast to PaymentType and a themed icon color', () => {
    useFiatPaymentHighlightedActionsMock.mockReturnValue([CARD_ITEM_MOCK]);

    const { result } = renderHook(() => usePayWithFiatSection());

    const row = result.current?.rows[0];
    expect(React.isValidElement(row?.icon)).toBe(true);
    const iconElement = row?.icon as React.ReactElement<{
      paymentMethodType?: string;
      color?: string;
    }>;
    expect(iconElement.type).toBe(PaymentMethodIcon);
    expect(iconElement.props).toMatchObject({
      paymentMethodType: 'debit-credit-card',
    });
    expect(typeof iconElement.props.color).toBe('string');
  });

  it('omits paymentMethodType on the icon when the highlighted item has no paymentType', () => {
    useFiatPaymentHighlightedActionsMock.mockReturnValue([
      { ...CARD_ITEM_MOCK, paymentType: undefined },
    ]);

    const { result } = renderHook(() => usePayWithFiatSection());

    const row = result.current?.rows[0];
    const iconElement = row?.icon as React.ReactElement<{
      paymentMethodType?: string;
    }>;
    expect(iconElement.props.paymentMethodType).toBeUndefined();
  });

  it('falls back to the item name when paymentType is missing for the row id', () => {
    useFiatPaymentHighlightedActionsMock.mockReturnValue([
      { ...CARD_ITEM_MOCK, paymentType: undefined, name: 'Wallet' },
    ]);

    const { result } = renderHook(() => usePayWithFiatSection());

    expect(result.current?.rows[0]).toMatchObject({
      id: 'pay-with-fiat-Wallet',
      testID: 'pay-with-fiat-Wallet-row',
    });
  });

  it('sets trailingElement to checkmark when the row is selected', () => {
    useFiatPaymentHighlightedActionsMock.mockReturnValue([
      { ...CARD_ITEM_MOCK, isSelected: true },
    ]);

    const { result } = renderHook(() => usePayWithFiatSection());

    expect(result.current?.rows[0]).toMatchObject({
      isSelected: true,
      trailingElement: 'checkmark',
    });
  });

  it('treats undefined isSelected as not selected', () => {
    useFiatPaymentHighlightedActionsMock.mockReturnValue([
      { ...CARD_ITEM_MOCK, isSelected: undefined },
    ]);

    const { result } = renderHook(() => usePayWithFiatSection());

    expect(result.current?.rows[0]).toMatchObject({
      isSelected: false,
      trailingElement: 'none',
    });
  });

  it('wires onPress on an unselected row to the highlighted item action callback', () => {
    useFiatPaymentHighlightedActionsMock.mockReturnValue([CARD_ITEM_MOCK]);

    const { result } = renderHook(() => usePayWithFiatSection());

    result.current?.rows[0].onPress?.();

    expect(ACTION_MOCK).toHaveBeenCalledTimes(1);
    expect(goBackMock).not.toHaveBeenCalled();
  });

  it('dismisses without re-invoking action when tapping an already-selected row', () => {
    useFiatPaymentHighlightedActionsMock.mockReturnValue([
      { ...CARD_ITEM_MOCK, isSelected: true },
    ]);

    const { result } = renderHook(() => usePayWithFiatSection());

    result.current?.rows[0].onPress?.();

    expect(goBackMock).toHaveBeenCalledTimes(1);
    expect(ACTION_MOCK).not.toHaveBeenCalled();
  });

  it('hardcodes isLastUsed to false (deferred to Ticket 9)', () => {
    useFiatPaymentHighlightedActionsMock.mockReturnValue([CARD_ITEM_MOCK]);

    const { result } = renderHook(() => usePayWithFiatSection());

    expect(result.current?.rows[0].isLastUsed).toBe(false);
  });

  it('returns a stable section reference across renders when inputs do not change', () => {
    useFiatPaymentHighlightedActionsMock.mockReturnValue([CARD_ITEM_MOCK]);

    const { result, rerender } = renderHook(() => usePayWithFiatSection());
    const first = result.current;

    rerender();

    expect(result.current).toBe(first);
  });
});
