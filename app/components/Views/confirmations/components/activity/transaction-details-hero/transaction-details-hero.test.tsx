import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import {
  TransactionMeta,
  TransactionType,
  CHAIN_IDS,
} from '@metamask/transaction-controller';
import { TransactionDetailsHero } from './transaction-details-hero';
import { merge } from 'lodash';
import { otherControllersMock } from '../../../__mocks__/controllers/other-controllers-mock';
import { useTokenWithBalance } from '../../../hooks/tokens/useTokenWithBalance';
import { MERKL_DISTRIBUTOR_ADDRESS } from '../../../../../UI/Earn/components/MerklRewards/constants';
import { MUSD_TOKEN_ADDRESS } from '../../../../../UI/Earn/constants/musd';
import { useIsMoneyAccountContext } from '../../../hooks/activity/useIsMoneyAccountContext';
import { ARBITRUM_USDC } from '../../../constants/perps';
import { POLYGON_PUSD } from '../../../constants/predict';
import { selectTransactionsByIds } from '../../../../../../selectors/transactionController';

jest.mock('../../../hooks/activity/useTransactionDetails');
jest.mock('../../../hooks/activity/useIsMoneyAccountContext', () => ({
  useIsMoneyAccountContext: jest.fn().mockReturnValue(false),
}));
jest.mock('../../../hooks/tokens/useTokenWithBalance');
jest.mock('../../../../../../selectors/transactionController', () => ({
  ...jest.requireActual('../../../../../../selectors/transactionController'),
  selectTransactionsByIds: jest.fn().mockReturnValue([]),
}));
jest.mock('../../token-icon', () => ({
  TokenIcon: () => null,
}));

const TOKEN_ADDRESS_MOCK = '0x1234567890abcdef1234567890abcdef12345678';
const CHAIN_ID_MOCK = '0x123';
const DATA_MOCK =
  '0xa9059cbb000000000000000000000000d8da6bf26964af9d7eed9e03e53415d37aa96045000000000000000000000000000000000000000000000000000000000001E240';
const DECIMALS_MOCK = 3;

const TRANSACTION_META_MOCK = {
  chainId: CHAIN_ID_MOCK,
  txParams: {
    data: DATA_MOCK,
    to: TOKEN_ADDRESS_MOCK,
  },
  type: TransactionType.perpsDeposit,
} as unknown as TransactionMeta;

function render() {
  return renderWithProvider(<TransactionDetailsHero />, {
    state: merge({}, otherControllersMock),
  });
}

