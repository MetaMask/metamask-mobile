import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider, {
  type DeepPartial,
} from '../../../../../util/test/renderWithProvider';
import type { RootState } from '../../../../../reducers';
import {
  PredictFeedBannerPosition,
  PredictFeedBannerSeverity,
} from '../../constants/feedBanner';
import PredictFeedBanner, {
  getPredictFeedBannerDismissalKey,
} from './PredictFeedBanner';
import { PredictFeedBannerSelectorsIDs } from './PredictFeedBanner.testIds';

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn(() => '1.0.0'),
}));

const MESSAGE_ID = 'predict-service-update-1';
const bannerConfig = {
  enabled: true,
  minimumVersion: '0.0.0',
  id: MESSAGE_ID,
  title: 'Service update',
  description: 'Some Predict markets are temporarily unavailable.',
  position: PredictFeedBannerPosition.AfterWorldCupBanner,
  severity: PredictFeedBannerSeverity.Warning,
  dismissible: true,
};

const createState = (
  config = bannerConfig,
  dismissedBanners: string[] = [],
): DeepPartial<RootState> => ({
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          predictFeedBanner: config,
        },
        cacheTimestamp: 0,
      },
    },
  },
  banners: {
    dismissedBanners,
    lastDismissedBrazeBanner: null,
  },
});

describe('PredictFeedBanner', () => {
  it('renders remote content when the flag and position are enabled', () => {
    const { getByTestId } = renderWithProvider(
      <PredictFeedBanner
        position={PredictFeedBannerPosition.AfterWorldCupBanner}
      />,
      { state: createState() },
    );

    const banner = getByTestId(PredictFeedBannerSelectorsIDs.BANNER);

    expect(banner).toHaveTextContent(/Service update/);
    expect(banner).toHaveTextContent(
      /Some Predict markets are temporarily unavailable\./,
    );
  });

  it('does not render when the feature flag is disabled', () => {
    const { queryByTestId } = renderWithProvider(
      <PredictFeedBanner
        position={PredictFeedBannerPosition.AfterWorldCupBanner}
      />,
      { state: createState({ ...bannerConfig, enabled: false }) },
    );

    expect(
      queryByTestId(PredictFeedBannerSelectorsIDs.BANNER),
    ).not.toBeOnTheScreen();
  });

  it('renders only in the remotely configured position', () => {
    const { queryByTestId } = renderWithProvider(
      <PredictFeedBanner position={PredictFeedBannerPosition.AfterBalance} />,
      { state: createState() },
    );

    expect(
      queryByTestId(PredictFeedBannerSelectorsIDs.BANNER),
    ).not.toBeOnTheScreen();
  });

  it('does not render a close button for a non-dismissible message', () => {
    const { queryByTestId } = renderWithProvider(
      <PredictFeedBanner
        position={PredictFeedBannerPosition.AfterWorldCupBanner}
      />,
      { state: createState({ ...bannerConfig, dismissible: false }) },
    );

    expect(
      queryByTestId(PredictFeedBannerSelectorsIDs.CLOSE_BUTTON),
    ).not.toBeOnTheScreen();
  });

  it('persists dismissal by message ID and hides the banner', () => {
    const { getByTestId, queryByTestId, store } = renderWithProvider(
      <PredictFeedBanner
        position={PredictFeedBannerPosition.AfterWorldCupBanner}
      />,
      { state: createState() },
    );

    fireEvent.press(getByTestId(PredictFeedBannerSelectorsIDs.CLOSE_BUTTON));

    expect(store.getState().banners.dismissedBanners).toContain(
      getPredictFeedBannerDismissalKey(MESSAGE_ID),
    );
    expect(
      queryByTestId(PredictFeedBannerSelectorsIDs.BANNER),
    ).not.toBeOnTheScreen();
  });

  it('does not render a previously dismissed message', () => {
    const { queryByTestId } = renderWithProvider(
      <PredictFeedBanner
        position={PredictFeedBannerPosition.AfterWorldCupBanner}
      />,
      {
        state: createState(undefined, [
          getPredictFeedBannerDismissalKey(MESSAGE_ID),
        ]),
      },
    );

    expect(
      queryByTestId(PredictFeedBannerSelectorsIDs.BANNER),
    ).not.toBeOnTheScreen();
  });

  it('renders a new message ID after an older message was dismissed', () => {
    const { getByTestId } = renderWithProvider(
      <PredictFeedBanner
        position={PredictFeedBannerPosition.AfterWorldCupBanner}
      />,
      {
        state: createState(undefined, [
          getPredictFeedBannerDismissalKey('older-message'),
        ]),
      },
    );

    expect(getByTestId(PredictFeedBannerSelectorsIDs.BANNER)).toBeOnTheScreen();
  });
});
