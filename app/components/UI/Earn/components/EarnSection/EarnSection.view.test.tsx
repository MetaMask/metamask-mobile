import '../../../../../../tests/component-view/mocks';
import { act, fireEvent, within } from '@testing-library/react-native';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import {
  createEarnMoneyBalanceResponse,
  renderEarnSectionWithRoutes,
  resetEarnDataServiceMocks,
} from '../../../../../../tests/component-view/renderers/earn';
import {
  EARN_TEST_ACCOUNT_ADDRESS,
  EARN_TEST_USDC_ASSET_ID,
  EARN_TEST_USDC_CHECKSUM_ADDRESS,
} from '../../../../../../tests/component-view/presets/earn';
import { getRouteParamsProbeTestId } from '../../../../../../tests/component-view/render';
import type { DeepPartial } from '../../../../../util/test/renderWithProvider';
import type { RootState } from '../../../../../reducers';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { MUSD_TOKEN_ADDRESS } from '../../constants/musd';
import { HomeSectionNames } from '../../../../Views/Homepage/hooks/useHomeViewedEvent';
import { homepageSectionTitleTestId } from '../../../../Views/Homepage/Homepage.testIds';
import { TokenDetailsSource } from '../../../TokenDetails/constants/constants';
import { EarnSectionTestIds } from './EarnSection.testIds';

const zeroBalanceOverrides = {
  engine: {
    backgroundState: {
      TokenBalancesController: {
        tokenBalances: {
          [EARN_TEST_ACCOUNT_ADDRESS]: {
            '0x1': {
              [EARN_TEST_USDC_CHECKSUM_ADDRESS]: '0x0',
            },
          },
        },
      },
    },
  },
} as unknown as DeepPartial<RootState>;

const EARN_TITLE_TEST_ID = homepageSectionTitleTestId(HomeSectionNames.EARN);

const emptyLendingMarketsOverrides = {
  engine: {
    backgroundState: {
      EarnController: {
        lending: {
          markets: [],
        },
      },
    },
  },
} as unknown as DeepPartial<RootState>;

const noFeeDisabledOverrides = {
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          confirmations_relay_fixed_spread: null,
        },
      },
    },
  },
} as unknown as DeepPartial<RootState>;

const noFeeEnabledOverrides = {
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          confirmations_relay_fixed_spread: {
            chains: {
              ethereum: '0x1',
              monad: CHAIN_IDS.MONAD,
            },
            tokens: {
              usdc: EARN_TEST_USDC_CHECKSUM_ADDRESS,
              musd: MUSD_TOKEN_ADDRESS,
            },
            routes: [['ethereum', 'usdc', 'monad', 'musd']],
          },
        },
      },
    },
  },
} as unknown as DeepPartial<RootState>;

const createDeferred = <T,>() => {
  let resolvePromise: (value: T) => void = () => undefined;
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve;
  });

  return {
    promise,
    resolve: resolvePromise,
  };
};

