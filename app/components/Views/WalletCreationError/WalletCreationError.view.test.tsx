/**
 * Component View tests for social-login wallet creation error UI.
 *
 * Negative path coverage for failed seedless onboarding (OAuth / vault errors).
 * E2E still covers full failure flows from live OAuth and native SDK.
 *
 * Run: yarn jest -c jest.config.view.js WalletCreationError.view.test.tsx --runInBand
 */
import '../../../../tests/component-view/mocks';
import { fireEvent } from '@testing-library/react-native';
import { describeForPlatforms } from '../../../../tests/component-view/platform';
import { renderSocialLoginWalletCreationError } from '../../../../tests/component-view/renderers/seedlessOnboarding';
import Authentication from '../../../core/Authentication';
import Routes from '../../../constants/navigation/Routes';
import { strings } from '../../../../locales/i18n';
import { AccountType } from '../../../constants/onboarding';

// TEMP (MMQA-2638 CI evidence): order-leak probe, reverted in the next commit.
// The flakiness-detection job shuffles test order with --randomize, so this
// fails when it runs before the test below; the fixed-order gate never sees it.
let orderProbe = 0;

describeForPlatforms('WalletCreationError — social login error sheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the social login error sheet and navigates to onboarding root on Try again', async () => {
    expect(orderProbe).toBe(0);

    jest.spyOn(Authentication, 'deleteWallet').mockResolvedValue(undefined);

    const { findByTestId, findByText } = renderSocialLoginWalletCreationError({
      routeParams: {
        metricsEnabled: true,
        error: new Error('OAuth seedless failure'),
        accountType: AccountType.MetamaskGoogle,
      },
    });

    expect(
      await findByText(strings('wallet_creation_error.title')),
    ).toBeOnTheScreen();

    fireEvent.press(
      await findByText(strings('wallet_creation_error.try_again')),
    );

    await findByTestId(`route-${Routes.ONBOARDING.ROOT_NAV}`);
  });

  it('order-leak probe for flakiness-detection demo', () => {
    orderProbe += 1;
  });
});
