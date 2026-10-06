import '../../../../../../tests/component-view/mocks';
import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react-native';
import {
  ChainId,
  StatusTypes,
  type GenericQuoteRequest,
} from '@metamask/bridge-controller';
import { strings } from '../../../../../../locales/i18n';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import { renderGachaView } from '../../../../../../tests/component-view/renderers/gacha';
import { initialStateQuickBuy } from '../../../../../../tests/component-view/presets/quickBuy';
import {
  createRouteParamsProbe,
  getRouteParamsProbeTestId,
} from '../../../../../../tests/component-view/render';
import {
  setupQuickBuyApiMock,
  clearQuickBuyApiMocks,
  createQuickBuyFetchedQuote,
} from '../../../../../../tests/component-view/api-mocking/quickBuy';
import Routes from '../../../../../constants/navigation/Routes';
import Engine from '../../../../../core/Engine';
import {
  GachaHomeTestIds,
  GachaCardTileTestIds,
  GachaCardViewTestIds,
  GachaPackCardTestIds,
  GachaPurchaseSheetTestIds,
} from '../../Gacha.testIds';
import {
  COLLECTOR_CRYPT_SCOPE,
  SOLANA_USDC_ASSET_ID,
  SOLANA_USDC_MINT,
} from '../../providers/collector-crypt/constants';
import { QuickBuySheetSelectorsIDs } from '../../../QuickBuy/QuickBuySheet.testIds';
import {
  clearSettledQuickBuyTrades,
  getTrackedQuickBuyTradeIds,
  untrackQuickBuyTrade,
} from '../../../QuickBuy/quickBuyTradeTracker';
import {
  createCard,
  createPack,
  MOCK_ACCOUNT,
  MOCK_INTERNAL_ACCOUNT,
} from '../testUtils';
import GachaCard from '../GachaCard/GachaCard';

const PACK = createPack();
const CARD = createCard();
const WAIT_MS = 8_000;
const controller = {
  getPacks: jest.fn(),
  syncCards: jest.fn(),
  recoverOperations: jest.fn(),
  generatePack: jest.fn(),
  dismissOperation: jest.fn(),
  refreshBuyback: jest.fn(),
};
const assetsController = {
  getAssets: jest.fn(),
  state: {
    assetsBalance: {
      [MOCK_ACCOUNT.id]: { [SOLANA_USDC_ASSET_ID]: { amount: '30' } },
    },
  },
};
const getHistory = jest.fn();
const submitTx = jest.fn<Promise<{ id: string }>, []>();
const fetchQuotes = jest.fn();

const deferred = <T,>() => {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
};

const renderFunding = async () => {
  const packsRequest = deferred<(typeof PACK)[]>();
  controller.getPacks.mockReturnValue(packsRequest.promise);
  const overrides = initialStateQuickBuy()
    .withOverrides({
      engine: {
        backgroundState: {
          AccountsController: {
            internalAccounts: {
              accounts: { [MOCK_ACCOUNT.id]: MOCK_INTERNAL_ACCOUNT },
              selectedAccount: MOCK_ACCOUNT.id,
            },
          },
          AccountTreeController: {
            accountTree: {
              wallets: {
                'entropy:wallet1': {
                  groups: {
                    'entropy:wallet1/0': {
                      accounts: ['acc-1', MOCK_ACCOUNT.id],
                    },
                  },
                },
              },
            },
          },
          AssetsController: {
            assetsBalance: assetsController.state.assetsBalance,
            assetsInfo: {
              [SOLANA_USDC_ASSET_ID]: {
                type: 'spl',
                name: 'USD Coin',
                symbol: 'USDC',
                decimals: 6,
              },
            },
            assetsPrice: {
              [SOLANA_USDC_ASSET_ID]: {
                assetPriceType: 'fungible',
                id: 'usdc',
                price: 1,
                usdPrice: 1,
                lastUpdated: 1,
              },
            },
          },
        },
      },
    })
    .build();
  const rendered = renderGachaView({
    usdcAmount: '30',
    cards: [CARD],
    overrides,
    routes: [
      {
        name: Routes.GACHA.REVEAL,
        Component: createRouteParamsProbe(Routes.GACHA.REVEAL),
      },
      { name: Routes.GACHA.CARD, Component: GachaCard },
      { name: Routes.BROWSER.HOME },
    ],
  });
  // Settle the initial catalogue request before exercising the funding flow.
  await act(async () => packsRequest.resolve([PACK]));
  return rendered;
};

