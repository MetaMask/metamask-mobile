import React from 'react';
import {
  type TransactionMeta,
  TransactionStatus,
  TransactionType,
  CHAIN_IDS,
} from '@metamask/transaction-controller';
import { merge } from 'lodash';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { fireEvent } from '@testing-library/react-native';
import { useTransactionDetails } from '../../../../Views/confirmations/hooks/activity/useTransactionDetails';
import { otherControllersMock } from '../../../../Views/confirmations/__mocks__/controllers/other-controllers-mock';
import { MUSD_TOKEN_ADDRESS } from '../../../Earn/constants/musd';
import { MoneySentDetails } from './MoneySentDetails';
import { selectMoneyEnableActivityDetailsBlockexplorerLinkFlag } from '../../selectors/featureFlags';

jest.mock('../../selectors/featureFlags', () => ({
  selectMoneyEnableActivityDetailsBlockexplorerLinkFlag: jest.fn(),
}));

const mockedSelectBlockexplorerFlag = jest.mocked(
  selectMoneyEnableActivityDetailsBlockexplorerLinkFlag,
);

jest.mock('../../../../../util/analytics/externalLinkTracking', () => ({
  ...jest.requireActual('../../../../../util/analytics/externalLinkTracking'),
  trackBlockExplorerLinkClicked: jest.fn(),
}));
import { trackBlockExplorerLinkClicked } from '../../../../../util/analytics/externalLinkTracking';
const mockNavigate = jest.fn();
// Mirrors the host sheet: closes first, then runs the deferred navigation.
const mockCloseSheet = jest.fn((navigate: () => void) => navigate());

jest.mock(
  '../../../../Views/confirmations/hooks/activity/useTransactionDetails',
);
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
}));
jest.mock(
  '../../../../Views/confirmations/components/activity/transaction-details-status',
  () => {
    const { Text } = jest.requireActual('react-native');
    return {
      TransactionDetailsStatus: () => (
        <Text testID="status-mock">Confirmed</Text>
      ),
    };
  },
);
jest.mock(
  '../../../../Views/confirmations/components/activity/transaction-details-date-row',
  () => ({ TransactionDetailsDateRow: jest.fn(() => null) }),
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
  TokenIconVariant: { Row: 'row', Hero: 'hero', Default: 'default' },
}));
jest.mock('../../../../Views/confirmations/hooks/useNetworkInfo', () => ({
  __esModule: true,
  default: () => ({ networkName: 'Ethereum', networkImage: 1 }),
}));
jest.mock('../../../../hooks/DisplayName/useAccountNames', () => ({
  useAccountNames: () => ['Defi account'],
}));
// The fee/paid-with rows are the shared confirmation components, exercised by
// their own tests. Here we only assert MoneySentDetails renders them.
jest.mock(
  '../../../../Views/confirmations/components/activity/transaction-details-network-fee-row/transaction-details-network-fee-row',
  () => {
    const { Text } = jest.requireActual('react-native');
    return {
      TransactionDetailsNetworkFeeRow: () => (
        <Text testID="network-fee-row">network-fee</Text>
      ),
    };
  },
);
jest.mock(
  '../../../../Views/confirmations/components/activity/transaction-details-bridge-fee-row/transaction-details-bridge-fee-row',
  () => {
    const { Text } = jest.requireActual('react-native');
    return {
      TransactionDetailsBridgeFeeRow: () => (
        <Text testID="bridge-fee-row">bridge-fee</Text>
      ),
    };
  },
);
jest.mock(
  '../../../../Views/confirmations/components/activity/transaction-details-paid-with-row/transaction-details-paid-with-row',
  () => {
    const { Text } = jest.requireActual('react-native');
    return {
      TransactionDetailsPaidWithRow: () => (
        <Text testID="paid-with-row">paid-with</Text>
      ),
    };
  },
);
jest.mock(
  '../../../../Views/confirmations/hooks/pay/usePayFiatFormatter',
  () => ({
    usePayFiatFormatter: () => (value: { toFixed: (n: number) => string }) =>
      `$${value.toFixed(2)}`,
  }),
);

const FROM_MOCK = '0x1111111111111111111111111111111111111111';
const RECIPIENT_MOCK = '0x2222222222222222222222222222222222222222';
const DAI_MOCK = '0x3333333333333333333333333333333333333333';
const TELLER_MOCK = '0x4444444444444444444444444444444444444444';

/**
 * Encodes real ERC-20 `transfer(recipient, amount)` calldata so the decoders
 * (`getTokenTransferData` → `parseStandardTokenTransactionData`) run for real.
 */
function encodeTransfer(to: string, minimalUnitAmount: string): string {
  const toSlot = to.toLowerCase().replace(/^0x/, '').padStart(64, '0');
  const amountSlot = BigInt(minimalUnitAmount).toString(16).padStart(64, '0');
  return `0xa9059cbb${toSlot}${amountSlot}`;
}

