/**
 * Component View tests for the offline screen.
 *
 * Covers behaviour driven by Redux state (Infura availability). Cases that
 * depend on device connectivity come from the NetInfo native module and live
 * in OfflineMode.test.tsx.
 *
 * Run: yarn jest -c jest.config.view.js OfflineMode.view.test.tsx --runInBand
 */
import '../../../../tests/component-view/mocks';
import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { describeForPlatforms } from '../../../../tests/component-view/platform';
import {
  createRouteParamsProbe,
  getRouteParamsProbeTestId,
  renderScreenWithRoutes,
} from '../../../../tests/component-view/render';
import { createStateFixture } from '../../../../tests/component-view/stateFixture';
import Routes from '../../../constants/navigation/Routes';
import AppConstants from '../../../core/AppConstants';
import OfflineMode from './OfflineMode';
import { OfflineModeSelectorsIDs } from './OfflineMode.testIds';

const renderOfflineMode = ({ infuraBlocked }: { infuraBlocked: boolean }) => {
  const state = createStateFixture()
    .withOverrides({ infuraAvailability: { isBlocked: infuraBlocked } })
    .build();

  return renderScreenWithRoutes(
    OfflineMode as unknown as React.ComponentType,
    { name: 'OfflineModeView' },
    [
      {
        name: Routes.WEBVIEW.MAIN,
        Component: createRouteParamsProbe(Routes.WEBVIEW.MAIN),
      },
    ],
    { state },
  );
};

describeForPlatforms('OfflineMode', () => {
  it('opens the connectivity help page when Infura is blocked in the region', async () => {
    const { findByTestId } = renderOfflineMode({ infuraBlocked: true });

    fireEvent.press(await findByTestId(OfflineModeSelectorsIDs.ACTION_BUTTON));

    const paramsProbe = await findByTestId(
      getRouteParamsProbeTestId(Routes.WEBVIEW.MAIN),
    );
    expect(JSON.parse(String(paramsProbe.props.children))).toEqual({
      screen: Routes.WEBVIEW.SIMPLE,
      params: { url: AppConstants.URLS.CONNECTIVITY_ISSUES },
    });
  });

  it('keeps the original region copy when Infura is blocked', async () => {
    const { findByTestId } = renderOfflineMode({ infuraBlocked: true });

    const description = await findByTestId(OfflineModeSelectorsIDs.DESCRIPTION);

    expect(description).toHaveTextContent(
      'Unable to connect to the blockchain host.',
    );
    expect(
      await findByTestId(OfflineModeSelectorsIDs.ACTION_BUTTON),
    ).toHaveTextContent('Learn more');
  });

  it('offers try again with connection guidance when Infura is available', async () => {
    const { findByTestId } = renderOfflineMode({ infuraBlocked: false });

    const description = await findByTestId(OfflineModeSelectorsIDs.DESCRIPTION);

    expect(description).toHaveTextContent(
      "Check your Wi-Fi or mobile data. We'll reconnect automatically once you're back online.",
    );
    expect(
      await findByTestId(OfflineModeSelectorsIDs.ACTION_BUTTON),
    ).toHaveTextContent('Try again');
  });
});