const submitFunding = async () => {
  fireEvent.press(
    await screen.findByTestId(GachaPackCardTestIds.OPEN_BUTTON(PACK.code)),
  );
  const confirm = await screen.findByTestId(
    GachaPurchaseSheetTestIds.CONFIRM_BUTTON,
  );
  expect(confirm).toHaveTextContent(
    strings('gacha.purchase.fund_and_open', { amount: '20' }),
  );
  fireEvent.press(confirm);
  await screen.findByTestId(QuickBuySheetSelectorsIDs.CONTENT_CONTAINER);
  await waitFor(
    () =>
      expect(
        screen.getByTestId(QuickBuySheetSelectorsIDs.CONFIRM_BUTTON),
      ).toBeEnabled(),
    { timeout: WAIT_MS },
  );
  // The shared fixture prices ETH at $2,000: $20 source spend is 0.01 ETH.
  expect(fetchQuotes.mock.calls.at(-1)?.[0]).toEqual(
    expect.objectContaining({
      srcTokenAmount: '10000000000000000',
      destChainId: COLLECTOR_CRYPT_SCOPE,
      destTokenAddress: SOLANA_USDC_MINT,
      destWalletAddress: MOCK_ACCOUNT.address,
    }),
  );
  fireEvent.press(screen.getByTestId(QuickBuySheetSelectorsIDs.CONFIRM_BUTTON));
  await waitFor(() =>
    expect(Engine.context.BridgeStatusController.submitTx).toHaveBeenCalled(),
  );
  expect(
    within(
      await screen.findByTestId(GachaHomeTestIds.FUNDING_STATUS),
    ).getByText(strings('gacha.funding.funding')),
  ).toBeOnTheScreen();
};

