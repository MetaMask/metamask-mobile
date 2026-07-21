import '../../../../../tests/component-view/mocks';
import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { InteractionManager } from 'react-native';
import { describeForPlatforms } from '../../../../../tests/component-view/platform';
import {
  getRouteProbeTestId,
  renderScreenWithRoutes,
} from '../../../../../tests/component-view/render';
import { initialStateIdentity } from '../../../../../tests/component-view/presets/identity';
import AppInformation from './index';
import { AboutMetaMaskSelectorsIDs } from './AboutMetaMask.testIds';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';

/**
 * Component View tests for AppInformation (About MetaMask).
 *
 * Mirrors (partial): tests/smoke-appium/settings/contact-us.spec.ts
 * — support links render and navigate to the in-app webview.
 *
 * Run: yarn jest -c jest.config.view.js AppInformation.view.test.tsx --runInBand
 */

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
    [{ name: Routes.WEBVIEW.MAIN }],
    { state },
  );
}

describeForPlatforms('AppInformation (contact-us) component views', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('navigates to the webview when Contact us is pressed', async () => {
    const { findByTestId, findByText } = renderAppInformation();

    await findByTestId(AboutMetaMaskSelectorsIDs.CONTAINER);
    fireEvent.press(await findByText(strings('app_information.contact_us')));

    await waitFor(async () => {
      expect(
        await findByTestId(getRouteProbeTestId(Routes.WEBVIEW.MAIN)),
      ).toBeOnTheScreen();
    });
  });

  it('navigates to the webview when Support Center is pressed', async () => {
    const { findByTestId, findByText } = renderAppInformation();

    await findByTestId(AboutMetaMaskSelectorsIDs.CONTAINER);
    fireEvent.press(
      await findByText(strings('app_information.support_center')),
    );

    await waitFor(async () => {
      expect(
        await findByTestId(getRouteProbeTestId(Routes.WEBVIEW.MAIN)),
      ).toBeOnTheScreen();
    });
  });
});
