import '../../../../../../tests/component-view/mocks';
import type { IntentEntry, UpgradeEntry } from '@metamask/chomp-api-service';
import { renderMoneyAccountStatusView } from '../../../../../../tests/component-view/renderers/money';
import { MONEY_ACCOUNT_ADDRESS } from '../../../../../../tests/component-view/presets/money';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import { MoneyAccountStatusViewTestIds } from './MoneyAccountStatusView.testIds';
import { act, waitFor, within } from '@testing-library/react-native';
import Engine from '../../../../../core/Engine';

const mockMessengerCall = Engine.controllerMessenger.call as jest.Mock;

const UPGRADE: UpgradeEntry = {
  signerAddress: MONEY_ACCOUNT_ADDRESS,
  chainId: '0x8f',
  nonce: '0x0',
  authorization: {
    r: '0x1',
    s: '0x2',
    v: 27,
    yParity: 0,
    address: '0x0000000000000000000000000000000000000002',
    chainId: '0x8f',
    nonce: '0x0',
  },
  status: 'upgraded',
  createdAt: '2026-10-01T00:00:00.000Z',
};

const INTENT: IntentEntry = {
  account: MONEY_ACCOUNT_ADDRESS,
  delegationHash: '0xabc',
  chainId: '0x8f',
  status: 'active',
  metadata: {
    allowance: '0x1',
    tokenAddress: '0x0000000000000000000000000000000000000003',
    tokenSymbol: 'mUSD',
    type: 'cash-deposit',
  },
};

const UPGRADE_RECORD = {
  [MONEY_ACCOUNT_ADDRESS]: { configFingerprint: 'abc', completedAt: 1 },
};

type ChompResponse = unknown | Error;

const mockChompResponses = ({
  associatedAddresses = [
    {
      profileId: 'profile-1',
      address: MONEY_ACCOUNT_ADDRESS,
      status: 'active',
    },
  ],
  upgrades = [UPGRADE],
  intents = [INTENT],
}: {
  associatedAddresses?: ChompResponse;
  upgrades?: ChompResponse;
  intents?: ChompResponse;
} = {}) => {
  const respond = (response: ChompResponse) =>
    response instanceof Error
      ? Promise.reject(response)
      : Promise.resolve(response);

  mockMessengerCall.mockImplementation((action: string) => {
    switch (action) {
      case 'ChompApiService:getAssociatedAddresses':
        return respond(associatedAddresses);
      case 'ChompApiService:getUpgrades':
        return respond(upgrades);
      case 'ChompApiService:getIntentsByAddress':
        return respond(intents);
      default:
        return Promise.resolve(undefined);
    }
  });
};