describeForPlatforms('Gacha funding', () => {
  beforeEach(() => {
    Object.values(controller).forEach((method) => method.mockReset());
    controller.syncCards.mockResolvedValue([]);
    controller.recoverOperations.mockResolvedValue(undefined);
    controller.generatePack.mockResolvedValue('funded-pack');
    controller.refreshBuyback.mockResolvedValue({ status: 'unavailable' });
    assetsController.getAssets.mockReset().mockResolvedValue({});
    assetsController.state.assetsBalance[MOCK_ACCOUNT.id][
      SOLANA_USDC_ASSET_ID
    ].amount = '30';
    getHistory.mockReset();
    Object.assign(Engine.context, { GachaController: controller });
    Object.assign(Engine.context.AssetsController, assetsController);
    Object.assign(Engine.context.BridgeStatusController, {
      getBridgeHistoryItemByTxMetaId: getHistory,
      submitTx,
    });
    submitTx.mockReset();
    setupQuickBuyApiMock([
      {
        assetId: SOLANA_USDC_ASSET_ID,
        address: SOLANA_USDC_MINT,
        name: 'USD Coin',
        symbol: 'USDC',
        decimals: 6,
      },
    ]);
    Object.assign(Engine.context.BridgeController, { fetchQuotes });
    fetchQuotes.mockImplementation(async (params: GenericQuoteRequest) => {
      const quote = createQuickBuyFetchedQuote(
        String(params.srcTokenAmount ?? '0'),
      );
      return [
        {
          ...quote,
          quote: {
            ...quote.quote,
            destChainId: ChainId.SOLANA,
            destAsset: {
              ...quote.quote.destAsset,
              chainId: ChainId.SOLANA,
              assetId: SOLANA_USDC_ASSET_ID,
              address: SOLANA_USDC_MINT,
              symbol: 'USDC',
              decimals: 6,
            },
          },
        },
      ];
    });
  });

  afterEach(() => {
    clearQuickBuyApiMocks();
    getTrackedQuickBuyTradeIds().forEach(untrackQuickBuyTrade);
    clearSettledQuickBuyTrades();
  });

  it('shows funding progress and opens the reveal only after settlement and enough USDC', async () => {
    const submission = deferred<{ id: string }>();
    submitTx.mockReturnValue(submission.promise);
    await renderFunding();

    await submitFunding();
    expect(controller.generatePack).not.toHaveBeenCalled();
    getHistory.mockReturnValue({ status: { status: StatusTypes.COMPLETE } });
    assetsController.state.assetsBalance[MOCK_ACCOUNT.id][
      SOLANA_USDC_ASSET_ID
    ].amount = '50';
    await act(async () => submission.resolve({ id: 'funding-1' }));

    expect(
      await screen.findByTestId(getRouteParamsProbeTestId(Routes.GACHA.REVEAL)),
    ).toHaveTextContent(JSON.stringify({ memo: 'funded-pack' }));
    expect(controller.generatePack).toHaveBeenCalledTimes(1);
    expect(controller.generatePack).toHaveBeenCalledWith({
      account: MOCK_ACCOUNT,
      pack: { code: PACK.code, name: PACK.name, price: PACK.price },
    });
  });

  it('cancels automatic opening without cancelling the submitted funding', async () => {
    const submission = deferred<{ id: string }>();
    submitTx.mockReturnValue(submission.promise);
    await renderFunding();
    await submitFunding();

    fireEvent.press(
      within(screen.getByTestId(GachaHomeTestIds.FUNDING_STATUS)).getByText(
        strings('gacha.funding.cancel_opening'),
      ),
    );
    getHistory.mockReturnValue({ status: { status: StatusTypes.COMPLETE } });
    assetsController.state.assetsBalance[MOCK_ACCOUNT.id][
      SOLANA_USDC_ASSET_ID
    ].amount = '50';
    await act(async () => submission.resolve({ id: 'funding-1' }));

    expect(
      screen.queryByTestId(GachaHomeTestIds.FUNDING_STATUS),
    ).not.toBeOnTheScreen();
    expect(controller.generatePack).not.toHaveBeenCalled();
    expect(assetsController.getAssets).not.toHaveBeenCalled();
  });

  it('shows a funding failure and permits another explicit purchase attempt', async () => {
    const submission = deferred<{ id: string }>();
    submitTx.mockReturnValue(submission.promise);
    await renderFunding();
    await submitFunding();

    getHistory.mockReturnValue({ status: { status: StatusTypes.FAILED } });
    await act(async () => submission.resolve({ id: 'funding-1' }));

    expect(
      await screen.findByTestId(GachaHomeTestIds.FUNDING_ERROR),
    ).toHaveTextContent(strings('gacha.funding.failed'));
    expect(
      screen.queryByTestId(GachaHomeTestIds.FUNDING_STATUS),
    ).not.toBeOnTheScreen();
    expect(
      screen.getByTestId(GachaPackCardTestIds.OPEN_BUTTON(PACK.code)),
    ).toBeEnabled();
    expect(controller.generatePack).not.toHaveBeenCalled();
  });

  it('retains automatic opening on a card but revokes it when its link leaves Gacha', async () => {
    const submission = deferred<{ id: string }>();
    submitTx.mockReturnValue(submission.promise);
    await renderFunding();
    await submitFunding();

    fireEvent.press(screen.getByTestId(GachaHomeTestIds.CARDS_TAB));
    fireEvent.press(
      await screen.findByTestId(GachaCardTileTestIds.TILE(CARD.mint)),
    );
    fireEvent.press(
      await screen.findByTestId(GachaCardViewTestIds.BACK_BUTTON),
    );
    expect(
      await screen.findByTestId(GachaHomeTestIds.FUNDING_STATUS),
    ).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId(GachaCardTileTestIds.TILE(CARD.mint)));
    fireEvent.press(
      await screen.findByTestId(GachaCardViewTestIds.VIEW_ON_CC_BUTTON),
    );
    expect(
      await screen.findByTestId(`route-${Routes.BROWSER.HOME}`),
    ).toBeOnTheScreen();
    getHistory.mockReturnValue({ status: { status: StatusTypes.COMPLETE } });
    assetsController.state.assetsBalance[MOCK_ACCOUNT.id][
      SOLANA_USDC_ASSET_ID
    ].amount = '50';
    await act(async () => submission.resolve({ id: 'funding-1' }));

    expect(controller.generatePack).not.toHaveBeenCalled();
    expect(
      screen.getByTestId(`route-${Routes.BROWSER.HOME}`),
    ).toBeOnTheScreen();
  });
});
