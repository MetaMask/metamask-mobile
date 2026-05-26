import React from 'react';
import {
  type TransactionMeta,
  TransactionStatus,
  TransactionType,
  CHAIN_IDS,
} from '@metamask/transaction-controller';
import { merge } from 'lodash';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { useTransactionDetails } from '../../../../Views/confirmations/hooks/activity/useTransactionDetails';
import { otherControllersMock } from '../../../../Views/confirmations/__mocks__/controllers/other-controllers-mock';
import { MUSD_TOKEN_ADDRESS } from '../../../Earn/constants/musd';
import { MoneyReceivedDetails } from './MoneyReceivedDetails';

jest.mock(
  '../../../../Views/confirmations/hooks/activity/useTransactionDetails',
);
jest.mock(
  '../../../../Views/confirmations/components/activity/transaction-details-status-row',
  () => ({
    TransactionDetailsStatusRow: jest.fn(() => null),
  }),
);
jest.mock(
  '../../../../Views/confirmations/components/activity/transaction-details-date-row',
  () => ({
    TransactionDetailsDateRow: jest.fn(() => null),
  }),
);
jest.mock('../../../Name/Name', () => {
  const { Text } = jest.requireActual('react-native');
  // eslint-disable-next-line react/display-name
  return ({ value }: { value: string }) => (
    <Text testID="name-mock">{value}</Text>
  );
});
jest.mock('../../../../Views/confirmations/components/token-icon', () => ({
  TokenIcon: () => null,
  TokenIconVariant: { Row: 'row' },
}));

const FROM_MOCK = '0x1111111111111111111111111111111111111111';
const RECIPIENT_MOCK = '0x2222222222222222222222222222222222222222';

const baseTransactionMeta = {
  id: 'tx-1',
  chainId: CHAIN_IDS.MONAD,
  status: TransactionStatus.confirmed,
  time: Date.UTC(2026, 4, 21, 14, 16),
  type: TransactionType.incoming,
  txParams: {
    from: FROM_MOCK,
    to: RECIPIENT_MOCK,
  },
  transferInformation: {
    contractAddress: MUSD_TOKEN_ADDRESS,
    decimals: 6,
    symbol: 'mUSD',
    amount: '500000',
  },
} as unknown as TransactionMeta;

function render(overrides: Partial<TransactionMeta> = {}) {
  const useTransactionDetailsMock = jest.mocked(useTransactionDetails);
  useTransactionDetailsMock.mockReturnValue({
    transactionMeta: {
      ...baseTransactionMeta,
      ...overrides,
    } as TransactionMeta,
  });
  return renderWithProvider(<MoneyReceivedDetails />, {
    state: merge({}, otherControllersMock),
  });
}

describe('MoneyReceivedDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the From row with the sender address for an incoming transfer', () => {
    const { getByTestId } = render();
    expect(getByTestId('name-mock').props.children).toBe(FROM_MOCK);
  });

  it('renders the token received label with the mUSD symbol', () => {
    const { getByText } = render();
    expect(getByText('Token received')).toBeTruthy();
    expect(getByText('mUSD')).toBeTruthy();
  });

  it('renders the fiat hero when buildMoneyActivityFiatLine returns a value', () => {
    const { queryByTestId } = render();
    expect(queryByTestId('money-received-hero')).toBeTruthy();
  });

  it('omits the From row when txParams.from is missing', () => {
    const { queryByTestId, queryByText } = render({
      txParams: { to: RECIPIENT_MOCK } as TransactionMeta['txParams'],
    });
    expect(queryByText('From')).toBeNull();
    expect(queryByTestId('name-mock')).toBeNull();
  });

  it('omits the token received row when no mUSD transfer meta can be resolved', () => {
    const { queryByText } = render({
      transferInformation: undefined,
      txParams: {
        from: FROM_MOCK,
        to: RECIPIENT_MOCK,
        data: '0x',
      } as TransactionMeta['txParams'],
    });
    expect(queryByText('Token received')).toBeNull();
  });
});
