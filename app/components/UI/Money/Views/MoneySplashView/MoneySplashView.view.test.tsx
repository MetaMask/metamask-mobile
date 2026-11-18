import '../../../../../../tests/component-view/mocks';
import NetInfo from '@react-native-community/netinfo';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import Engine from '../../../../../core/Engine';
import { getTotalMemorySync } from 'react-native-device-info';
import type NetInfoMock from '../../../../../__mocks__/@react-native-community/netinfo';
import { strings } from '../../../../../../locales/i18n';
import {
  getRouteParamsProbeTestId,
  getRouteProbeTestId,
} from '../../../../../../tests/component-view/render';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import { renderMoneySplashView } from '../../../../../../tests/component-view/renderers/moneySplash';
import Routes from '../../../../../constants/navigation/Routes';
import { MoneySplashViewTestIds } from './MoneySplashView.testIds';

const PREFERRED_PAYMENT_TOKEN = {
  address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  chainId: '0x1',
};

const netInfoMock = NetInfo as unknown as typeof NetInfoMock;
const mockGetTotalMemorySync = jest.mocked(getTotalMemorySync);

describeForPlatforms('MoneySplashView', () => {
  beforeEach(() => {
    netInfoMock.__setMockNetInfo({ type: 'wifi', isInternetReachable: true });
    mockGetTotalMemorySync.mockReturnValue(6 * 1024 ** 3);
  });

  afterEach(() => {
    netInfoMock.__resetMockNetInfo();
  });

  it('shows the hero, title and benefits, then opens the confirmation with the preferred payment token on CTA press', async () => {
    const { getByTestId, getByText, findByTestId } = renderMoneySplashView({
      params: {
        postOnboardingRedirect: {
          type: 'deposit',
          preferredPaymentToken: PREFERRED_PAYMENT_TOKEN,
        },
      },
    });

    expect(getByTestId(MoneySplashViewTestIds.HERO)).toBeOnTheScreen();
    expect(getByText(strings('money.splash.title'))).toBeOnTheScreen();
    expect(
      getByTestId(MoneySplashViewTestIds.BENEFIT_ROW(1)),
    ).toBeOnTheScreen();
    expect(
      getByTestId(MoneySplashViewTestIds.BENEFIT_ROW(5)),
    ).toBeOnTheScreen();

    fireEvent.press(getByTestId(MoneySplashViewTestIds.CTA));

    const confirmationParams = await findByTestId(
      getRouteParamsProbeTestId(Routes.MONEY.CONFIRMATIONS_ROOT),
    );
    const params = JSON.parse(confirmationParams.props.children as string) as {
      params: { preferredPaymentToken: typeof PREFERRED_PAYMENT_TOKEN };
    };
    expect(params.params.preferredPaymentToken).toEqual(
      PREFERRED_PAYMENT_TOKEN,
    );
  });

  it('renders the live APY in the body', async () => {
    const { getByText } = renderMoneySplashView({ apy: 0.062 });

    await waitFor(() => {
      expect(getByText('6.2% APY')).toBeOnTheScreen();
    });
  });

  it('renders the no-APY body when the service has no APY', async () => {
    const { getByTestId } = renderMoneySplashView({ apy: null });

    await waitFor(() => {
      expect(getByTestId(MoneySplashViewTestIds.BODY)).toHaveTextContent(
        strings('money.splash.body_no_apy'),
      );
    });
  });

  it('uses the no-APY FAQ answer when the service has no APY', async () => {
    const { getByText, findByText } = renderMoneySplashView({ apy: null });

    fireEvent.press(getByText(strings('money.how_it_works_page.faq_q1')));

    expect(
      await findByText(strings('money.how_it_works_page.faq_a1_no_apy')),
    ).toBeOnTheScreen();
  });

  it('skips the APY fetch and the hero on a low-end offline device', async () => {
    mockGetTotalMemorySync.mockReturnValue(1 * 1024 ** 3);
    netInfoMock.__setMockNetInfo({
      type: 'none',
      isInternetReachable: false,
    });

    const { getByTestId, queryByTestId } = renderMoneySplashView({
      apy: 0.062,
    });

    await waitFor(() => {
      expect(getByTestId(MoneySplashViewTestIds.BODY)).toHaveTextContent(
        strings('money.splash.body_no_apy'),
      );
    });
    expect(queryByTestId(MoneySplashViewTestIds.HERO)).not.toBeOnTheScreen();
  });

  it('keeps the hero and skips the APY on a normal offline device', async () => {
    netInfoMock.__setMockNetInfo({
      type: 'none',
      isInternetReachable: false,
    });

    const { getByTestId } = renderMoneySplashView({ apy: 0.062 });

    await waitFor(() => {
      expect(getByTestId(MoneySplashViewTestIds.BODY)).toHaveTextContent(
        strings('money.splash.body_no_apy'),
      );
    });
    expect(getByTestId(MoneySplashViewTestIds.HERO)).toBeOnTheScreen();
  });

  it('falls back to Money home when deposit setup fails', async () => {
    const { getByTestId, findByTestId } = renderMoneySplashView({
      hasVaultConfig: false,
      onboardingSeen: true,
      params: {
        postOnboardingRedirect: {
          type: 'deposit',
          preferredPaymentToken: PREFERRED_PAYMENT_TOKEN,
        },
      },
    });

    fireEvent.press(getByTestId(MoneySplashViewTestIds.CTA));

    expect(
      await findByTestId(getRouteProbeTestId(Routes.HOME_TABS)),
    ).toBeOnTheScreen();
  });

  it('does not chain into Rive onboarding when deposit setup fails', async () => {
    const { getByTestId, findByTestId } = renderMoneySplashView({
      hasVaultConfig: false,
      params: {
        postOnboardingRedirect: {
          type: 'deposit',
          preferredPaymentToken: PREFERRED_PAYMENT_TOKEN,
        },
      },
    });

    fireEvent.press(getByTestId(MoneySplashViewTestIds.CTA));

    expect(
      await findByTestId(getRouteProbeTestId(Routes.HOME_TABS)),
    ).toBeOnTheScreen();
  });

  it('returns to Money home without Rive onboarding when the splash has no deposit redirect', async () => {
    const { getByTestId, queryByTestId, findByTestId } = renderMoneySplashView({
      onboardingSeen: false,
      onboardingEnabled: true,
    });

    fireEvent.press(getByTestId(MoneySplashViewTestIds.CTA));

    expect(
      await findByTestId(getRouteProbeTestId(Routes.HOME_TABS)),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(getRouteProbeTestId(Routes.MONEY.ONBOARDING)),
    ).not.toBeOnTheScreen();
  });

  it('starts only one deposit when the CTA is pressed twice', async () => {
    const { getByTestId, findByTestId } = renderMoneySplashView({
      params: {
        postOnboardingRedirect: {
          type: 'deposit',
          preferredPaymentToken: PREFERRED_PAYMENT_TOKEN,
        },
      },
    });
    const addTransactionBatch = jest.mocked(
      Engine.context.TransactionController.addTransactionBatch,
    );
    addTransactionBatch.mockClear();

    const cta = getByTestId(MoneySplashViewTestIds.CTA);
    act(() => {
      fireEvent.press(cta);
      fireEvent.press(cta);
    });

    await findByTestId(
      getRouteParamsProbeTestId(Routes.MONEY.CONFIRMATIONS_ROOT),
    );

    await waitFor(() => {
      expect(addTransactionBatch).toHaveBeenCalledTimes(1);
    });
  });

  it('marks the splash as seen on mount', async () => {
    const { store } = renderMoneySplashView();

    await waitFor(() => {
      expect(store.getState().user.moneySplashSeen).toBe(true);
    });
  });

  it('expands a FAQ answer', async () => {
    const { getByText, findByText } = renderMoneySplashView();

    fireEvent.press(getByText(strings('money.how_it_works_page.faq_q1')));

    expect(
      await findByText(
        strings('money.how_it_works_page.faq_a1', { percentage: 6.2 }),
      ),
    ).toBeOnTheScreen();
  });

  it('dismisses the splash when the close control is pressed', async () => {
    const { findByTestId, queryByTestId } = renderMoneySplashView({
      pushedOverHost: true,
    });

    fireEvent.press(await findByTestId(MoneySplashViewTestIds.CLOSE_BUTTON));

    await waitFor(() => {
      expect(queryByTestId(MoneySplashViewTestIds.CTA)).not.toBeOnTheScreen();
    });
  });
});