describe('TransactionDetailsHero', () => {
  const useTransactionDetailsMock = jest.mocked(useTransactionDetails);
  const useTokenWithBalanceMock = jest.mocked(useTokenWithBalance);

  beforeEach(() => {
    jest.resetAllMocks();

    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: TRANSACTION_META_MOCK,
    });

    useTokenWithBalanceMock.mockReturnValue({
      address: TOKEN_ADDRESS_MOCK,
      chainId: CHAIN_ID_MOCK,
      decimals: DECIMALS_MOCK,
      symbol: 'TST',
    } as unknown as ReturnType<typeof useTokenWithBalance>);
  });

  it('renders human amount', () => {
    const { getByText } = render();
    expect(getByText('$123.46')).toBeDefined();
  });

  it('renders human amount if token transfer is nested call', () => {
    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        ...TRANSACTION_META_MOCK,
        txParams: {
          ...TRANSACTION_META_MOCK.txParams,
          data: '0x123',
          to: '0x456',
        },
        nestedTransactions: [
          {
            data: DATA_MOCK,
            to: TOKEN_ADDRESS_MOCK,
          },
        ],
      } as unknown as TransactionMeta,
    });

    const { getByText } = render();

    expect(getByText('$123.46')).toBeDefined();
  });

  it('renders nothing if no to', () => {
    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        ...TRANSACTION_META_MOCK,
        txParams: {
          ...TRANSACTION_META_MOCK.txParams,
          to: undefined,
        },
      } as unknown as TransactionMeta,
    });

    const { queryByTestId } = render();
    expect(queryByTestId('transaction-details-hero')).toBeNull();
  });

  it('renders nothing if no data', () => {
    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        ...TRANSACTION_META_MOCK,
        txParams: {
          ...TRANSACTION_META_MOCK.txParams,
          data: undefined,
        },
      } as unknown as TransactionMeta,
    });

    const { queryByTestId } = render();
    expect(queryByTestId('transaction-details-hero')).toBeNull();
  });

  it('renders nothing if no decimals', () => {
    useTokenWithBalanceMock.mockReturnValue(
      undefined as unknown as ReturnType<typeof useTokenWithBalance>,
    );

    const { queryByTestId } = render();
    expect(queryByTestId('transaction-details-hero')).toBeNull();
  });

  it('renders nothing if no amount in data', () => {
    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        ...TRANSACTION_META_MOCK,
        txParams: {
          ...TRANSACTION_META_MOCK.txParams,
          data: '0x123',
        },
      } as unknown as TransactionMeta,
    });

    const { queryByTestId } = render();
    expect(queryByTestId('transaction-details-hero')).toBeNull();
  });

  it('renders token amount for Money types with targetFiat', () => {
    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        ...TRANSACTION_META_MOCK,
        type: TransactionType.moneyAccountDeposit,
        metamaskPay: {
          targetFiat: '456.78',
        },
      } as unknown as TransactionMeta,
    });

    const { getByText } = render();

    expect(getByText(/\$456\.78/)).toBeDefined();
  });

  it.each([TransactionType.perpsDeposit, TransactionType.predictDeposit])(
    'renders fiat (not mUSD) for %s with targetFiat',
    (type) => {
      useTransactionDetailsMock.mockReturnValue({
        transactionMeta: {
          ...TRANSACTION_META_MOCK,
          type,
          metamaskPay: {
            targetFiat: '100.00',
          },
        } as unknown as TransactionMeta,
      });

      const { getByText, queryByText } = render();

      expect(getByText(/\$100/)).toBeDefined();
      expect(queryByText(/mUSD/)).toBeNull();
    },
  );

  it('renders token amount for musdConversion transactions', () => {
    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        ...TRANSACTION_META_MOCK,
        type: TransactionType.musdConversion,
        metamaskPay: {
          targetFiat: '100.00',
        },
      } as unknown as TransactionMeta,
    });

    const { getByText } = render();

    expect(getByText(/\$100/)).toBeDefined();
  });

  it('renders claim amount for musdClaim with valid claim data', () => {
    const USER_ADDRESS = '0x1234567890123456789012345678901234567890';
    const claimAmount = '75500000'; // 75.5 mUSD (6 decimals)

    const ERC20_TRANSFER_TOPIC =
      '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
    const mockLogs = [
      {
        address: MUSD_TOKEN_ADDRESS,
        data: '0x' + BigInt(claimAmount).toString(16).padStart(64, '0'),
        topics: [
          ERC20_TRANSFER_TOPIC,
          '0x000000000000000000000000' +
            MERKL_DISTRIBUTOR_ADDRESS.slice(2).toLowerCase(),
          '0x000000000000000000000000' + USER_ADDRESS.slice(2).toLowerCase(),
        ],
      },
    ];

    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        ...TRANSACTION_META_MOCK,
        type: TransactionType.musdClaim,
        txParams: {
          from: USER_ADDRESS,
        },
        txReceipt: {
          logs: mockLogs,
        },
      } as unknown as TransactionMeta,
    });

    const { getByText } = render();
    expect(getByText('$75.50')).toBeDefined();
  });

  it('renders nothing for musdClaim without valid claim data', () => {
    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        ...TRANSACTION_META_MOCK,
        type: TransactionType.musdClaim,
        txParams: {
          data: '0x123', // Invalid claim data
        },
      } as unknown as TransactionMeta,
    });

    const { queryByTestId } = render();
    expect(queryByTestId('transaction-details-hero')).toBeNull();
  });

  it.each([
    TransactionType.moneyAccountDeposit,
    TransactionType.moneyAccountWithdraw,
  ])('renders hero amount for %s', (type) => {
    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        ...TRANSACTION_META_MOCK,
        type,
      } as unknown as TransactionMeta,
    });

    const { getByText } = render();
    expect(getByText('$123.46')).toBeDefined();
  });

  it('renders single-row token hero for cross-token moneyAccountWithdraw outside money context', () => {
    jest.mocked(selectTransactionsByIds).mockReturnValue([]);

    useTransactionDetailsMock.mockReturnValue({
      transactionMeta: {
        ...TRANSACTION_META_MOCK,
        type: TransactionType.moneyAccountWithdraw,
        metamaskPay: {
          tokenAddress: TOKEN_ADDRESS_MOCK,
          chainId: CHAIN_ID_MOCK,
          targetFiat: '200.00',
        },
      } as unknown as TransactionMeta,
    });

    const { getByText, queryByText } = render();

    expect(getByText(/\$200/)).toBeDefined();
    expect(queryByText('You sent')).toBeNull();
    expect(queryByText('You received')).toBeNull();
  });

  describe('money context (isMoneyContext = true)', () => {
    const useIsMoneyAccountContextMock = jest.mocked(useIsMoneyAccountContext);
    const selectTransactionsByIdsMock = jest.mocked(selectTransactionsByIds);

    beforeEach(() => {
      useIsMoneyAccountContextMock.mockReturnValue(true);
      selectTransactionsByIdsMock.mockReturnValue([]);
    });

    it('renders two-asset hero for musdConversion with fiat amounts', () => {
      useTransactionDetailsMock.mockReturnValue({
        transactionMeta: {
          ...TRANSACTION_META_MOCK,
          type: TransactionType.musdConversion,
          metamaskPay: {
            tokenAddress: TOKEN_ADDRESS_MOCK,
            chainId: CHAIN_ID_MOCK,
            targetFiat: '123.46',
            totalFiat: '125.80',
          },
        } as unknown as TransactionMeta,
      });

      const { getByText } = render();

      expect(getByText('You sent')).toBeDefined();
      expect(getByText(/-\$125\.80/)).toBeDefined();
      expect(getByText('You received')).toBeDefined();
      expect(getByText(/\+\$123\.46/)).toBeDefined();
    });

    it('renders Money Account icon instead of token icon for mUSD in two-asset hero', () => {
      useTransactionDetailsMock.mockReturnValue({
        transactionMeta: {
          ...TRANSACTION_META_MOCK,
          type: TransactionType.musdConversion,
          metamaskPay: {
            tokenAddress: TOKEN_ADDRESS_MOCK,
            chainId: CHAIN_ID_MOCK,
            targetFiat: '50.00',
          },
        } as unknown as TransactionMeta,
      });

      const { getAllByTestId } = render();

      expect(getAllByTestId('money-account-icon').length).toBeGreaterThan(0);
    });

    it('renders two-asset hero for perpsDeposit with fiat amounts', () => {
      useTransactionDetailsMock.mockReturnValue({
        transactionMeta: {
          ...TRANSACTION_META_MOCK,
          type: TransactionType.perpsDeposit,
          metamaskPay: {
            tokenAddress: TOKEN_ADDRESS_MOCK,
            chainId: CHAIN_ID_MOCK,
            targetFiat: '123.46',
            totalFiat: '125.80',
          },
        } as unknown as TransactionMeta,
      });

      const { getByText } = render();

      expect(getByText('You sent')).toBeDefined();
      expect(getByText(/-\$125\.80/)).toBeDefined();
      expect(getByText('You received')).toBeDefined();
      expect(getByText(/\+\$123\.46/)).toBeDefined();
    });

    it('renders two-asset hero for predictDeposit with fiat amounts', () => {
      useTransactionDetailsMock.mockReturnValue({
        transactionMeta: {
          ...TRANSACTION_META_MOCK,
          type: TransactionType.predictDeposit,
          metamaskPay: {
            tokenAddress: TOKEN_ADDRESS_MOCK,
            chainId: CHAIN_ID_MOCK,
            targetFiat: '123.46',
            totalFiat: '125.80',
          },
        } as unknown as TransactionMeta,
      });

      const { getByText } = render();

      expect(getByText('You sent')).toBeDefined();
      expect(getByText(/-\$125\.80/)).toBeDefined();
      expect(getByText('You received')).toBeDefined();
      expect(getByText(/\+\$123\.46/)).toBeDefined();
    });

    it('renders two-asset hero for cross-chain moneyAccountWithdraw with fiat amounts', () => {
      useTransactionDetailsMock.mockReturnValue({
        transactionMeta: {
          ...TRANSACTION_META_MOCK,
          type: TransactionType.moneyAccountWithdraw,
          metamaskPay: {
            tokenAddress: TOKEN_ADDRESS_MOCK,
            chainId: CHAIN_ID_MOCK,
            targetFiat: '200.00',
            totalFiat: '202.34',
          },
        } as unknown as TransactionMeta,
      });

      const { getByText } = render();

      expect(getByText('You sent')).toBeDefined();
      expect(getByText(/-\$202\.34/)).toBeDefined();
      expect(getByText('You received')).toBeDefined();
      expect(getByText(/\+\$200/)).toBeDefined();
    });

    it('renders single-row hero with Money Account icon for mUSD-to-mUSD moneyAccountWithdraw', () => {
      useTransactionDetailsMock.mockReturnValue({
        transactionMeta: {
          ...TRANSACTION_META_MOCK,
          type: TransactionType.moneyAccountWithdraw,
          chainId: CHAIN_IDS.MONAD,
          metamaskPay: {
            tokenAddress: MUSD_TOKEN_ADDRESS,
            chainId: CHAIN_IDS.MONAD,
            targetFiat: '200.00',
          },
        } as unknown as TransactionMeta,
      });

      const { getByText, getByTestId, queryByText } = render();

      expect(getByText(/-\$200/)).toBeDefined();
      expect(getByTestId('money-account-icon')).toBeDefined();
      expect(queryByText('You sent')).toBeNull();
      expect(queryByText('You received')).toBeNull();
    });

    it('renders single-row hero for cross-chain mUSD moneyAccountWithdraw', () => {
      useTransactionDetailsMock.mockReturnValue({
        transactionMeta: {
          ...TRANSACTION_META_MOCK,
          type: TransactionType.moneyAccountWithdraw,
          chainId: CHAIN_IDS.LINEA_MAINNET,
          metamaskPay: {
            tokenAddress: MUSD_TOKEN_ADDRESS,
            chainId: CHAIN_IDS.LINEA_MAINNET,
            targetFiat: '0.10',
          },
        } as unknown as TransactionMeta,
      });

      const { getByText, getByTestId, queryByText } = render();

      expect(getByText(/-\$0\.10/)).toBeDefined();
      expect(getByTestId('money-account-icon')).toBeDefined();
      expect(queryByText('You sent')).toBeNull();
      expect(queryByText('You received')).toBeNull();
    });

    it('renders two-asset hero for perpsWithdraw with fiat amounts', () => {
      useTransactionDetailsMock.mockReturnValue({
        transactionMeta: {
          ...TRANSACTION_META_MOCK,
          type: TransactionType.perpsWithdraw,
          metamaskPay: {
            tokenAddress: TOKEN_ADDRESS_MOCK,
            chainId: CHAIN_ID_MOCK,
            targetFiat: '50.00',
            totalFiat: '52.34',
          },
        } as unknown as TransactionMeta,
      });

      const { getByText } = render();

      expect(getByText('You sent')).toBeDefined();
      expect(getByText(/-\$52\.34/)).toBeDefined();
      expect(getByText('You received')).toBeDefined();
      expect(getByText(/\+\$50/)).toBeDefined();
    });

    it('renders two-asset hero for predictWithdraw with fiat amounts', () => {
      useTransactionDetailsMock.mockReturnValue({
        transactionMeta: {
          ...TRANSACTION_META_MOCK,
          type: TransactionType.predictWithdraw,
          metamaskPay: {
            tokenAddress: TOKEN_ADDRESS_MOCK,
            chainId: CHAIN_ID_MOCK,
            targetFiat: '10.00',
            totalFiat: '12.34',
          },
        } as unknown as TransactionMeta,
      });

      const { getByText } = render();

      expect(getByText('You sent')).toBeDefined();
      expect(getByText(/-\$12\.34/)).toBeDefined();
      expect(getByText('You received')).toBeDefined();
      expect(getByText(/\+\$10/)).toBeDefined();
    });

    it('renders fiat deposit hero with green + prefix for moneyAccountDeposit with fiat orderId', () => {
      useTransactionDetailsMock.mockReturnValue({
        transactionMeta: {
          ...TRANSACTION_META_MOCK,
          type: TransactionType.moneyAccountDeposit,
          metamaskPay: {
            targetFiat: '100.00',
            fiat: { orderId: 'order-123' },
          },
        } as unknown as TransactionMeta,
      });

      const { getByText, queryByText } = render();

      expect(getByText(/\+\$100/)).toBeDefined();
      expect(queryByText('You sent')).toBeNull();
      expect(queryByText('You received')).toBeNull();
    });

    it('renders single-row mUSD deposit hero with Money Account icon', () => {
      useTransactionDetailsMock.mockReturnValue({
        transactionMeta: {
          ...TRANSACTION_META_MOCK,
          type: TransactionType.moneyAccountDeposit,
          metamaskPay: {
            tokenAddress: MUSD_TOKEN_ADDRESS,
            chainId: CHAIN_ID_MOCK,
            targetFiat: '50.12',
          },
        } as unknown as TransactionMeta,
      });

      const { getByText, getByTestId, queryByText } = render();

      expect(getByTestId('money-account-icon')).toBeDefined();
      expect(getByText(/\+\$50\.12/)).toBeDefined();
      expect(queryByText('You sent')).toBeNull();
      expect(queryByText('You received')).toBeNull();
    });

    it('renders two-asset hero for crypto moneyAccountDeposit with fiat amounts', () => {
      useTransactionDetailsMock.mockReturnValue({
        transactionMeta: {
          ...TRANSACTION_META_MOCK,
          type: TransactionType.moneyAccountDeposit,
          metamaskPay: {
            tokenAddress: TOKEN_ADDRESS_MOCK,
            chainId: CHAIN_ID_MOCK,
            targetFiat: '123.46',
            totalFiat: '125.80',
          },
        } as unknown as TransactionMeta,
      });

      const { getByText } = render();

      expect(getByText('You sent')).toBeDefined();
      expect(getByText(/-\$125\.80/)).toBeDefined();
      expect(getByText('You received')).toBeDefined();
      expect(getByText(/\+\$123\.46/)).toBeDefined();
    });

    it('renders null for unsupported type in money context', () => {
      useTransactionDetailsMock.mockReturnValue({
        transactionMeta: {
          ...TRANSACTION_META_MOCK,
          type: TransactionType.contractInteraction,
        } as unknown as TransactionMeta,
      });

      const { queryByTestId } = render();
      expect(queryByTestId('transaction-details-hero')).toBeNull();
    });

    it('extracts sent amount from relay deposit child transaction and shows fiat', () => {
      selectTransactionsByIdsMock.mockReturnValue([
        {
          type: TransactionType.relayDeposit,
          txParams: { data: DATA_MOCK },
        } as unknown as TransactionMeta,
      ]);

      useTransactionDetailsMock.mockReturnValue({
        transactionMeta: {
          ...TRANSACTION_META_MOCK,
          type: TransactionType.musdConversion,
          requiredTransactionIds: ['child-tx-1'],
          metamaskPay: {
            tokenAddress: TOKEN_ADDRESS_MOCK,
            chainId: CHAIN_ID_MOCK,
            targetFiat: '123.46',
            totalFiat: '125.80',
          },
        } as unknown as TransactionMeta,
      });

      const { getByText } = render();

      expect(getByText('You sent')).toBeDefined();
      expect(getByText(/-\$125\.80/)).toBeDefined();
    });

    it('extracts sent amount from relay deposit native value and shows fiat', () => {
      const nativeAddress = '0x0000000000000000000000000000000000000000';
      selectTransactionsByIdsMock.mockReturnValue([
        {
          type: TransactionType.relayDeposit,
          txParams: { value: '1000000000000000000' },
        } as unknown as TransactionMeta,
      ]);

      useTransactionDetailsMock.mockReturnValue({
        transactionMeta: {
          ...TRANSACTION_META_MOCK,
          type: TransactionType.musdConversion,
          requiredTransactionIds: ['child-tx-1'],
          metamaskPay: {
            tokenAddress: nativeAddress,
            chainId: '0x1',
            targetFiat: '123.46',
            totalFiat: '125.80',
          },
        } as unknown as TransactionMeta,
      });

      const { getByText } = render();

      expect(getByText('You sent')).toBeDefined();
      expect(getByText(/-\$125\.80/)).toBeDefined();
    });

    it('falls back to tokenMeta amount as fiat when parent data is not decodable', () => {
      useTransactionDetailsMock.mockReturnValue({
        transactionMeta: {
          ...TRANSACTION_META_MOCK,
          type: TransactionType.perpsDeposit,
          txParams: { data: '0xdeadbeef', to: TOKEN_ADDRESS_MOCK },
          metamaskPay: {
            tokenAddress: TOKEN_ADDRESS_MOCK,
            chainId: CHAIN_ID_MOCK,
            targetFiat: '77.00',
          },
        } as unknown as TransactionMeta,
      });

      const { getByText } = render();

      expect(getByText('You sent')).toBeDefined();
      expect(getByText(/-\$77/)).toBeDefined();
    });
  });
});
