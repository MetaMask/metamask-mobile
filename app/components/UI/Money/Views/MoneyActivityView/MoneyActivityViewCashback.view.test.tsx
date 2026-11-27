import '../../../../../../tests/component-view/mocks';
import { waitFor, within } from '@testing-library/react-native';
import NetInfo from '@react-native-community/netinfo';
import type NetInfoMock from '../../../../../__mocks__/@react-native-community/netinfo';
import Engine from '../../../../../core/Engine';
import StorageWrapper from '../../../../../store/storage-wrapper';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import {
  cashbackTransaction,
  clearAccountsTransactionsApiMocks,
  setupMoneyActivityApiMock,
} from '../../../../../../tests/component-view/api-mocking/accounts-transactions';
import { setupMoneyAccountVaultApiMock } from '../../../../../../tests/component-view/api-mocking/moneyAccountVaults';
import { renderMoneyActivityView } from '../../../../../../tests/component-view/renderers/moneyActivity';
import { MONEY_ACTIVITY_ACCOUNT } from '../../../../../../tests/component-view/presets/moneyActivity';
import { MoneyActivityItemTestIds } from '../../components/MoneyActivityItem/MoneyActivityItem.testIds';
import { MoneyActivityViewTestIds } from './MoneyActivityView.testIds';
import { cashbackClaim } from '../../__fixtures__/cashbackClaim';
import {
  CASHBACK_TX_HASH as CASHBACK_HASH,
  vaultShareValuationResponse,
} from '../../__fixtures__/vaultShareValuations';

const netInfoMock = NetInfo as unknown as typeof NetInfoMock;
const engineCall = Engine.controllerMessenger.call as unknown as jest.Mock;

const clearMoneyActivityCache = async () =>
  StorageWrapper.removeItem(
    `money.activity.page1.v1.${MONEY_ACTIVITY_ACCOUNT.toLowerCase()}`,
  );

describeForPlatforms('MoneyActivityView cashback claims', () => {
  beforeEach(async () => {
    await clearMoneyActivityCache();
    engineCall.mockReset();
    setupMoneyAccountVaultApiMock({
      valuationReply: async () =>
        vaultShareValuationResponse([], MONEY_ACTIVITY_ACCOUNT),
    });
    netInfoMock.__setMockNetInfo({ type: 'wifi', isInternetReachable: true });
  });

  afterEach(() => {
    clearAccountsTransactionsApiMocks(MONEY_ACTIVITY_ACCOUNT);
    netInfoMock.__resetMockNetInfo();
  });

  it('shows a pending cashback claim in the Pending section', async () => {
    setupMoneyActivityApiMock(MONEY_ACTIVITY_ACCOUNT, [cashbackTransaction()]);
    const claim = cashbackClaim({
      moneyAddress: MONEY_ACTIVITY_ACCOUNT,
      submittedAt: Date.now(),
    });

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
    const claim = cashbackClaim({
      amount: '524.978',
      txHash: CASHBACK_HASH,
      moneyAddress: MONEY_ACTIVITY_ACCOUNT,
      submittedAt: Date.now(),
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
    const claim = cashbackClaim({
      status: 'failed',
      moneyAddress: MONEY_ACTIVITY_ACCOUNT,
      submittedAt: Date.now(),
    });

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
    const claim = cashbackClaim({
      moneyAddress: '0x9999999999999999999999999999999999999999',
      submittedAt: Date.now(),
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
