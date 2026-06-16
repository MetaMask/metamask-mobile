import '../../../../../../tests/component-view/mocks';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import Engine from '../../../../../core/Engine';
import { renderCardHomeView } from '../../../../../../tests/component-view/renderers/cardViewRenderer';
import {
  createRouteParamsProbe,
  getRouteParamsProbeTestId,
} from '../../../../../../tests/component-view/render';
import { CardHomeSelectors } from './CardHome.testIds';
import Routes from '../../../../../constants/navigation/Routes';
import Cashback from '../Cashback/Cashback';
import ChooseYourCard from '../ChooseYourCard/ChooseYourCard';
import CardAuthentication from '../CardAuthentication/CardAuthentication';
import { CashbackSelectors } from '../Cashback/Cashback.testIds';
import { ChooseYourCardSelectors } from '../ChooseYourCard/ChooseYourCard.testIds';
import { CardAuthenticationSelectors } from '../CardAuthentication/CardAuthentication.testIds';

describe('CardHome', () => {
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
      it('shows CardAuthentication login form when Change Asset button is pressed while unauthenticated', async () => {
        const { getByTestId, findByTestId } = renderCardHomeView({
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

        fireEvent.press(getByTestId(CardHomeSelectors.CHANGE_ASSET_BUTTON));

        expect(
          await findByTestId(CardAuthenticationSelectors.VERIFY_ACCOUNT_BUTTON),
        ).toBeOnTheScreen();
        expect(
          await findByTestId(CardAuthenticationSelectors.SIGNUP_BUTTON),
        ).toBeOnTheScreen();
        expect(
          await findByTestId(CardAuthenticationSelectors.EMAIL_FIELD),
        ).toBeOnTheScreen();
        expect(
          await findByTestId(CardAuthenticationSelectors.PASSWORD_FIELD),
        ).toBeOnTheScreen();
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
});
