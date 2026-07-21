import '../../../../../tests/component-view/mocks';
import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { InteractionManager } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { describeForPlatforms } from '../../../../../tests/component-view/platform';
import {
  getRouteProbeTestId,
  renderScreenWithRoutes,
} from '../../../../../tests/component-view/render';
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
 * — support links show the consent sheet and, once confirmed, navigate to
 * the in-app webview.
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

  it('navigates to the webview when Contact us is pressed and consent is confirmed', async () => {
    const { findByTestId, findByText } = renderAppInformation();

    await findByTestId(AboutMetaMaskSelectorsIDs.CONTAINER);
    fireEvent.press(await findByText(strings('app_information.contact_us')));
    fireEvent.press(await findByText(strings('support_consent.confirm')));

    await waitFor(async () => {
      expect(
        await findByTestId(getRouteProbeTestId(Routes.WEBVIEW.MAIN)),
      ).toBeOnTheScreen();
    });
  });

  it('navigates to the webview when Support Center is pressed and consent is confirmed', async () => {
    const { findByTestId, findByText } = renderAppInformation();

    await findByTestId(AboutMetaMaskSelectorsIDs.CONTAINER);
    fireEvent.press(
      await findByText(strings('app_information.support_center')),
    );
    fireEvent.press(await findByText(strings('support_consent.confirm')));

    await waitFor(async () => {
      expect(
        await findByTestId(getRouteProbeTestId(Routes.WEBVIEW.MAIN)),
      ).toBeOnTheScreen();
    });
  });
});
