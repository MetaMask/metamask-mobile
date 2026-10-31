import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
  type Position,
} from '@metamask/perps-controller';
import type { Position as SocialPosition } from '@metamask/social-controllers';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { PerpsPositionCardSelectorsIDs } from '../../Perps.testIds';
import { PERPS_SHARE_POSITION_INTERACTION_TYPE } from '../../Views/PerpsSharePositionView/PerpsSharePositionView.constants';
import PerpsPostToFeedButton from './PerpsPostToFeedButton';

const mockOpenComposer = jest.fn();
const mockTrack = jest.fn();

jest.mock(
  '../../../../Views/SocialLeaderboard/hooks/useOpenSocialPostComposer',
  () => ({
    useOpenSocialPostComposer: () => ({ openComposer: mockOpenComposer }),
  }),
);

jest.mock('../../hooks/usePerpsEventTracking', () => ({
  usePerpsEventTracking: () => ({ track: mockTrack }),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

const shortPosition = { symbol: 'BTC', size: '-0.5' } as Position;
const socialPosition = {
  positionId: 'social-btc-short',
  tokenSymbol: 'BTC',
  chain: 'hyperliquid',
  perpPositionType: 'short',
} as SocialPosition;

describe('PerpsPostToFeedButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens the composer with the social position and tracks Post to MetaMask', () => {
    render(
      <PerpsPostToFeedButton
        position={shortPosition}
        socialPosition={socialPosition}
      />,
    );

    fireEvent.press(
      screen.getByTestId(PerpsPositionCardSelectorsIDs.POST_TO_FEED_BUTTON),
    );

    expect(
      screen.getByText('perps.position.card.post_to_feed'),
    ).toBeOnTheScreen();
    expect(mockOpenComposer).toHaveBeenCalledWith({
      position: socialPosition,
      entryPoint: 'perps',
      openFeedAfterPost: true,
    });
    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.PERPS_UI_INTERACTION,
      {
        [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
          PERPS_SHARE_POSITION_INTERACTION_TYPE.POST_TO_METAMASK,
        [PERPS_EVENT_PROPERTY.ASSET]: 'BTC',
        [PERPS_EVENT_PROPERTY.DIRECTION]: PERPS_EVENT_VALUE.DIRECTION.SHORT,
      },
    );
  });
});
