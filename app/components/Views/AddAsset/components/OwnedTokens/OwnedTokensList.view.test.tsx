import '../../../../../../tests/component-view/mocks';
import { cleanup, fireEvent, waitFor } from '@testing-library/react-native';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import {
  renderFindTokensView,
  renderOwnedTokensList,
} from '../../../../../../tests/component-view/renderers/ownedTokens';
import {
  HIDDEN_OWNED_ASSET_ID,
  OWNED_TOKENS_ACCOUNT_ID,
  UNDETECTED_OWNED_ASSET_ID,
  WARNING_OWNED_ASSET_ID,
  clearOwnedTokensBalancesMock,
  setupOwnedTokensBalancesMock,
} from '../../../../../../tests/component-view/api-mocking/owned-tokens';
import { OwnedTokensTestIds, ownedTokenRowTestId } from './OwnedTokens.testIds';
import { strings } from '../../../../../../locales/i18n';
import Engine from '../../../../../core/Engine';
import NetInfo from '@react-native-community/netinfo';

const netInfoMock = NetInfo as typeof NetInfo & {
  __setMockNetInfo: (state: {
    type?: string;
    isInternetReachable?: boolean | null;
    details?: Record<string, unknown> | null;
  }) => void;
  __resetMockNetInfo: () => void;
};

const hiddenRowId = ownedTokenRowTestId(
  `${OWNED_TOKENS_ACCOUNT_ID}|${HIDDEN_OWNED_ASSET_ID}`,
);
const undetectedRowId = ownedTokenRowTestId(
  `${OWNED_TOKENS_ACCOUNT_ID}|${UNDETECTED_OWNED_ASSET_ID}`,
);
const warningRowId = ownedTokenRowTestId(
  `${OWNED_TOKENS_ACCOUNT_ID}|${WARNING_OWNED_ASSET_ID}`,
);

const sampleTokens = [
  {
    assetId: HIDDEN_OWNED_ASSET_ID,
    symbol: 'HIDE',
    name: 'Hidden Laptop',
  },
  {
    assetId: UNDETECTED_OWNED_ASSET_ID,
    symbol: 'NEW',
    name: 'New Coin',
  },
];

describeForPlatforms('OwnedTokensList', () => {
  beforeEach(() => {
    netInfoMock.__setMockNetInfo({
      type: 'wifi',
      isInternetReachable: true,
      details: { isConnectionExpensive: false },
    });
    Engine.context.AssetsController.unhideAsset = jest
      .fn()
      .mockResolvedValue(undefined);
    Engine.context.AssetsController.addCustomAsset = jest
      .fn()
      .mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    netInfoMock.__resetMockNetInfo();
    clearOwnedTokensBalancesMock();
  });

  it('lists holdings, selects a hidden token, and unhides it on the holding account', async () => {
    setupOwnedTokensBalancesMock(sampleTokens);

    const { findByTestId, getByTestId } = renderOwnedTokensList();

    fireEvent.press(await findByTestId(hiddenRowId));
    fireEvent.press(getByTestId(OwnedTokensTestIds.ADD_BUTTON));

    await waitFor(() => {
      expect(Engine.context.AssetsController.unhideAsset).toHaveBeenCalledWith(
        HIDDEN_OWNED_ASSET_ID,
      );
    });
  });

  it('filters to hidden tokens and clears them when the search does not match', async () => {
    setupOwnedTokensBalancesMock(sampleTokens);

    const { findByTestId, getByTestId, queryByTestId } =
      renderOwnedTokensList();

    fireEvent.press(await findByTestId(OwnedTokensTestIds.FILTER_HIDDEN));

    expect(await findByTestId(hiddenRowId)).toBeOnTheScreen();
    expect(queryByTestId(undetectedRowId)).toBeNull();

    fireEvent.press(getByTestId(OwnedTokensTestIds.SEARCH_BUTTON));
    fireEvent.changeText(
      getByTestId(OwnedTokensTestIds.SEARCH_INPUT),
      'missing',
    );

    expect(await findByTestId(OwnedTokensTestIds.EMPTY)).toBeOnTheScreen();
  });

  it('asks before adding a warning token and then imports it for the holding account', async () => {
    setupOwnedTokensBalancesMock([
      {
        assetId: WARNING_OWNED_ASSET_ID,
        symbol: 'WARN',
        name: 'Risky',
        labels: ['spam'],
      },
    ]);

    const { findByTestId, getByTestId } = renderOwnedTokensList();

    fireEvent.press(await findByTestId(warningRowId));
    fireEvent.press(getByTestId(OwnedTokensTestIds.ADD_BUTTON));
    fireEvent.press(await findByTestId(OwnedTokensTestIds.WARNING_CONFIRM));

    await waitFor(() => {
      expect(
        Engine.context.AssetsController.addCustomAsset,
      ).toHaveBeenCalledWith(
        'acc-1',
        WARNING_OWNED_ASSET_ID,
        expect.objectContaining({ symbol: 'WARN' }),
      );
    });
  });

  it('shows an error with retry when the balances request fails', async () => {
    setupOwnedTokensBalancesMock([], { statusCode: 500 });

    const { findByTestId } = renderOwnedTokensList();

    fireEvent.press(
      await findByTestId(OwnedTokensTestIds.RETRY, undefined, {
        timeout: 15000,
      }),
    );

    expect(await findByTestId(OwnedTokensTestIds.ERROR)).toBeOnTheScreen();
  });

  it('shows the empty state when the account holds nothing new', async () => {
    setupOwnedTokensBalancesMock([]);

    const { findByText } = renderOwnedTokensList();

    expect(
      await findByText(strings('add_asset.owned_tokens.empty')),
    ).toBeOnTheScreen();
  });

  it('hides fiat and amount while privacy mode is on', async () => {
    setupOwnedTokensBalancesMock(sampleTokens);

    const { findByTestId, queryByText } = renderOwnedTokensList({
      privacyMode: true,
    });

    expect(await findByTestId(hiddenRowId)).toBeOnTheScreen();
    expect(queryByText(/HIDE$/)).toBeNull();
  });

  it('shows a dismissible notice when some networks were not loaded', async () => {
    setupOwnedTokensBalancesMock(sampleTokens, {
      unprocessedNetworks: ['eip155:137'],
    });

    const { findByTestId, queryByTestId } = renderOwnedTokensList();

    fireEvent.press(await findByTestId(OwnedTokensTestIds.NOTICE_DISMISS));

    expect(queryByTestId(OwnedTokensTestIds.NOTICE)).toBeNull();
  });

  it('keeps Import tokens on Find tokens when the flag is off', async () => {
    const { findByTestId, queryByTestId } = renderFindTokensView();

    expect(await findByTestId('add-asset-loading-indicator')).toBeOnTheScreen();
    expect(queryByTestId(OwnedTokensTestIds.MODE_SWITCH)).toBeNull();
  });
});
