import '../../../../../tests/component-view/mocks';
import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { InteractionManager } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { describeForPlatforms } from '../../../../../tests/component-view/platform';
import { renderScreenWithRoutes } from '../../../../../tests/component-view/render';
import { initialStateIdentity } from '../../../../../tests/component-view/presets/identity';
import AppInformation from './index';
import SupportConsentSheet from '../../../UI/SupportConsentSheet';
import { AboutMetaMaskSelectorsIDs } from './AboutMetaMask.testIds';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';

/**
 * Component View tests for AppInformation (About MetaMask).
 *
 * Mirrors (partial): tests/smoke-appium/settings/contact-us.spec.ts
 * — support links show the consent sheet. This view test renders the real
 * SupportConsentSheet, so it only asserts the sheet appears; the sheet's own
 * confirm/reject/dismiss mechanics are covered by SupportConsentSheet tests.
 *
 * Run: yarn jest -c jest.config.view.js AppInformation.view.test.tsx --runInBand
 */

// Mirrors the real RootModalFlow nesting (see app/components/Nav/App/App.tsx)
// so navigation.navigate(ROOT_MODAL_FLOW, { screen: SUPPORT_CONSENT_SHEET, params })
// resolves params the same way it does in production.
function RootModalFlowStack() {
  const NestedStack = createNativeStackNavigator();
  return (
    <NestedStack.Navigator>
      <NestedStack.Screen
        name={Routes.MODAL.SUPPORT_CONSENT_SHEET}
        component={SupportConsentSheet}
      />
    </NestedStack.Navigator>
  );
}

beforeAll(() => {
  jest.spyOn(InteractionManager, 'runAfterInteractions').mockImplementation(
    jest.fn().mockImplementation((callback) => {
      if (typeof callback === 'function') {
        callback();
      }
      return {
        then: (onfulfilled?: () => void) => Promise.resolve(onfulfilled?.()),
        done: (onfulfilled?: () => void, onrejected?: () => void) =>
          Promise.resolve().then(onfulfilled, onrejected),
        cancel: jest.fn(),
      };
    }),
  );
});

afterAll(() => {
  jest.restoreAllMocks();
});

function renderAppInformation() {
  const state = initialStateIdentity().build();
  return renderScreenWithRoutes(
    AppInformation as unknown as React.ComponentType,
    { name: Routes.SETTINGS.COMPANY },
    [
      {
        name: Routes.MODAL.ROOT_MODAL_FLOW,
        Component: RootModalFlowStack,
      },
      { name: Routes.WEBVIEW.MAIN },
    ],
    { state },
  );
}

describeForPlatforms('AppInformation (contact-us) component views', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the support consent sheet when Contact us is pressed', async () => {
    const { findByTestId, findByText } = renderAppInformation();

    await findByTestId(AboutMetaMaskSelectorsIDs.CONTAINER);
    fireEvent.press(await findByText(strings('app_information.contact_us')));

    expect(await findByTestId('support-consent-sheet')).toBeOnTheScreen();
  });

  it('shows the support consent sheet when Support Center is pressed', async () => {
    const { findByTestId, findByText } = renderAppInformation();

    await findByTestId(AboutMetaMaskSelectorsIDs.CONTAINER);
    fireEvent.press(
      await findByText(strings('app_information.support_center')),
    );

    expect(await findByTestId('support-consent-sheet')).toBeOnTheScreen();
  });
});
