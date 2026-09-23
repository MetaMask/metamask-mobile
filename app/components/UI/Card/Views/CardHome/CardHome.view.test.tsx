import '../../../../../../tests/component-view/mocks';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import Engine from '../../../../../core/Engine';
import type { RootState } from '../../../../../reducers';
import type { DeepPartial } from '../../../../../util/test/renderWithProvider';
import { renderCardHomeView } from '../../../../../../tests/component-view/renderers/cardViewRenderer';
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
const loadingLinkableCardHomeOverrides = {
  ...linkableCardHomeOverrides,
  engine: {
    ...linkableCardHomeOverrides.engine,
    backgroundState: {
      ...linkableCardHomeOverrides.engine.backgroundState,
      CardController: {
        ...linkableCardHomeOverrides.engine.backgroundState.CardController,
        cardHomeDataStatus: 'loading',
      },
    },
  },
} satisfies DeepPartial<RootState>;

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

      it('opens digital wallet instructions for an Immersve cardholder', async () => {
        const { findByTestId } = renderCardHomeView({
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

      it('opens digital wallet instructions for a Baanx international cardholder', async () => {
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

      it('hides digital wallet instructions for a Baanx US cardholder', async () => {
        const { queryByTestId } = renderCardHomeView({
          overrides: {
            engine: {
              backgroundState: {
                CardController: {
                  activeProviderId: 'baanx',
                  providerData: {
                    baanx: { location: 'us' },
                  },
                },
              },
            },
          },
        });

        await waitFor(() => {
          expect(
            queryByTestId(CardHomeSelectors.DIGITAL_WALLET_INSTRUCTIONS_ITEM),
          ).not.toBeOnTheScreen();
        });
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

    describe('when unauthenticated (teaser mode)', () => {
      it('shows CardAuthentication when Change Asset is pressed while unauthenticated', async () => {
        const { getByTestId, findByTestId, queryByTestId } = renderCardHomeView(
          {
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
          },
        );

        fireEvent.press(getByTestId(CardHomeSelectors.CHANGE_ASSET_BUTTON));

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

    it('calls CardController.logout when logout is confirmed', async () => {
      const logoutMock = Engine.context.CardController.logout as jest.Mock;
      logoutMock.mockClear();

      let confirmHandler: (() => Promise<void>) | undefined;
      jest
        .spyOn(Alert, 'alert')
        .mockImplementationOnce((_title, _msg, buttons) => {
          const destructive = buttons?.find((b) => b.style === 'destructive');
          confirmHandler = destructive?.onPress as () => Promise<void>;
        });

      const { getByTestId } = renderCardHomeView();

      fireEvent.press(getByTestId(CardHomeSelectors.LOGOUT_ITEM));

      expect(Alert.alert).toHaveBeenCalled();
      await act(async () => {
        await confirmHandler?.();
      });

      expect(logoutMock).toHaveBeenCalled();
    });
  });

  describe('Money Account linking', () => {
    it('renders link-mode content when Money Account linking is available', async () => {
      const { findByTestId } = renderCardHomeView({
        overrides: linkableCardHomeOverrides,
      });

      expect(
        await findByTestId(MoneyMetaMaskCardTestIds.LINK_CONTAINER),
      ).toBeOnTheScreen();
      expect(
        await findByTestId(MoneyMetaMaskCardTestIds.LINK_SUBTITLE),
      ).toBeOnTheScreen();
    });

    it('hides link-mode content when Money Account linking is unavailable', async () => {
      const { queryByTestId } = renderCardHomeView();

      await waitFor(() => {
        expect(
          queryByTestId(MoneyMetaMaskCardTestIds.LINK_CONTAINER),
        ).not.toBeOnTheScreen();
      });
    });

    it('keeps link-mode content visible during a CardHome data refresh', async () => {
      const { findByTestId } = renderCardHomeView({
        overrides: loadingLinkableCardHomeOverrides,
      });

      expect(
        await findByTestId(MoneyMetaMaskCardTestIds.LINK_CONTAINER),
      ).toBeOnTheScreen();
    });

    it('navigates to the Link Card sheet when link-mode content is pressed', async () => {
      const { findByTestId } = renderCardHomeView({
        overrides: linkableCardHomeOverrides,
        extraRoutes: [{ name: Routes.MONEY.MODALS.ROOT }],
      });

      fireEvent.press(
        await findByTestId(MoneyMetaMaskCardTestIds.LINK_CONTAINER),
      );

      expect(
        await findByTestId(getRouteProbeTestId(Routes.MONEY.MODALS.ROOT)),
      ).toBeOnTheScreen();
    });
  });
});
