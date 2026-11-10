import '../../../../../../tests/component-view/mocks';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import { getRouteParamsProbeTestId } from '../../../../../../tests/component-view/render';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import { renderMoneySplashView } from '../../../../../../tests/component-view/renderers/moneySplash';
import Routes from '../../../../../constants/navigation/Routes';
import { MoneySplashViewTestIds } from './MoneySplashView.testIds';

const PREFERRED_PAYMENT_TOKEN = {
  address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  chainId: '0x1',
};

describeForPlatforms('MoneySplashView', () => {
  it('renders the title, CTA, and benefit rows', () => {
    const { getByText, getByTestId } = renderMoneySplashView();

    expect(getByText(strings('money.splash.title'))).toBeOnTheScreen();
    expect(getByText(strings('money.splash.cta'))).toBeOnTheScreen();
    expect(
      getByTestId(MoneySplashViewTestIds.BENEFIT_ROW(1)),
    ).toBeOnTheScreen();
    expect(
      getByTestId(MoneySplashViewTestIds.BENEFIT_ROW(5)),
    ).toBeOnTheScreen();
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

  it('marks the splash as seen on mount', async () => {
    const { store } = renderMoneySplashView();

    await waitFor(() => {
      expect(store.getState().user.moneySplashSeen).toBe(true);
    });
  });

  it('opens the confirmation with the preferred payment token', async () => {
    const { getByTestId, findByTestId } = renderMoneySplashView({
      params: {
        postOnboardingRedirect: {
          type: 'deposit',
          preferredPaymentToken: PREFERRED_PAYMENT_TOKEN,
        },
      },
    });

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

  it('expands a FAQ answer', async () => {
    const { getByText, findByText } = renderMoneySplashView();

    fireEvent.press(getByText(strings('money.how_it_works_page.faq_q1')));

    expect(
      await findByText(
        strings('money.how_it_works_page.faq_a1', { percentage: 6.2 }),
      ),
    ).toBeOnTheScreen();
  });

  it('renders the close button', () => {
    const { getByTestId } = renderMoneySplashView();

    expect(getByTestId(MoneySplashViewTestIds.CLOSE_BUTTON)).toBeOnTheScreen();
  });
});
