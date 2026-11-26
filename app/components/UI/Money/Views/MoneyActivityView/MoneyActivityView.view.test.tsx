import '../../../../../../tests/component-view/mocks';
import { act, fireEvent, waitFor, within } from '@testing-library/react-native';
import NetInfo from '@react-native-community/netinfo';
import type NetInfoMock from '../../../../../__mocks__/@react-native-community/netinfo';
import Engine from '../../../../../core/Engine';
import type { CardCashbackClaim } from '../../../../../core/Engine/controllers/card-controller/types';
import StorageWrapper from '../../../../../store/storage-wrapper';
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
import { MoneyActivityViewTestIds } from './MoneyActivityView.testIds';
import { MUSD_TOKEN_ADDRESS } from '../../../Earn/constants/musd';
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

function cashbackMusdTransaction(): MockMoneyActivityTransaction {
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
        contractAddress: MUSD_TOKEN_ADDRESS,
        symbol: 'mUSD',
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

  it('shows cached historical dollar amounts for vmUSD and pvmUSD rows, then opens details', async () => {
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

    const { findByTestId, findByText, getByTestId } = renderMoneyActivityView({
      historicalValuationsEnabled: true,
    });

    // The row mounts with a pending amount before the valuation query settles.
    const cardRow = await waitFor(() => {
      const row = getByTestId(`${MoneyActivityItemTestIds.ROW}-${CARD_HASH}`);
      expect(
        within(row).getByTestId(MoneyActivityItemTestIds.FIAT_AMOUNT),
      ).toHaveTextContent('-$968.40');
      return row;
    });
    expect(
      within(cardRow).queryByTestId(MoneyActivityItemTestIds.PRIMARY_AMOUNT),
    ).toBeNull();
    expect(within(cardRow).queryByText(/mUSD/)).toBeNull();

    const cashbackRow = await findByTestId(
      `${MoneyActivityItemTestIds.ROW}-${CASHBACK_HASH}`,
    );
    expect(
      within(cashbackRow).getByTestId(MoneyActivityItemTestIds.FIAT_AMOUNT),
    ).toHaveTextContent('+$533.86');
    expect(
      within(cashbackRow).queryByTestId(
        MoneyActivityItemTestIds.PRIMARY_AMOUNT,
      ),
    ).toBeNull();
    expect(valuationCallCount()).toBe(1);
    expect(engineCall).toHaveBeenCalledWith(
      'MoneyAccountApiDataService:fetchVaultShareValuations',
      MONEY_ACTIVITY_ACCOUNT,
      {
        chainId: 143,
        txHashes: [CASHBACK_HASH, CARD_HASH],
      },
    );

    fireEvent.press(
      getByTestId(`${MoneyActivityItemTestIds.ROW}-${CARD_HASH}`),
    );

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
      within(cardRow).queryByTestId(MoneyActivityItemTestIds.PRIMARY_AMOUNT),
    ).toBeNull();
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

    const { findByText, getByTestId } = renderMoneyActivityView({
      historicalValuationsEnabled: true,
    });

    // The approximate amount waits on the vault rate query, after the row mounts.
    await waitFor(() => {
      expect(
        within(
          getByTestId(`${MoneyActivityItemTestIds.ROW}-${CARD_HASH}`),
        ).getByTestId(MoneyActivityItemTestIds.FIAT_AMOUNT),
      ).toHaveTextContent('≈-$968.40');
    });

    fireEvent.press(
      getByTestId(`${MoneyActivityItemTestIds.ROW}-${CARD_HASH}`),
    );
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

describeForPlatforms('MoneyActivityView cashback claims', () => {
  const createClaim = (
    overrides: Partial<CardCashbackClaim> = {},
  ): CardCashbackClaim => ({
    status: 'pending',
    amount: '0.3',
    moneyAddress: MONEY_ACTIVITY_ACCOUNT,
    submittedAt: Date.now(),
    txHash: null,
    chainId: '0x8f',
    error: null,
    ...overrides,
  });

  beforeEach(async () => {
    await StorageWrapper.removeItem(
      `money.activity.page1.v1.${MONEY_ACTIVITY_ACCOUNT.toLowerCase()}`,
    );
    engineCall.mockReset();
    netInfoMock.__setMockNetInfo({ type: 'wifi', isInternetReachable: true });
  });

  afterEach(() => {
    clearAccountsTransactionsApiMocks(MONEY_ACTIVITY_ACCOUNT);
    netInfoMock.__resetMockNetInfo();
  });

  it('shows a pending cashback claim in the Pending section', async () => {
    setupMoneyActivityApiMock(MONEY_ACTIVITY_ACCOUNT, [
      cashbackMusdTransaction(),
    ]);
    const claim = createClaim();

    const { findByTestId, getByTestId } = renderMoneyActivityView({
      historicalValuationsEnabled: false,
      cashbackClaim: claim,
    });

    const row = await findByTestId(
      `${MoneyActivityItemTestIds.ROW}-cashback-claim-${claim.submittedAt}`,
    );
    expect(
      within(row).getByTestId(MoneyActivityItemTestIds.LABEL),
    ).toHaveTextContent('Receiving');
    expect(
      within(row).getByTestId(MoneyActivityItemTestIds.DESCRIPTION),
    ).toHaveTextContent('mUSD back');
    expect(
      within(row).getByTestId(MoneyActivityItemTestIds.PENDING_SPINNER, {
        includeHiddenElements: true,
      }),
    ).toBeOnTheScreen();
    expect(
      within(row).getByTestId(MoneyActivityItemTestIds.PRIMARY_AMOUNT),
    ).toHaveTextContent('+0.30 mUSD');
    expect(
      getByTestId(MoneyActivityViewTestIds.PENDING_HEADER),
    ).toBeOnTheScreen();
  });

  it('hides the claim when the Accounts API reports the settlement', async () => {
    setupMoneyActivityApiMock(MONEY_ACTIVITY_ACCOUNT, [
      cashbackMusdTransaction(),
    ]);
    const claim = createClaim({
      amount: '524.978',
      txHash: CASHBACK_HASH,
    });

    const { queryByTestId } = renderMoneyActivityView({
      historicalValuationsEnabled: false,
      cashbackClaim: claim,
    });

    await waitFor(() => {
      expect(
        queryByTestId(
          `${MoneyActivityItemTestIds.ROW}-cashback-claim-${claim.submittedAt}`,
        ),
      ).not.toBeOnTheScreen();
    });
  });

  it('shows a failed cashback claim in a date section', async () => {
    setupMoneyActivityApiMock(MONEY_ACTIVITY_ACCOUNT, [
      cashbackMusdTransaction(),
    ]);
    const claim = createClaim({ status: 'failed' });

    const { findByTestId, getAllByTestId, queryByTestId } =
      renderMoneyActivityView({
        historicalValuationsEnabled: false,
        cashbackClaim: claim,
      });

    const row = await findByTestId(
      `${MoneyActivityItemTestIds.ROW}-cashback-claim-${claim.submittedAt}`,
    );
    expect(
      within(row).getByTestId(MoneyActivityItemTestIds.LABEL),
    ).toHaveTextContent('mUSD back');
    expect(
      within(row).getByTestId(MoneyActivityItemTestIds.DESCRIPTION),
    ).toHaveTextContent('Failed');
    expect(
      within(row).queryByTestId(MoneyActivityItemTestIds.PENDING_SPINNER, {
        includeHiddenElements: true,
      }),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(MoneyActivityViewTestIds.PENDING_HEADER),
    ).not.toBeOnTheScreen();
    expect(
      getAllByTestId(MoneyActivityViewTestIds.DATE_HEADER).length,
    ).toBeGreaterThan(0);
  });

  it('hides a claim for another Money account', async () => {
    setupMoneyActivityApiMock(MONEY_ACTIVITY_ACCOUNT, [
      cashbackMusdTransaction(),
    ]);
    const claim = createClaim({
      moneyAddress: '0x9999999999999999999999999999999999999999',
    });

    const { queryByTestId } = renderMoneyActivityView({
      historicalValuationsEnabled: false,
      cashbackClaim: claim,
    });

    await waitFor(() => {
      expect(
        queryByTestId(
          `${MoneyActivityItemTestIds.ROW}-cashback-claim-${claim.submittedAt}`,
        ),
      ).not.toBeOnTheScreen();
    });
    expect(
      queryByTestId(MoneyActivityViewTestIds.PENDING_HEADER),
    ).not.toBeOnTheScreen();
  });
});
