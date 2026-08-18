import React from 'react';
import { render } from '@testing-library/react-native';
import type { UiSlot } from '../../../../../core/Engine/controllers/ui-slots-controller/types';
import { MarketCarouselWidget } from './MarketCarouselWidget';
import { executeUiSlotAction } from '../../../UiSlots/mobileActionRegistry';

const mockPredictLiveNowSection = jest.fn((_props: unknown) => null);

jest.mock('../../views/PredictHome/components/PredictLiveNowSection', () => ({
  __esModule: true,
  default: (props: unknown) => mockPredictLiveNowSection(props),
}));
jest.mock('../../../UiSlots/mobileActionRegistry', () => ({
  executeUiSlotAction: jest.fn(),
}));

describe('MarketCarouselWidget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes a typed domain feed reference to Predict', () => {
    const slot: UiSlot = {
      slotId: 'predict-home.live-now',
      contentId: 'carousel-1',
      revision: 1,
      widget: {
        type: 'market-carousel',
        schemaVersion: 1,
        props: { title: 'Popular now' },
      },
      dataReferences: [
        {
          id: 'markets',
          type: 'predict-feed',
          params: {
            venue: 'polymarket',
            feedId: 'popular-open',
          },
        },
      ],
    };

    render(<MarketCarouselWidget slot={slot} />);

    expect(mockPredictLiveNowSection).toHaveBeenCalledWith({
      feedReferenceOverride: {
        id: 'markets',
        type: 'predict-feed',
        params: {
          venue: 'polymarket',
          feedId: 'popular-open',
        },
      },
      titleOverride: 'Popular now',
      onHeaderPressOverride: undefined,
    });
  });

  it('routes navigation through the validated action registry', () => {
    const action = {
      actionId: 'navigate-deeplink',
      trigger: 'press',
      params: { deeplink: 'https://metamask.io/predict' },
    } as const;
    const slot: UiSlot = {
      slotId: 'predict-home.live-now',
      contentId: 'carousel-1',
      revision: 1,
      widget: {
        type: 'market-carousel',
        schemaVersion: 1,
        props: {},
      },
      actions: [action],
      dataReferences: [
        {
          id: 'markets',
          type: 'predict-feed',
          params: {
            venue: 'polymarket',
            feedId: 'popular-open',
          },
        },
      ],
    };

    render(<MarketCarouselWidget slot={slot} />);
    const props = mockPredictLiveNowSection.mock.calls[0][0] as {
      onHeaderPressOverride?: () => void;
    };
    props.onHeaderPressOverride?.();

    expect(executeUiSlotAction).toHaveBeenCalledWith(slot, action);
  });

  it('skips a carousel without its required data reference', () => {
    const slot: UiSlot = {
      slotId: 'predict-home.live-now',
      contentId: 'carousel-1',
      revision: 1,
      widget: {
        type: 'market-carousel',
        schemaVersion: 1,
        props: {},
      },
    };

    render(<MarketCarouselWidget slot={slot} />);

    expect(mockPredictLiveNowSection).not.toHaveBeenCalled();
  });
});
