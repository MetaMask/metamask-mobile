import '../../../../../../tests/component-view/mocks';
import { act, fireEvent, within } from '@testing-library/react-native';
import NetInfo from '@react-native-community/netinfo';
import type NetInfoMock from '../../../../../__mocks__/@react-native-community/netinfo';
import Engine from '../../../../../core/Engine';
import { strings } from '../../../../../../locales/i18n';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import {
  clearAccountsTransactionsApiMocks,
  setupMoneyActivityApiMock,
  type MockMoneyActivityTransaction,
} from '../../../../../../tests/component-view/api-mocking/accounts-transactions';
import { renderMoneyActivityView } from '../../../../../../tests/component-view/renderers/moneyActivity';
import {
  MONEY_ACTIVITY_ACCOUNT,
  MONEY_PREMIUM_VAULT,
  MONEY_STANDARD_VAULT,
} from '../../../../../../tests/component-view/presets/moneyActivity';
import { MoneyActivityItemTestIds } from '../../components/MoneyActivityItem/MoneyActivityItem.testIds';
import {
  CARD_BLOCK_NUMBER,
  CARD_TX_HASH as CARD_HASH,
  CASHBACK_TX_HASH as CASHBACK_HASH,
  cardValuation,
  vaultShareValuationResponse,
} from '../../__fixtures__/vaultShareValuations';

const SETTLEMENT_ADDRESS = '0x8dFE562Cbb4E93D5029f39DA26BB6B501a8d1D3e';
const REWARDER_ADDRESS = '0xfe80eea4249a1f01095d35e0cf4f37367976a9f0';

const netInfoMock = NetInfo as unknown as typeof NetInfoMock;
const engineCall = Engine.controllerMessenger.call as unknown as jest.Mock;
const defaultEngineCall = engineCall.getMockImplementation() as
  | ((action: string, ...args: unknown[]) => unknown)
  | undefined;

function cardTransaction(): MockMoneyActivityTransaction {
  return {
    hash: CARD_HASH,
    timestamp: '2026-09-29T07:17:22Z',
    chainId: 143,
    blockNumber: CARD_BLOCK_NUMBER,
    from: MONEY_ACTIVITY_ACCOUNT,
    to: SETTLEMENT_ADDRESS,
    transactionType: 'METAMASK_CARD_PAYMENT',
    valueTransfers: [
      {
        from: MONEY_ACTIVITY_ACCOUNT,
        to: SETTLEMENT_ADDRESS,
        amount: '951755696',
        decimal: 6,
        contractAddress: MONEY_STANDARD_VAULT.boringVault,
        symbol: 'vmUSD',
      },
    ],
  };
}

function cashbackTransaction(): MockMoneyActivityTransaction {
  return {
    hash: CASHBACK_HASH,
    timestamp: '2026-09-25T13:13:36Z',
    chainId: 143,
    blockNumber: 107901997,
    from: REWARDER_ADDRESS,
    to: MONEY_ACTIVITY_ACCOUNT,
    transactionType: 'METAMASK_CARD_CASHBACK',
    valueTransfers: [
      {
        from: REWARDER_ADDRESS,
        to: MONEY_ACTIVITY_ACCOUNT,
        amount: '524978000',
        decimal: 6,
        contractAddress: MONEY_PREMIUM_VAULT.boringVault,
        symbol: 'pvmUSD',
      },
    ],
  };
}

function installMoneyApi({
  valuationReply,
}: {
  valuationReply: () => Promise<unknown>;
}): void {
  engineCall.mockImplementation((action: string, ...args: unknown[]) => {
    if (action === 'MoneyAccountApiDataService:fetchVaultShareValuations') {
      return valuationReply();
    }
    if (action === 'MoneyAccountApiDataService:fetchVaultRate') {
      return Promise.resolve({ rate: '1.017488' });
    }
    return defaultEngineCall?.(action, ...args) ?? Promise.resolve(undefined);
  });
}

function valuationCallCount(): number {
  return engineCall.mock.calls.filter(
    ([action]) =>
      action === 'MoneyAccountApiDataService:fetchVaultShareValuations',
  ).length;
}

