import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import {
  PredictThePitchOpenPositionRow,
  PREDICT_THE_PITCH_POSITION_ROW_TEST_ID,
} from './PredictThePitchPositionRows';
import type { PredictThePitchPositionDto } from '../../../../../core/Engine/controllers/rewards-controller/types';
import { PredictEventValues } from '../../../Predict/constants/eventNames';

const mockNavigateToMarketDetails = jest.fn();

jest.mock('../../../Predict/hooks/usePredictNavigation', () => ({
  usePredictNavigation: () => ({
    navigateToMarketDetails: mockNavigateToMarketDetails,
  }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactActual = jest.requireActual('react');
  const RN = jest.requireActual('react-native');
  return {
    ...actual,
    Text: (props: Record<string, unknown>) =>
      ReactActual.createElement(RN.Text, props, props.children),
  };
});

jest.mock('@metamask/design-system-twrnc-preset', () => {
  const tw = (..._args: unknown[]) => ({});
  tw.style = jest.fn(() => ({}));
  return { useTailwind: () => tw };
});

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string, vars?: Record<string, string | number>) => {
    if (key === 'predict.position_info' && vars) {
      return `${vars.initialValue} on ${vars.outcome} to win ${vars.shares}`;
    }
    return key;
  }),
}));

const basePosition: PredictThePitchPositionDto = {
  outcomeAssetId: 'token-1',
  outcomeAsset: 'Yes',
  conditionId: 'condition-1',
  conditionName: 'Match winner',
  conditionSlug: 'match-winner',
  eventId: 'event-1',
  eventSlug: 'world-cup-final',
  iconUrl: 'https://example.com/icon.png',
  capitalDeployed: 12,
  pnl: 3,
  roi: 0.25,
  status: 'open',
  fillShares: 10,
  fillSharesBought: 10,
  fillSharesSold: 0,
  fillPrice: 0.5,
  fillDate: '2025-01-01T00:00:00.000Z',
};

describe('PredictThePitchPositionRows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('navigates to Predict market details when a row with eventId is pressed', () => {
    const { getByTestId } = render(
      <PredictThePitchOpenPositionRow position={basePosition} index={0} />,
    );

    fireEvent.press(getByTestId(`${PREDICT_THE_PITCH_POSITION_ROW_TEST_ID}-0`));

    expect(mockNavigateToMarketDetails).toHaveBeenCalledWith(
      {
        marketId: 'event-1',
        entryPoint: PredictEventValues.ENTRY_POINT.REWARDS,
        title: 'Match winner',
        image: 'https://example.com/icon.png',
      },
      { throughRoot: true },
    );
  });

  it('does not navigate when eventId is missing', () => {
    const { getByTestId } = render(
      <PredictThePitchOpenPositionRow
        position={{ ...basePosition, eventId: null }}
        index={1}
      />,
    );

    fireEvent.press(getByTestId(`${PREDICT_THE_PITCH_POSITION_ROW_TEST_ID}-1`));

    expect(mockNavigateToMarketDetails).not.toHaveBeenCalled();
  });
});
