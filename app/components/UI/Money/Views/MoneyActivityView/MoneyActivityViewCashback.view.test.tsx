import '../../../../../../tests/component-view/mocks';
import { waitFor, within } from '@testing-library/react-native';
import NetInfo from '@react-native-community/netinfo';
import type NetInfoMock from '../../../../../__mocks__/@react-native-community/netinfo';
import Engine from '../../../../../core/Engine';
import type { CardCashbackClaim } from '../../../../../core/Engine/controllers/card-controller/types';
import StorageWrapper from '../../../../../store/storage-wrapper';
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
} from '../../../../../../tests/component-view/presets/moneyActivity';
import { MoneyActivityItemTestIds } from '../../components/MoneyActivityItem/MoneyActivityItem.testIds';
import { MoneyActivityViewTestIds } from './MoneyActivityView.testIds';
import {
  CASHBACK_TX_HASH as CASHBACK_HASH,
  vaultShareValuationResponse,
} from '../../__fixtures__/vaultShareValuations';

const REWARDER_ADDRESS = '0xfe80eea4249a1f01095d35e0cf4f37367976a9f0';

const netInfoMock = NetInfo as unknown as typeof NetInfoMock;
const engineCall = Engine.controllerMessenger.call as unknown as jest.Mock;
const defaultEngineCall = engineCall.getMockImplementation() as
  | ((action: string, ...args: unknown[]) => unknown)
  | undefined;

function installMoneyApi(): void {
  engineCall.mockImplementation(async (action: string, ...args: unknown[]) => {
    if (action === 'MoneyAccountApiDataService:fetchVaultShareValuations') {
      return vaultShareValuationResponse([], MONEY_ACTIVITY_ACCOUNT);
    }
    if (action === 'MoneyAccountApiDataService:fetchVaultRate') {
      return { rate: '1.017488' };
    }
    return defaultEngineCall?.(action, ...args) ?? undefined;
  });
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

const clearMoneyActivityCache = async () =>
  StorageWrapper.removeItem(
    `money.activity.page1.v1.${MONEY_ACTIVITY_ACCOUNT.toLowerCase()}`,
  );

describeForPlatforms('MoneyActivityView cashback claims', () => {
  const createClaim = (
    overrides: Partial<CardCashbackClaim> = {},
  ): CardCashbackClaim => ({
    status: 'pending',
    amount: '0.3',
    moneyAddress: MONEY_ACTIVITY_ACCOUNT,
    submittedAt: Date.now(),
    txHash: null,
    ...overrides,
  });

  beforeEach(async () => {
    await clearMoneyActivityCache();
    engineCall.mockReset();
    installMoneyApi();
    netInfoMock.__setMockNetInfo({ type: 'wifi', isInternetReachable: true });
  });

  afterEach(() => {
    clearAccountsTransactionsApiMocks(MONEY_ACTIVITY_ACCOUNT);
    netInfoMock.__resetMockNetInfo();
  });

  it('shows a pending cashback claim in the Pending section', async () => {
    setupMoneyActivityApiMock(MONEY_ACTIVITY_ACCOUNT, [cashbackTransaction()]);
    const claim = createClaim();

    const { findByTestId, getByTestId } = renderMoneyActivityView({
      historicalValuationsEnabled: true,
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
    setupMoneyActivityApiMock(MONEY_ACTIVITY_ACCOUNT, [cashbackTransaction()]);
    const claim = createClaim({
      amount: '524.978',
      txHash: CASHBACK_HASH,
    });

    const { getByTestId, queryByTestId } = renderMoneyActivityView({
      historicalValuationsEnabled: true,
      cashbackClaim: claim,
    });

    await waitFor(() => {
      expect(
        getByTestId(`${MoneyActivityItemTestIds.ROW}-${CASHBACK_HASH}`),
      ).toBeOnTheScreen();
    });
    expect(
      queryByTestId(
        `${MoneyActivityItemTestIds.ROW}-cashback-claim-${claim.submittedAt}`,
      ),
    ).not.toBeOnTheScreen();
  });

  it('shows a failed cashback claim in a date section', async () => {
    setupMoneyActivityApiMock(MONEY_ACTIVITY_ACCOUNT, [cashbackTransaction()]);
    const claim = createClaim({ status: 'failed' });

    const { findByTestId, getAllByTestId, queryByTestId } =
      renderMoneyActivityView({
        historicalValuationsEnabled: true,
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
    setupMoneyActivityApiMock(MONEY_ACTIVITY_ACCOUNT, [cashbackTransaction()]);
    const claim = createClaim({
      moneyAddress: '0x9999999999999999999999999999999999999999',
    });

    const { getByTestId, queryByTestId } = renderMoneyActivityView({
      historicalValuationsEnabled: true,
      cashbackClaim: claim,
    });

    await waitFor(() => {
      expect(
        getByTestId(`${MoneyActivityItemTestIds.ROW}-${CASHBACK_HASH}`),
      ).toBeOnTheScreen();
    });
    expect(
      queryByTestId(
        `${MoneyActivityItemTestIds.ROW}-cashback-claim-${claim.submittedAt}`,
      ),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(MoneyActivityViewTestIds.PENDING_HEADER),
    ).not.toBeOnTheScreen();
  });
});