describeForPlatforms('MoneyAccountStatusView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the address, every registration signal and the CHOMP entries once loaded', async () => {
    mockChompResponses();

    const { findByTestId, getByTestId } = renderMoneyAccountStatusView({
      upgradedAccounts: UPGRADE_RECORD,
    });

    const summary = await findByTestId(MoneyAccountStatusViewTestIds.SUMMARY);
    await waitFor(() =>
      expect(within(summary).getByText('Registered')).toBeOnTheScreen(),
    );
    expect(
      within(getByTestId(MoneyAccountStatusViewTestIds.ADDRESS)).getByText(
        MONEY_ACCOUNT_ADDRESS,
      ),
    ).toBeOnTheScreen();
    for (const rowTestId of [
      MoneyAccountStatusViewTestIds.ASSOCIATION_ROW,
      MoneyAccountStatusViewTestIds.UPGRADE_ROW,
      MoneyAccountStatusViewTestIds.INTENTS_ROW,
      MoneyAccountStatusViewTestIds.LOCAL_RECORD_ROW,
    ]) {
      expect(
        within(getByTestId(rowTestId)).getByText('Complete'),
      ).toBeOnTheScreen();
    }
    const upgradeEntry = getByTestId(
      `${MoneyAccountStatusViewTestIds.UPGRADE_ENTRY}-${UPGRADE.chainId}`,
    );
    expect(within(upgradeEntry).getByText('Chain 0x8f')).toBeOnTheScreen();
    expect(within(upgradeEntry).getByText('upgraded')).toBeOnTheScreen();
    const intentEntry = getByTestId(
      `${MoneyAccountStatusViewTestIds.INTENT_ENTRY}-${INTENT.delegationHash}`,
    );
    expect(
      within(intentEntry).getByText('mUSD · cash-deposit'),
    ).toBeOnTheScreen();
    expect(within(intentEntry).getByText('active')).toBeOnTheScreen();
    expect(mockMessengerCall).toHaveBeenCalledWith(
      'ChompApiService:getUpgrades',
      MONEY_ACCOUNT_ADDRESS,
    );
    expect(mockMessengerCall).toHaveBeenCalledWith(
      'ChompApiService:getIntentsByAddress',
      MONEY_ACCOUNT_ADDRESS,
    );
  });

  it('summarises a stuck pending upgrade with no intents as incomplete', async () => {
    mockChompResponses({
      upgrades: [{ ...UPGRADE, status: 'pending' }],
      intents: [],
    });

    const { findByTestId, getByTestId } = renderMoneyAccountStatusView();

    const summary = await findByTestId(MoneyAccountStatusViewTestIds.SUMMARY);
    await waitFor(() =>
      expect(within(summary).getByText('Incomplete')).toBeOnTheScreen(),
    );
    expect(
      within(getByTestId(MoneyAccountStatusViewTestIds.UPGRADE_ROW)).getByText(
        'Pending',
      ),
    ).toBeOnTheScreen();
    expect(
      within(getByTestId(MoneyAccountStatusViewTestIds.INTENTS_ROW)).getByText(
        'Missing',
      ),
    ).toBeOnTheScreen();
    expect(
      within(
        getByTestId(MoneyAccountStatusViewTestIds.LOCAL_RECORD_ROW),
      ).getByText('Missing'),
    ).toBeOnTheScreen();
  });

  it('shows the request error and recovers after pull to refresh', async () => {
    mockChompResponses({ upgrades: new Error('CHOMP unavailable') });
    const { findByTestId, getByTestId, queryByTestId } =
      renderMoneyAccountStatusView({ upgradedAccounts: UPGRADE_RECORD });
    expect(
      await findByTestId(MoneyAccountStatusViewTestIds.ERROR_BANNER),
    ).toBeOnTheScreen();
    expect(
      within(getByTestId(MoneyAccountStatusViewTestIds.UPGRADE_ROW)).getByText(
        'Unknown',
      ),
    ).toBeOnTheScreen();
    mockChompResponses();

    await act(async () => {
      await getByTestId(
        MoneyAccountStatusViewTestIds.SCROLL_VIEW,
      ).props.refreshControl.props.onRefresh();
    });

    await waitFor(() =>
      expect(
        queryByTestId(MoneyAccountStatusViewTestIds.ERROR_BANNER),
      ).not.toBeOnTheScreen(),
    );
    expect(
      within(getByTestId(MoneyAccountStatusViewTestIds.SUMMARY)).getByText(
        'Registered',
      ),
    ).toBeOnTheScreen();
    expect(mockMessengerCall).toHaveBeenCalledWith(
      'ChompApiService:invalidateQueries',
    );
  });

  it('shows the no-account banner without calling CHOMP when there is no Money account', async () => {
    mockChompResponses();

    const { findByTestId, queryByTestId } = renderMoneyAccountStatusView({
      hasMoneyAccount: false,
    });

    expect(
      await findByTestId(MoneyAccountStatusViewTestIds.NO_ACCOUNT_BANNER),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(MoneyAccountStatusViewTestIds.SUMMARY),
    ).not.toBeOnTheScreen();
    const chompCalls = mockMessengerCall.mock.calls.filter(([action]) =>
      String(action).startsWith('ChompApiService:'),
    );
    expect(chompCalls).toEqual([]);
  });
});
