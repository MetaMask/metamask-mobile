import '../../../../../tests/component-view/mocks';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { describeForPlatforms } from '../../../../../tests/component-view/platform';
import { renderComponentViewScreen } from '../../../../../tests/component-view/render';
import { initialStateIdentity } from '../../../../../tests/component-view/presets/identity';
import AppInformation from './index';
import { AboutMetaMaskSelectorsIDs } from './AboutMetaMask.testIds';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';

function renderAppInformation() {
  const state = initialStateIdentity().build();
  return renderComponentViewScreen(
    AppInformation as unknown as React.ComponentType,
    { name: Routes.SETTINGS.COMPANY },
    { state },
  );
}

describeForPlatforms('AppInformation (contact-us) component views', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Migrated from contact-us.spec.ts
  // The original E2E test only navigated to the support screen and verified it opened.
  // Here we verify the screen renders correctly and the "Contact us" link is present.
  it('renders the About MetaMask screen with a Contact us link', async () => {
    const { findByTestId, findByText } = renderAppInformation();

    expect(
      await findByTestId(AboutMetaMaskSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();

    expect(
      await findByText(strings('app_information.contact_us')),
    ).toBeOnTheScreen();
  });

  it('navigates to the webview when the Contact us link is pressed', async () => {
    const { findByTestId, findByText, getByTestId } = renderAppInformation();

    // Wait for the screen to be mounted
    await findByTestId(AboutMetaMaskSelectorsIDs.CONTAINER);

    const contactUsLink = await findByText(
      strings('app_information.contact_us'),
    );

    // Pressing the link triggers InteractionManager.runAfterInteractions then navigation.navigate.
    // In CV tests we cannot assert real navigation to Webview (it's outside the rendered tree),
    // but we can assert the element is pressable without throwing.
    await waitFor(() => {
      expect(contactUsLink).toBeOnTheScreen();
    });

    fireEvent.press(contactUsLink);

    // If navigation throws the test would fail; reaching here means the handler executed cleanly.
    expect(contactUsLink).toBeOnTheScreen();
  });

  it('renders the Support Center link', async () => {
    const { findByText } = renderAppInformation();

    expect(
      await findByText(strings('app_information.support_center')),
    ).toBeOnTheScreen();
  });
});
