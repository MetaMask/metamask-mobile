import React from 'react';
import {
  TransactionPayQuote,
  TransactionPayStrategy,
} from '@metamask/transaction-pay-controller';
import { Json } from '@metamask/utils';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import {
  useIsTransactionPayLoading,
  useTransactionPayQuotes,
} from '../../../hooks/pay/useTransactionPayData';
import { selectSelectedInternalAccountByScope } from '../../../../../../selectors/multichainAccounts/accounts';
import { EVM_SCOPE } from '../../../../../UI/Earn/constants/networks';
import { RelayYouReceiveRow } from './relay-you-receive-row';

jest.mock('../../../hooks/pay/useTransactionPayData');
jest.mock('../../../../../../selectors/multichainAccounts/accounts');

const RECIPIENT_ADDRESS = '0xabcDEF0000000000000000000000000000000000';

const createRelayQuote = ({
  recipient = RECIPIENT_ADDRESS,
  amountFormatted = '1.23',
  symbol = 'MUSD',
}: {
  recipient?: string;
  amountFormatted?: string;
  symbol?: string;
} = {}) =>
  ({
    strategy: TransactionPayStrategy.Relay,
    original: {
      details: {
        recipient,
        currencyOut: {
          currency: {
            symbol,
            decimals: 6,
          },
          amountFormatted,
        },
      },
    },
  }) as unknown as TransactionPayQuote<Json>;

describe('RelayYouReceiveRow', () => {
  const useIsTransactionPayLoadingMock = jest.mocked(
    useIsTransactionPayLoading,
  );
  const useTransactionPayQuotesMock = jest.mocked(useTransactionPayQuotes);
  const selectSelectedInternalAccountByScopeMock = jest.mocked(
    selectSelectedInternalAccountByScope,
  );

  beforeEach(() => {
    jest.resetAllMocks();

    useIsTransactionPayLoadingMock.mockReturnValue(false);
    selectSelectedInternalAccountByScopeMock.mockImplementation(
      () => (scope: string) =>
        scope === EVM_SCOPE
          ? ({ address: RECIPIENT_ADDRESS } as never)
          : undefined,
    );
    useTransactionPayQuotesMock.mockReturnValue([createRelayQuote()]);
  });

  it('renders label and receive amount when quote recipient matches active address', () => {
    const label = 'You receive';

    const { getByText } = renderWithProvider(
      <RelayYouReceiveRow label={label} />,
    );

    expect(getByText(label)).toBeOnTheScreen();
    expect(getByText('1.23 MUSD')).toBeOnTheScreen();
  });

  it('renders InfoRowSkeleton when loading', () => {
    useIsTransactionPayLoadingMock.mockReturnValue(true);

    const { getByTestId } = renderWithProvider(
      <RelayYouReceiveRow label="You receive" />,
    );

    expect(getByTestId('relay-you-receive-row-skeleton')).toBeOnTheScreen();
  });

  it('renders InfoRow with custom testID when provided', () => {
    const customTestID = 'relay-you-receive-custom';

    const { getByTestId } = renderWithProvider(
      <RelayYouReceiveRow label="You receive" testID={customTestID} />,
    );

    expect(getByTestId(customTestID)).toBeOnTheScreen();
  });

  it('returns null when no matching output exists for active address', () => {
    useTransactionPayQuotesMock.mockReturnValue([
      createRelayQuote({
        recipient: '0x0000000000000000000000000000000000000001',
      }),
    ]);

    const { queryByText } = renderWithProvider(
      <RelayYouReceiveRow label="You receive" />,
    );

    expect(queryByText('You receive')).toBeNull();
  });

  it('returns null when selected EVM address is undefined', () => {
    selectSelectedInternalAccountByScopeMock.mockImplementation(
      () => () => undefined,
    );

    const { queryByText } = renderWithProvider(
      <RelayYouReceiveRow label="You receive" />,
    );

    expect(queryByText('You receive')).toBeNull();
  });

  it('returns null when quotes array is empty', () => {
    useTransactionPayQuotesMock.mockReturnValue([]);

    const { queryByText } = renderWithProvider(
      <RelayYouReceiveRow label="You receive" />,
    );

    expect(queryByText('You receive')).toBeNull();
  });

  it('formats receive amount with symbol from quote', () => {
    useTransactionPayQuotesMock.mockReturnValue([
      createRelayQuote({ amountFormatted: '99.5', symbol: 'ETH' }),
    ]);

    const { getByText } = renderWithProvider(
      <RelayYouReceiveRow label="You receive" />,
    );

    expect(getByText('99.5 ETH')).toBeOnTheScreen();
  });
});
