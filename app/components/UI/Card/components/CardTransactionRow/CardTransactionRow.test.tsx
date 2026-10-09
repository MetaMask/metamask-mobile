import React from 'react';
import { render } from '@testing-library/react-native';
import { IconName } from '@metamask/design-system-react-native';
import {
  CardTransactionStatus,
  CardTransactionType,
  type CardTransaction,
} from '../../../../../core/Engine/controllers/card-controller/provider-types';
import CardTransactionRow from './CardTransactionRow';

const mockRowView = jest.fn((_props: unknown) => null);
jest.mock(
  '../../../Money/components/MoneyActivityItem/ActivityRowView',
  () => ({
    __esModule: true,
    default: (props: unknown) => mockRowView(props),
  }),
);

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
  default: { locale: 'en-US' },
}));

jest.mock('../../../../../util/intl', () => ({
  getIntlDateTimeFormatter: () => ({
    format: () => '15 Jan',
  }),
  getIntlNumberFormatter: () => ({
    format: (value: number) => `$${value.toFixed(2)}`,
  }),
}));

function createTransaction(
  overrides: Partial<CardTransaction> = {},
): CardTransaction {
  return {
    id: 'tx-1',
    providerId: 'baanx',
    timestamp: Date.now(),
    status: CardTransactionStatus.Completed,
    type: CardTransactionType.Purchase,
    isDebit: true,
    billingAmount: { value: '10.00', currency: 'USD' },
    merchant: { name: 'Coffee Shop' },
    fundingSources: [],
    ...overrides,
  };
}

interface CapturedRowProps {
  id: string;
  privacyMode?: boolean;
  onPress?: () => void;
  display: {
    label: string;
    description?: string;
    icon: IconName;
    primaryAmount: string;
  };
}

const lastRowProps = () =>
  mockRowView.mock.calls[0][0] as unknown as CapturedRowProps;

describe('CardTransactionRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps the card transaction into ActivityRowView display props', () => {
    render(<CardTransactionRow transaction={createTransaction()} />);

    const props = lastRowProps();
    expect(props.id).toBe('tx-1');
    expect(props.display.label).toBe('money.transaction.purchase');
    expect(props.display.description).toBe('Coffee Shop');
    expect(props.display.icon).toBe(IconName.Card);
    expect(props.display.primaryAmount).toBe('-$10.00');
    expect(props.onPress).toBeUndefined();
    expect(props.privacyMode).toBeUndefined();
  });

  it('forwards privacyMode to ActivityRowView', () => {
    render(
      <CardTransactionRow transaction={createTransaction()} privacyMode />,
    );

    expect(lastRowProps().privacyMode).toBe(true);
  });

  it('invokes onPress with the transaction when the row is pressed', () => {
    const onPress = jest.fn();
    const transaction = createTransaction();

    render(<CardTransactionRow transaction={transaction} onPress={onPress} />);
    lastRowProps().onPress?.();

    expect(onPress).toHaveBeenCalledWith(transaction);
  });
});
