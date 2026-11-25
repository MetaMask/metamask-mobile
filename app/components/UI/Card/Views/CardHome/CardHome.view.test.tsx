import '../../../../../../tests/component-view/mocks';
import { RefreshControl } from 'react-native';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import Engine from '../../../../../core/Engine';
import {
  CardTransactionStatus,
  CardTransactionType,
  type CardTransaction,
} from '../../../../../core/Engine/controllers/card-controller/provider-types';
import type { RootState } from '../../../../../reducers';
import type { DeepPartial } from '../../../../../util/test/renderWithProvider';
import { renderCardHomeView } from '../../../../../../tests/component-view/renderers/cardViewRenderer';
import { itForPlatforms } from '../../../../../../tests/component-view/platform';
import {
  createRouteParamsProbe,
  getRouteParamsProbeTestId,
  getRouteProbeTestId,
} from '../../../../../../tests/component-view/render';
import { CardHomeSelectors } from './CardHome.testIds';
import Routes from '../../../../../constants/navigation/Routes';
import Cashback from '../Cashback/Cashback';
import ChooseYourCard from '../ChooseYourCard/ChooseYourCard';
import CardAuthentication from '../CardAuthentication/CardAuthentication';
import { CashbackSelectors } from '../Cashback/Cashback.testIds';
import { ChooseYourCardSelectors } from '../ChooseYourCard/ChooseYourCard.testIds';
import { CardAuthenticationSelectors } from '../CardAuthentication/CardAuthentication.testIds';
import { MoneyMetaMaskCardTestIds } from '../../../Money/components/MoneyMetaMaskCard/MoneyMetaMaskCard.testIds';

const mockGetCapabilities = jest.mocked(
  Engine.context.CardController.getCapabilities,
);
const defaultCapabilities = mockGetCapabilities();

const provisionedCardHomeData = {
  walletProvisioning: {
    eligible: true,
    cardholderName: 'Test User',
    lastFour: '1234',
    network: 'MASTERCARD',
  },
};

const LINKABLE_MONEY_ACCOUNT_ADDRESS =
  '0x1234567890123456789012345678901234567890';
const LINKABLE_VEDA_ADDRESS = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
const LINKABLE_DELEGATION_CONTRACT =
  '0x9876543210987654321098765432109876543210';

const linkableCardHomeOverrides = {
  engine: {
    backgroundState: {
      GeolocationController: { location: 'US' },
      KeyringController: {
        keyrings: [
          {
            type: 'HD Key Tree',
            metadata: { id: 'wallet1' },
            accounts: [LINKABLE_MONEY_ACCOUNT_ADDRESS],
          },
        ],
      },
      MoneyAccountController: {
        moneyAccounts: {
          'account-1': {
            id: 'account-1',
            address: LINKABLE_MONEY_ACCOUNT_ADDRESS,
            type: 'eip155:eoa',
            scopes: [],
            methods: [],
            options: {
              entropy: {
                type: 'mnemonic',
                id: 'wallet1',
                derivationPath: "m/44'/60'/0'/0/0",
                groupIndex: 0,
              },
              exportable: false,
            },
          },
        },
      },
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          moneyEnableMoneyAccount: {
            enabled: true,
            minimumVersion: '0.0.0',
          },
          moneyAccountVaultConfig: { chainId: '0x8f' },
          gasFeesSponsoredNetwork: { '0x8f': true },
          cardFeature: {
            chains: {
              'eip155:143': {
                enabled: true,
                tokens: [
                  {
                    address: LINKABLE_VEDA_ADDRESS,
                    symbol: 'veda',
                    decimals: 6,
                    enabled: true,
                  },
                ],
              },
            },
          },
        },
      },
      CardController: {
        cardHomeData: {
          delegationSettings: {
            networks: [
              {
                network: 'monad',
                chainId: '0x8f',
                delegationContract: LINKABLE_DELEGATION_CONTRACT,
                tokens: {
                  veda: {
                    address: LINKABLE_VEDA_ADDRESS,
                    decimals: 6,
                  },
                },
              },
            ],
          },
        },
      },
    },
  },
} satisfies DeepPartial<RootState>;