// Production shape: a withdrawal is an EIP-7702 `batch` whose mUSD transfer
// lives in `nestedTransactions` (index 1, after the teller withdraw call) with
// no top-level `transferInformation` — so the amount/recipient are decoded from
// the nested transfer calldata, exactly as at runtime.
const baseTransactionMeta = {
  id: 'tx-1',
  chainId: CHAIN_IDS.MONAD,
  status: TransactionStatus.confirmed,
  time: Date.UTC(2026, 4, 21, 14, 16),
  hash: '0xhash',
  type: TransactionType.batch,
  txParams: {
    from: FROM_MOCK,
  },
  nestedTransactions: [
    // Teller withdraw call — not an ERC-20 transfer, ignored by the decoders.
    {
      type: TransactionType.moneyAccountWithdraw,
      to: TELLER_MOCK,
      data: '0xabcdef01',
    },
    // mUSD ERC-20 transfer to the recipient.
    {
      type: TransactionType.tokenMethodTransfer,
      to: MUSD_TOKEN_ADDRESS,
      data: encodeTransfer(RECIPIENT_MOCK, '33930000'),
    },
  ],
  metamaskPay: {
    tokenAddress: DAI_MOCK,
    chainId: CHAIN_IDS.MONAD,
    networkFeeFiat: '1.23',
    bridgeFeeFiat: '0.05',
    totalFiat: '34.54',
  },
} as unknown as TransactionMeta;

function render(overrides: Partial<TransactionMeta> = {}) {
  jest.mocked(useTransactionDetails).mockReturnValue({
    transactionMeta: {
      ...baseTransactionMeta,
      ...overrides,
    } as TransactionMeta,
  });
  return renderWithProvider(
    <MoneySentDetails onCloseSheet={mockCloseSheet} />,
    {
      state: merge({}, otherControllersMock),
    },
  );
}

describe('MoneySentDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedSelectBlockexplorerFlag.mockReturnValue(true);
  });

  it('renders the hero with the negative mUSD amount', () => {
    const { getByTestId, getByText } = render();
    expect(getByTestId('money-sent-hero')).toBeOnTheScreen();
    expect(getByText('You sent')).toBeOnTheScreen();
    expect(getByText('-33.93 mUSD')).toBeOnTheScreen();
  });

  it('renders the To row with the recipient decoded from the nested transfer calldata', () => {
    const { getByTestId, getByText } = render();
    expect(getByText('To')).toBeOnTheScreen();
    expect(getByTestId('name-mock').props.children).toBe(RECIPIENT_MOCK);
  });

  it('omits the To row when the batch has no decodable transfer', () => {
    const { queryByText } = render({
      nestedTransactions: [
        {
          type: TransactionType.moneyAccountWithdraw,
          to: TELLER_MOCK,
          data: '0xabcdef01',
        },
      ],
    } as unknown as Partial<TransactionMeta>);
    expect(queryByText('To')).toBeNull();
  });

  it('renders the network row', () => {
    const { getAllByText } = render();
    expect(getAllByText('Ethereum').length).toBeGreaterThan(0);
  });

  it('renders the shared network-fee, provider-fee and paid-with rows', () => {
    const { getByTestId } = render();
    expect(getByTestId('network-fee-row')).toBeOnTheScreen();
    expect(getByTestId('bridge-fee-row')).toBeOnTheScreen();
    expect(getByTestId('paid-with-row')).toBeOnTheScreen();
  });

  it('renders the status on a single row', () => {
    const { getByText, getByTestId } = render();
    expect(getByText('Status')).toBeOnTheScreen();
    expect(getByTestId('status-mock')).toBeOnTheScreen();
  });

  it('renders the total amount from metamaskPay via the pay fiat formatter', () => {
    const { getByText } = render();
    expect(getByText('Total amount')).toBeOnTheScreen();
    expect(getByText('$34.54')).toBeOnTheScreen();
  });

  it('closes the sheet before navigating to the block explorer when the button is pressed', () => {
    const { getByText } = render();
    fireEvent.press(getByText('View on block explorer'));
    // The sheet must dismiss first — navigating while its transparent modal is
    // still presented leaves the WebView behind it and strands the overlay.
    expect(mockCloseSheet).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(
      'Webview',
      expect.objectContaining({ screen: 'SimpleWebview' }),
    );
    expect(jest.mocked(trackBlockExplorerLinkClicked)).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      expect.objectContaining({
        location: 'money_transaction_details',
      }),
    );
  });

  it('omits the total row when metamaskPay is absent', () => {
    const { queryByText } = render({
      metamaskPay: undefined,
    });
    expect(queryByText('Total amount')).toBeNull();
  });

  it('hides the block explorer button when moneyEnableActivityDetailsBlockexplorerLink flag is off', () => {
    mockedSelectBlockexplorerFlag.mockReturnValue(false);

    const { queryByText } = render();

    expect(queryByText('View on block explorer')).toBeNull();
  });
});