describeForPlatforms('EarnSection - Component Tests', () => {
  afterEach(() => {
    resetEarnDataServiceMocks();
  });

  it('renders the Earn section title', async () => {
    const { findByTestId } = renderEarnSectionWithRoutes();

    expect(await findByTestId(EARN_TITLE_TEST_ID)).toBeOnTheScreen();
  });

  it('renders the unfunded Money account card state with "New" tag', async () => {
    const { findByTestId } = renderEarnSectionWithRoutes({
      dataServiceResponses: {
        moneyBalance: createEarnMoneyBalanceResponse('0'),
      },
    });

    const moneyCard = await findByTestId(EarnSectionTestIds.MONEY_ACCOUNT_CARD);

    expect(
      await within(moneyCard).findByText(
        strings('money.asset_overview.cta.start_earning'),
      ),
    ).toBeOnTheScreen();
    expect(
      within(moneyCard).getByTestId(EarnSectionTestIds.MONEY_ACCOUNT_NEW_TAG),
    ).toBeOnTheScreen();
  });

  it('renders the funded Money account card with balance without "New" tag', async () => {
    const { findByTestId } = renderEarnSectionWithRoutes({
      dataServiceResponses: {
        moneyBalance: createEarnMoneyBalanceResponse('10000000'),
      },
    });

    const moneyCard = await findByTestId(EarnSectionTestIds.MONEY_ACCOUNT_CARD);

    expect(await within(moneyCard).findByText('$10.00')).toBeOnTheScreen();
    expect(
      within(moneyCard).queryByTestId(EarnSectionTestIds.MONEY_ACCOUNT_NEW_TAG),
    ).not.toBeOnTheScreen();
  });

  it('renders asset card with lending token metadata, APY, and avatar', async () => {
    const { findByTestId } = renderEarnSectionWithRoutes({
      overrides: zeroBalanceOverrides,
    });

    const assetCard = await findByTestId(EarnSectionTestIds.ASSET_CARD(0));

    expect(within(assetCard).getByText('USDC')).toBeOnTheScreen();
    expect(within(assetCard).getByText('USD Coin')).toBeOnTheScreen();
    expect(
      within(assetCard).getByText(
        strings('earn_module.rate_apy', { percentage: '4.2' }),
      ),
    ).toBeOnTheScreen();
    expect(
      within(assetCard).getByTestId(EarnSectionTestIds.ASSET_AVATAR(0)),
    ).toBeOnTheScreen();
    expect(
      within(assetCard).queryByText(strings('earn_module.get_started')),
    ).not.toBeOnTheScreen();
  });

  it('renders the No fee tag for a subsidized Money deposit asset', async () => {
    const { findByTestId } = renderEarnSectionWithRoutes({
      overrides: noFeeEnabledOverrides,
    });

    const assetCard = await findByTestId(EarnSectionTestIds.ASSET_CARD(0));

    expect(
      await within(assetCard).findByTestId(
        EarnSectionTestIds.ASSET_NO_FEE_TAG(0),
      ),
    ).toBeOnTheScreen();
  });

  it('hides the No fee tag for an unsubsidized Money deposit asset', async () => {
    const { findByTestId } = renderEarnSectionWithRoutes({
      overrides: noFeeDisabledOverrides,
    });

    const assetCard = await findByTestId(EarnSectionTestIds.ASSET_CARD(0));

    expect(
      within(assetCard).queryByTestId(EarnSectionTestIds.ASSET_NO_FEE_TAG(0)),
    ).not.toBeOnTheScreen();
  });

  it('renders a Money balance skeleton while the balance request is pending', async () => {
    const balanceRequest =
      createDeferred<ReturnType<typeof createEarnMoneyBalanceResponse>>();
    const { findByTestId } = renderEarnSectionWithRoutes({
      dataServiceResponses: {
        moneyBalance: balanceRequest.promise,
      },
    });

    expect(
      await findByTestId(EarnSectionTestIds.MONEY_ACCOUNT_BALANCE_SKELETON),
    ).toBeOnTheScreen();

    await act(async () => {
      balanceRequest.resolve(createEarnMoneyBalanceResponse('0'));
      await balanceRequest.promise;
    });
  });

  it('renders a Money APY skeleton while the APY request is pending', async () => {
    const apyRequest = createDeferred<number>();
    const { findByTestId } = renderEarnSectionWithRoutes({
      overrides: {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                earnMoneyVaultApyControl: {
                  vaultApyOverride: undefined,
                  vaultApyFallback: undefined,
                },
              },
            },
          },
        },
      },
      dataServiceResponses: {
        vaultApy: apyRequest.promise,
      },
    });

    expect(
      await findByTestId(EarnSectionTestIds.MONEY_ACCOUNT_APY_SKELETON),
    ).toBeOnTheScreen();

    await act(async () => {
      apyRequest.resolve(0.062);
      await apyRequest.promise;
    });
  });

  it('renders unavailable Money APY copy after the APY request settles without a value', async () => {
    const { findByTestId } = renderEarnSectionWithRoutes({
      overrides: {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                earnMoneyVaultApyControl: {
                  vaultApyOverride: undefined,
                  vaultApyFallback: undefined,
                },
              },
            },
          },
        },
      },
      dataServiceResponses: {
        vaultApy: 'unavailable',
      },
    });

    const moneyCard = await findByTestId(EarnSectionTestIds.MONEY_ACCOUNT_CARD);

    expect(
      await within(moneyCard).findByText(
        strings('earn_module.rate_unavailable'),
      ),
    ).toBeOnTheScreen();
    expect(
      within(moneyCard).queryByTestId(
        EarnSectionTestIds.MONEY_ACCOUNT_APY_SKELETON,
      ),
    ).not.toBeOnTheScreen();
  });

  it('renders a retryable error without hiding healthy asset cards', async () => {
    const lendingMarketsError = new Error('Lending markets unavailable');
    const { findByTestId } = renderEarnSectionWithRoutes({
      overrides: emptyLendingMarketsOverrides,
      dataServiceResponses: { lendingMarketsError },
    });

    expect(await findByTestId(EarnSectionTestIds.ERROR)).toBeOnTheScreen();
    expect(
      await findByTestId(EarnSectionTestIds.ASSET_CARD(0)),
    ).toBeOnTheScreen();
  });

  it('renders asset skeleton slots while catalogue data is loading', async () => {
    const lendingMarketsRequest = createDeferred<void>();
    const { findByTestId } = renderEarnSectionWithRoutes({
      overrides: emptyLendingMarketsOverrides,
      dataServiceResponses: {
        lendingMarketsRefresh: lendingMarketsRequest.promise,
      },
    });

    expect(
      await findByTestId(EarnSectionTestIds.ASSET_SKELETON(0)),
    ).toBeOnTheScreen();

    await act(async () => {
      lendingMarketsRequest.resolve();
      await lendingMarketsRequest.promise;
    });
  });

  it('navigates zero-balance assets to Asset Overview with asset params', async () => {
    const { findByTestId } = renderEarnSectionWithRoutes({
      overrides: zeroBalanceOverrides,
    });

    const assetCard = await findByTestId(EarnSectionTestIds.ASSET_CARD(0));

    await act(async () => {
      fireEvent.press(assetCard);
    });

    const routeParamsProbe = await findByTestId(
      getRouteParamsProbeTestId(Routes.SEND.ASSET),
    );

    const routeParams = JSON.parse(String(routeParamsProbe.props.children)) as {
      address: string;
      chainId: string;
      source: TokenDetailsSource;
    };

    expect(routeParams).toEqual(
      expect.objectContaining({
        address: EARN_TEST_USDC_CHECKSUM_ADDRESS,
        chainId: '0x1',
        source: TokenDetailsSource.ExploreEarn,
      }),
    );
  });

  it('navigates funded assets to Earn strategy selection with asset ID', async () => {
    const { findByTestId } = renderEarnSectionWithRoutes();

    const assetCard = await findByTestId(EarnSectionTestIds.ASSET_CARD(0));

    await act(async () => {
      fireEvent.press(assetCard);
    });

    const strategyParamsProbe = await findByTestId(
      getRouteParamsProbeTestId(Routes.EARN.STRATEGY_SELECTION),
    );

    const strategyParams = JSON.parse(
      String(strategyParamsProbe.props.children),
    ) as { assetId: string };

    expect(strategyParams).toEqual({
      assetId: EARN_TEST_USDC_ASSET_ID,
    });
  });
});