describeForPlatforms('MoneyActivityView historical card amounts', () => {
  beforeEach(() => {
    engineCall.mockReset();
    netInfoMock.__setMockNetInfo({ type: 'wifi', isInternetReachable: true });
    setupMoneyActivityApiMock(MONEY_ACTIVITY_ACCOUNT, [
      cardTransaction(),
      cashbackTransaction(),
    ]);
  });

  afterEach(() => {
    clearAccountsTransactionsApiMocks(MONEY_ACTIVITY_ACCOUNT);
    netInfoMock.__resetMockNetInfo();
  });

  it('shows cached historical mUSD amounts for vmUSD and pvmUSD rows, then opens details', async () => {
    installMoneyApi({
      valuationReply: () =>
        Promise.resolve(
          vaultShareValuationResponse(
            [
              cardValuation('968399999', MONEY_STANDARD_VAULT.boringVault),
              {
                hash: CASHBACK_HASH,
                vaultAddress: MONEY_PREMIUM_VAULT.boringVault,
                blockNumber: 107901997,
                sharesWei: '524978000',
                assetsWei: '533860000',
                type: 'transfer_in',
              },
            ],
            MONEY_ACTIVITY_ACCOUNT,
          ),
        ),
    });

    const { findByTestId, findByText } = renderMoneyActivityView({
      historicalValuationsEnabled: true,
    });

    const cardRow = await findByTestId(
      `${MoneyActivityItemTestIds.ROW}-${CARD_HASH}`,
    );
    expect(within(cardRow).getByText('-968.40 mUSD')).toBeOnTheScreen();

    const cashbackRow = await findByTestId(
      `${MoneyActivityItemTestIds.ROW}-${CASHBACK_HASH}`,
    );
    expect(within(cashbackRow).getByText('+533.86 mUSD')).toBeOnTheScreen();
    expect(valuationCallCount()).toBe(1);
    expect(engineCall).toHaveBeenCalledWith(
      'MoneyAccountApiDataService:fetchVaultShareValuations',
      MONEY_ACTIVITY_ACCOUNT,
      {
        chainId: 143,
        txHashes: [CASHBACK_HASH, CARD_HASH],
      },
    );

    fireEvent.press(cardRow);

    expect(
      await findByText(strings('card.transactions.details_title')),
    ).toBeOnTheScreen();
  });

  it("keeps today's display and makes no valuation request with the flag off", async () => {
    installMoneyApi({
      valuationReply: () =>
        Promise.resolve(
          vaultShareValuationResponse(
            [cardValuation('968399999', MONEY_STANDARD_VAULT.boringVault)],
            MONEY_ACTIVITY_ACCOUNT,
          ),
        ),
    });

    const { findByTestId, queryByTestId } = renderMoneyActivityView({
      historicalValuationsEnabled: false,
    });

    const cardRow = await findByTestId(
      `${MoneyActivityItemTestIds.ROW}-${CARD_HASH}`,
    );

    expect(
      within(cardRow).getByTestId(MoneyActivityItemTestIds.FIAT_AMOUNT),
    ).toHaveTextContent('-$951.76');
    expect(
      queryByTestId(`${MoneyActivityItemTestIds.ROW}-${CASHBACK_HASH}`),
    ).toBeNull();
    expect(valuationCallCount()).toBe(0);
  });

  it('renders an approximate amount, then replaces it with historical value in open details', async () => {
    let resolveValuation: (value: unknown) => void = () => undefined;
    const pendingValuation = new Promise<unknown>((resolve) => {
      resolveValuation = resolve;
    });
    installMoneyApi({ valuationReply: () => pendingValuation });

    const { findByTestId, findByText } = renderMoneyActivityView({
      historicalValuationsEnabled: true,
    });

    const cardRow = await findByTestId(
      `${MoneyActivityItemTestIds.ROW}-${CARD_HASH}`,
    );
    expect(
      within(cardRow).getByTestId(MoneyActivityItemTestIds.FIAT_AMOUNT),
    ).toHaveTextContent('≈-$968.40');

    fireEvent.press(cardRow);
    expect(
      await findByText(strings('card.transactions.details_title')),
    ).toBeOnTheScreen();
    expect(await findByText('≈-968.40 mUSD')).toBeOnTheScreen();

    await act(async () => {
      resolveValuation(
        vaultShareValuationResponse(
          [cardValuation('900000000', MONEY_STANDARD_VAULT.boringVault)],
          MONEY_ACTIVITY_ACCOUNT,
        ),
      );
      await pendingValuation;
    });

    expect(await findByText('-900.00 mUSD')).toBeOnTheScreen();
    expect(valuationCallCount()).toBe(1);
  });
});