const immersveApplePayEnabled = {
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          cardImmersveProvisioning: {
            enabled: true,
            minimumVersion: '0.0.0',
            countries: {
              NZ: {
                enabled: true,
                ios: {
                  apple_wallet: { enabled: true, minimumVersion: '0.0.0' },
                },
              },
            },
          },
        },
      },
    },
  },
} satisfies DeepPartial<RootState>;

/**
 * Immersve Apple Pay resolves only when the card's country matches an enabled
 * leaf. The instructions row is the fallback when that leaf is on and the
 * card still cannot be added.
 */
const immersveProvisioningCountry = {
  cardHomeData: {
    walletProvisioning: {
      eligible: true,
      cardholderName: 'Test User',
      lastFour: '1234',
      network: 'MASTERCARD' as const,
      countryCode: 'NZ',
    },
  },
};

describe('CardHome', () => {
  afterEach(() => {
    mockGetCapabilities.mockReturnValue(defaultCapabilities);
  });

  describe('navigation', () => {
    describe('when authenticated', () => {
      it('opens Add Funds modal with the active USDC funding token when Add Funds button is pressed', async () => {
        const { getByTestId, findByTestId } = renderCardHomeView({
          extraRoutes: [
            {
              name: Routes.CARD.MODALS.ID,
              Component: createRouteParamsProbe(Routes.CARD.MODALS.ID),
            },
          ],
        });

        fireEvent.press(getByTestId(CardHomeSelectors.ADD_FUNDS_BUTTON));

        const paramsEl = await findByTestId(
          getRouteParamsProbeTestId(Routes.CARD.MODALS.ID),
        );
        expect(paramsEl).toBeOnTheScreen();
        const params = JSON.parse(paramsEl.props.children as string);
        expect(params.screen).toBe(Routes.CARD.MODALS.ADD_FUNDS);
        expect(params.params.priorityToken.symbol).toBe('USDC');
      });

      it('opens Asset Selection modal when Change Asset button is pressed', async () => {
        const { getByTestId, findByTestId } = renderCardHomeView({
          extraRoutes: [
            {
              name: Routes.CARD.MODALS.ID,
              Component: createRouteParamsProbe(Routes.CARD.MODALS.ID),
            },
          ],
        });

        fireEvent.press(getByTestId(CardHomeSelectors.CHANGE_ASSET_BUTTON));

        const paramsEl = await findByTestId(
          getRouteParamsProbeTestId(Routes.CARD.MODALS.ID),
        );
        expect(paramsEl).toBeOnTheScreen();
        const params = JSON.parse(paramsEl.props.children as string);
        expect(params.screen).toBe(Routes.CARD.MODALS.ASSET_SELECTION);
      });

      it('opens digital wallet instructions when the platform wallet is unsupported', async () => {
        const { findByTestId } = renderCardHomeView({
          overrides: {
            ...immersveApplePayEnabled,
            engine: {
              backgroundState: {
                ...immersveApplePayEnabled.engine.backgroundState,
                CardController: {
                  ...immersveProvisioningCountry,
                  activeProviderId: 'immersve',
                  providerData: {
                    immersve: { location: 'international' },
                  },
                },
              },
            },
          },
          extraRoutes: [
            {
              name: Routes.CARD.MODALS.ID,
              Component: createRouteParamsProbe(Routes.CARD.MODALS.ID),
            },
          ],
        });

        fireEvent.press(
          await findByTestId(
            CardHomeSelectors.DIGITAL_WALLET_INSTRUCTIONS_ITEM,
          ),
        );

        const paramsEl = await findByTestId(
          getRouteParamsProbeTestId(Routes.CARD.MODALS.ID),
        );
        const params = JSON.parse(paramsEl.props.children as string);
        expect(params.screen).toBe(
          Routes.CARD.MODALS.DIGITAL_WALLET_INSTRUCTIONS,
        );
      });

      it('opens digital wallet instructions for Baanx when Apple Pay is unsupported', async () => {
        const { findByTestId } = renderCardHomeView({
          overrides: {
            engine: {
              backgroundState: {
                CardController: {
                  activeProviderId: 'baanx',
                  providerData: {
                    baanx: { location: 'international' },
                  },
                },
              },
            },
          },
          extraRoutes: [
            {
              name: Routes.CARD.MODALS.ID,
              Component: createRouteParamsProbe(Routes.CARD.MODALS.ID),
            },
          ],
        });

        fireEvent.press(
          await findByTestId(
            CardHomeSelectors.DIGITAL_WALLET_INSTRUCTIONS_ITEM,
          ),
        );

        const paramsEl = await findByTestId(
          getRouteParamsProbeTestId(Routes.CARD.MODALS.ID),
        );
        const params = JSON.parse(paramsEl.props.children as string);
        expect(params.screen).toBe(
          Routes.CARD.MODALS.DIGITAL_WALLET_INSTRUCTIONS,
        );
      });

      it('keeps digital wallet instructions when Apple Pay is supported but the card cannot be added', async () => {
        mockGetCapabilities.mockReturnValue({
          ...defaultCapabilities,
          pushProvisioning: { applePay: true, googlePay: true },
        });

        const { findByTestId } = renderCardHomeView({
          overrides: {
            ...immersveApplePayEnabled,
            engine: {
              backgroundState: {
                ...immersveApplePayEnabled.engine.backgroundState,
                CardController: {
                  ...immersveProvisioningCountry,
                  activeProviderId: 'immersve',
                  providerData: {
                    immersve: { location: 'international' },
                  },
                },
              },
            },
          },
        });

        expect(
          await findByTestId(
            CardHomeSelectors.DIGITAL_WALLET_INSTRUCTIONS_ITEM,
          ),
        ).toBeOnTheScreen();
      });

      itForPlatforms(
        'hides digital wallet instructions for Immersve when Apple Pay provisioning is off',
        async () => {
          const { findByTestId, queryByTestId } = renderCardHomeView({
            overrides: {
              engine: {
                backgroundState: {
                  CardController: {
                    activeProviderId: 'immersve',
                    providerData: {
                      immersve: { location: 'international' },
                    },
                  },
                },
              },
            },
          });

          await findByTestId(CardHomeSelectors.MANAGE_SPENDING_LIMIT_ITEM);

          expect(
            queryByTestId(CardHomeSelectors.DIGITAL_WALLET_INSTRUCTIONS_ITEM),
          ).not.toBeOnTheScreen();
        },
        'ios',
      );

      it('shows digital wallet instructions when the wallet does not report the card as provisioned', async () => {
        mockGetCapabilities.mockReturnValue({
          ...defaultCapabilities,
          pushProvisioning: { applePay: true, googlePay: true },
        });

        const { findByTestId } = renderCardHomeView({
          overrides: {
            engine: {
              backgroundState: {
                CardController: {
                  cardHomeData: provisionedCardHomeData,
                },
              },
            },
          },
        });

        expect(
          await findByTestId(
            CardHomeSelectors.DIGITAL_WALLET_INSTRUCTIONS_ITEM,
          ),
        ).toBeOnTheScreen();
      });

      it('opens Spending Limit screen with flow=manage when Manage Spending Limit button is pressed', async () => {
        const { getByTestId, findByTestId } = renderCardHomeView({
          extraRoutes: [
            {
              name: Routes.CARD.SPENDING_LIMIT,
              Component: createRouteParamsProbe(Routes.CARD.SPENDING_LIMIT),
            },
          ],
        });

        fireEvent.press(
          getByTestId(CardHomeSelectors.MANAGE_SPENDING_LIMIT_ITEM),
        );

        const paramsEl = await findByTestId(
          getRouteParamsProbeTestId(Routes.CARD.SPENDING_LIMIT),
        );
        expect(paramsEl).toBeOnTheScreen();
        const params = JSON.parse(paramsEl.props.children as string);
        expect(params.flow).toBe('manage');
      });

      it('opens Contact Details for a fully set up Immersve card', async () => {
        mockGetCapabilities.mockReturnValue({
          ...defaultCapabilities,
          supportsContactDetails: true,
        });
        const { getByTestId, findByTestId } = renderCardHomeView({
          overrides: {
            engine: {
              backgroundState: {
                CardController: {
                  activeProviderId: 'immersve',
                  providerData: {
                    immersve: { location: 'international' },
                  },
                },
              },
            },
          },
          extraRoutes: [{ name: Routes.CARD.CONTACT_DETAILS }],
        });

        fireEvent.press(getByTestId(CardHomeSelectors.CONTACT_DETAILS_ITEM));

        expect(
          await findByTestId(getRouteProbeTestId(Routes.CARD.CONTACT_DETAILS)),
        ).toBeOnTheScreen();
      });

      it('opens Cashback screen showing balance and withdrawal button when Cashback button is pressed', async () => {
        const { getByTestId, findByTestId } = renderCardHomeView({
          extraRoutes: [{ name: Routes.CARD.CASHBACK, Component: Cashback }],
        });

        fireEvent.press(getByTestId(CardHomeSelectors.CASHBACK_ITEM));

        expect(
          await findByTestId(CashbackSelectors.CONTAINER),
        ).toBeOnTheScreen();
        expect(
          await findByTestId(CashbackSelectors.BALANCE_TITLE),
        ).toBeOnTheScreen();
        expect(
          await findByTestId(CashbackSelectors.WITHDRAW_BUTTON),
        ).toBeOnTheScreen();
      });

      it('opens Choose Your Card screen showing card carousel and upgrade button when Order Metal Card button is pressed', async () => {
        const { getByTestId, findByTestId } = renderCardHomeView({
          overrides: {
            engine: {
              backgroundState: {
                RemoteFeatureFlagController: {
                  remoteFeatureFlags: {
                    metalCardCheckoutEnabled: {
                      enabled: true,
                      minimumVersion: '7.0.0',
                    },
                  },
                },
              },
            },
          },
          extraRoutes: [
            {
              name: Routes.CARD.CHOOSE_YOUR_CARD,
              Component: ChooseYourCard,
            },
          ],
        });

        fireEvent.press(getByTestId(CardHomeSelectors.ORDER_METAL_CARD_ITEM));

        expect(
          await findByTestId(ChooseYourCardSelectors.CONTAINER),
        ).toBeOnTheScreen();
        expect(
          await findByTestId(ChooseYourCardSelectors.TITLE),
        ).toBeOnTheScreen();
        expect(
          await findByTestId(ChooseYourCardSelectors.CARD_CAROUSEL),
        ).toBeOnTheScreen();
        expect(
          await findByTestId(ChooseYourCardSelectors.CONTINUE_BUTTON),
        ).toBeOnTheScreen();
      });
    });

    describe('when unauthenticated', () => {
      it('sends a logged-out cardholder to Card login', async () => {
        const { findByTestId, queryByTestId } = renderCardHomeView({
          overrides: {
            engine: {
              backgroundState: {
                CardController: { isAuthenticated: false },
              },
            },
          },
          extraRoutes: [
            {
              name: Routes.CARD.AUTHENTICATION,
              Component: CardAuthentication,
            },
          ],
        });

        expect(
          await findByTestId(CardAuthenticationSelectors.COUNTRY_SELECT),
        ).toBeOnTheScreen();
        expect(
          await findByTestId(CardAuthenticationSelectors.VERIFY_ACCOUNT_BUTTON),
        ).toBeOnTheScreen();
        expect(
          queryByTestId(CardAuthenticationSelectors.SIGNUP_BUTTON),
        ).toBeNull();
        expect(
          queryByTestId(CardAuthenticationSelectors.EMAIL_FIELD),
        ).toBeNull();
        expect(
          queryByTestId(CardAuthenticationSelectors.PASSWORD_FIELD),
        ).toBeNull();
      });
    });
  });

  describe('actions', () => {
    it('calls fetchCardHomeData when Try Again is pressed on the error screen', async () => {
      const fetchMock = Engine.context.CardController
        .fetchCardHomeData as jest.Mock;
      fetchMock.mockClear();

      const { getByTestId } = renderCardHomeView({
        overrides: {
          engine: {
            backgroundState: {
              CardController: {
                cardHomeDataStatus: 'error',
                cardHomeData: null,
              },
            },
          },
        },
      });

      fireEvent.press(getByTestId(CardHomeSelectors.TRY_AGAIN_BUTTON));

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalled();
      });
    });

    it('does not show logout on Card home after the footer loads', async () => {
      const { findByTestId, queryByTestId } = renderCardHomeView();

      expect(
        await findByTestId(CardHomeSelectors.CONTACT_SUPPORT_ITEM),
      ).toBeOnTheScreen();

      expect(
        queryByTestId(CardHomeSelectors.LOGOUT_ITEM),
      ).not.toBeOnTheScreen();
    });
  });

  describe('Home segments', () => {
    const listTransactions = Engine.context.CardController
      .listTransactions as jest.Mock;

    const recentTransaction: CardTransaction = {
      id: 'view-tx-1',
      providerId: 'baanx',
      timestamp: Date.now(),
      status: CardTransactionStatus.Completed,
      type: CardTransactionType.Purchase,
      isDebit: true,
      billingAmount: { value: '6.45', currency: 'USD' },
      merchant: { name: 'Pret A Manger' },
      fundingSources: [],
    };

    const historyOverrides = {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              cardTransactionHistory: {
                enabled: true,
                minimumVersion: '0.0.0',
              },
            },
          },
        },
      },
    };

    beforeEach(() => {
      mockGetCapabilities.mockReturnValue({
        ...defaultCapabilities,
        supportsTransactionHistory: true,
      });
      listTransactions.mockReset();
      listTransactions.mockResolvedValue({ items: [] });
    });

    afterEach(() => {
      mockGetCapabilities.mockReturnValue(defaultCapabilities);
    });

    const openActivity = async (
      view: ReturnType<typeof renderCardHomeView>,
    ) => {
      fireEvent.press(
        await view.findByTestId(CardHomeSelectors.ACTIVITY_SEGMENT),
      );
    };

    it('shows Manage by default and the latest transactions on Activity', async () => {
      listTransactions.mockResolvedValue({ items: [recentTransaction] });
      const view = renderCardHomeView({ overrides: historyOverrides });

      expect(
        await view.findByTestId(CardHomeSelectors.HOME_SEGMENTS),
      ).toBeOnTheScreen();
      expect(
        view.getByTestId(CardHomeSelectors.CHANGE_ASSET_BUTTON),
      ).toBeOnTheScreen();
      expect(view.queryByTestId(CardHomeSelectors.RECENT_ACTIVITY)).toBeNull();

      await openActivity(view);

      expect(
        await view.findByTestId(CardHomeSelectors.RECENT_ACTIVITY),
      ).toBeOnTheScreen();
      expect(await view.findByText('Pret A Manger')).toBeOnTheScreen();
      expect(
        view.getByTestId(CardHomeSelectors.RECENT_ACTIVITY_SEE_ALL),
      ).toBeOnTheScreen();
      expect(
        view.queryByTestId(CardHomeSelectors.CHANGE_ASSET_BUTTON),
      ).toBeNull();
    });

    it('opens Transaction history from See all', async () => {
      listTransactions.mockResolvedValue({ items: [recentTransaction] });
      const view = renderCardHomeView({
        overrides: historyOverrides,
        extraRoutes: [
          { name: Routes.CARD.TRANSACTION_HISTORY },
          { name: Routes.CARD.TRANSACTION_DETAILS },
        ],
      });

      await openActivity(view);
      fireEvent.press(
        await view.findByTestId(CardHomeSelectors.RECENT_ACTIVITY_SEE_ALL),
      );
      expect(
        await view.findByTestId(
          getRouteProbeTestId(Routes.CARD.TRANSACTION_HISTORY),
        ),
      ).toBeOnTheScreen();
    });

    it('opens transaction details from a recent row', async () => {
      listTransactions.mockResolvedValue({ items: [recentTransaction] });
      const view = renderCardHomeView({
        overrides: historyOverrides,
        extraRoutes: [{ name: Routes.CARD.TRANSACTION_DETAILS }],
      });

      await openActivity(view);
      fireEvent.press(
        await view.findByTestId(
          `${CardHomeSelectors.RECENT_ACTIVITY_ROW_PREFIX}view-tx-1`,
        ),
      );

      expect(
        await view.findByTestId(
          getRouteProbeTestId(Routes.CARD.TRANSACTION_DETAILS),
        ),
      ).toBeOnTheScreen();
    });

    it('shows the empty state when the feed has no transactions', async () => {
      const view = renderCardHomeView({ overrides: historyOverrides });

      await openActivity(view);

      expect(
        await view.findByTestId(CardHomeSelectors.RECENT_ACTIVITY_EMPTY),
      ).toBeOnTheScreen();
      expect(
        view.queryByTestId(CardHomeSelectors.RECENT_ACTIVITY_LOADING),
      ).toBeNull();
    });

    it('shows a spinner while the first page is loading', async () => {
      listTransactions.mockReturnValue(new Promise(() => undefined));
      const view = renderCardHomeView({ overrides: historyOverrides });

      await openActivity(view);

      expect(
        await view.findByTestId(CardHomeSelectors.RECENT_ACTIVITY_LOADING),
      ).toBeOnTheScreen();
      expect(
        view.queryByTestId(CardHomeSelectors.RECENT_ACTIVITY_EMPTY),
      ).toBeNull();
    });

    it('shows an error and retries the feed', async () => {
      listTransactions.mockRejectedValue(new Error('unavailable'));
      const view = renderCardHomeView({ overrides: historyOverrides });

      await openActivity(view);

      expect(
        await view.findByTestId(CardHomeSelectors.RECENT_ACTIVITY_ERROR),
      ).toBeOnTheScreen();
      expect(
        view.queryByTestId(CardHomeSelectors.RECENT_ACTIVITY_EMPTY),
      ).toBeNull();

      listTransactions.mockResolvedValue({ items: [recentTransaction] });
      fireEvent.press(
        view.getByTestId(CardHomeSelectors.RECENT_ACTIVITY_RETRY),
      );

      expect(await view.findByText('Pret A Manger')).toBeOnTheScreen();
    });

    it('refetches activity when the Activity tab is pulled to refresh', async () => {
      listTransactions.mockResolvedValue({ items: [recentTransaction] });
      const view = renderCardHomeView({ overrides: historyOverrides });

      await openActivity(view);
      await view.findByText('Pret A Manger');
      const callsBeforeRefresh = listTransactions.mock.calls.length;

      const refreshControl = view.UNSAFE_getByType(RefreshControl);
      await act(async () => {
        await refreshControl.props.onRefresh();
      });

      await waitFor(() =>
        expect(listTransactions.mock.calls.length).toBeGreaterThan(
          callsBeforeRefresh,
        ),
      );
    });

    it('shows the segments when the card is frozen', async () => {
      const view = renderCardHomeView({
        overrides: {
          engine: {
            backgroundState: {
              ...historyOverrides.engine.backgroundState,
              CardController: {
                cardHomeData: {
                  card: { status: 'FROZEN' },
                },
              },
            },
          },
        },
      });

      expect(
        await view.findByTestId(CardHomeSelectors.HOME_SEGMENTS),
      ).toBeOnTheScreen();
    });

    it('hides the segments while the card still needs enabling', async () => {
      const view = renderCardHomeView({
        overrides: {
          engine: {
            backgroundState: {
              ...historyOverrides.engine.backgroundState,
              CardController: {
                cardHomeData: {
                  actions: [{ type: 'enable_card' }],
                },
              },
            },
          },
        },
      });

      expect(
        await view.findByTestId(CardHomeSelectors.ENABLE_CARD_BUTTON),
      ).toBeOnTheScreen();
      expect(view.queryByTestId(CardHomeSelectors.HOME_SEGMENTS)).toBeNull();
    });

    it('hides the segments while identity is in review', async () => {
      const view = renderCardHomeView({
        overrides: {
          engine: {
            backgroundState: {
              ...historyOverrides.engine.backgroundState,
              CardController: {
                cardHomeData: {
                  alerts: [{ type: 'kyc_pending', dismissable: false }],
                },
              },
            },
          },
        },
      });

      expect(
        await view.findByTestId(CardHomeSelectors.CARD_ART),
      ).toBeOnTheScreen();
      expect(view.queryByTestId(CardHomeSelectors.HOME_SEGMENTS)).toBeNull();
    });

    it('hides the segments when signed out during identity review', async () => {
      const view = renderCardHomeView({
        initialParams: { fromKycPending: true },
        overrides: {
          engine: {
            backgroundState: {
              CardController: { isAuthenticated: false },
            },
          },
        },
      });

      expect(
        await view.findByTestId(CardHomeSelectors.CARD_ART),
      ).toBeOnTheScreen();
      expect(view.queryByTestId(CardHomeSelectors.HOME_SEGMENTS)).toBeNull();
    });

    it('hides the segments during forced UK migration', async () => {
      const view = renderCardHomeView({
        overrides: {
          engine: {
            backgroundState: {
              CardController: {
                cardHomeData: {
                  account: { countryOfResidence: 'GB' },
                },
              },
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  cardTransactionHistory: {
                    enabled: true,
                    minimumVersion: '0.0.0',
                  },
                  cardUkMigration: {
                    enabled: true,
                    minimumVersion: '0.0.0',
                    startDate: '2020-01-01T00:00:00.000Z',
                    endDate: '2020-06-01T00:00:00.000Z',
                  },
                },
              },
            },
          },
        },
      });

      expect(
        await view.findByTestId(CardHomeSelectors.CARD_ART),
      ).toBeOnTheScreen();
      expect(view.queryByTestId(CardHomeSelectors.HOME_SEGMENTS)).toBeNull();
    });
  });

  describe('Money Account linking', () => {
    it('navigates to the Link Card sheet when link-mode content is pressed', async () => {
      mockGetCapabilities.mockReturnValue({
        ...defaultCapabilities,
        supportsMoneyAccountLinking: true,
      });
      const { findByTestId } = renderCardHomeView({
        overrides: linkableCardHomeOverrides,
        extraRoutes: [{ name: Routes.MONEY.MODALS.ROOT }],
      });

      fireEvent.press(await findByTestId(MoneyMetaMaskCardTestIds.CONTENT));

      expect(
        await findByTestId(getRouteProbeTestId(Routes.MONEY.MODALS.ROOT)),
      ).toBeOnTheScreen();
    });

    it('hides the Link card CTA while the card still needs enabling', async () => {
      mockGetCapabilities.mockReturnValue({
        ...defaultCapabilities,
        supportsMoneyAccountLinking: true,
      });
      const { findByTestId, queryByTestId } = renderCardHomeView({
        overrides: {
          engine: {
            backgroundState: {
              ...linkableCardHomeOverrides.engine.backgroundState,
              CardController: {
                cardHomeData: {
                  ...linkableCardHomeOverrides.engine.backgroundState
                    .CardController.cardHomeData,
                  actions: [{ type: 'enable_card' }],
                },
              },
            },
          },
        },
      });

      expect(
        await findByTestId(CardHomeSelectors.ENABLE_CARD_BUTTON),
      ).toBeOnTheScreen();
      expect(
        queryByTestId(MoneyMetaMaskCardTestIds.LINK_SUBTITLE),
      ).not.toBeOnTheScreen();
    });
  });
});
