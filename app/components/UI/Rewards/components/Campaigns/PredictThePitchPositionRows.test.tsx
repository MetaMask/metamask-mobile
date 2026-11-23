import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import {
  PredictThePitchOpenPositionRow,
  PREDICT_THE_PITCH_POSITION_ROW_TEST_ID,
} from './PredictThePitchPositionRows';
import type { PredictThePitchPositionDto } from '../../../../../core/Engine/controllers/rewards-controller/types';

const mockOpenPredict = jest.fn();
const mockCanOpenPredict = jest.fn();
let mockIsPredictAvailable = true;

jest.mock('../../../PredictNext', () => ({
  PredictEventValues: { ENTRY_POINT: { REWARDS: 'rewards' } },
  createPredictCampaignEventRef: (campaign: string, eventId: string) => ({
    campaign,
    eventId,
  }),
  usePredictAvailability: () => mockIsPredictAvailable,
  usePredictEntryActions: () => ({
    openPredict: mockOpenPredict,
    canOpenPredict: mockCanOpenPredict,
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
  const rowTestId = (index: number) =>
    `${PREDICT_THE_PITCH_POSITION_ROW_TEST_ID}-${index}`;

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsPredictAvailable = true;
    mockCanOpenPredict.mockReturnValue(true);
  });

  it('opens the campaign Event with the Rewards entry point and the title and image snapshots', () => {
    const { getByTestId } = render(
      <PredictThePitchOpenPositionRow position={basePosition} index={0} />,
    );

    fireEvent.press(getByTestId(rowTestId(0)));

    expect(mockOpenPredict).toHaveBeenCalledTimes(1);
    expect(mockOpenPredict).toHaveBeenCalledWith({
      type: 'event',
      eventRef: { campaign: 'predict-the-pitch', eventId: 'event-1' },
      entryPoint: 'rewards',
      titleSnapshot: 'Match winner',
      imageSnapshot: 'https://example.com/icon.png',
    });
  });

  it('omits the image snapshot when the position has no icon', () => {
    const { getByTestId } = render(
      <PredictThePitchOpenPositionRow
        position={{ ...basePosition, iconUrl: null }}
        index={0}
      />,
    );

    fireEvent.press(getByTestId(rowTestId(0)));

    expect(mockOpenPredict).toHaveBeenCalledWith(
      expect.not.objectContaining({ imageSnapshot: expect.anything() }),
    );
  });

  it('asks whether the campaign can open Predict, scoped to the campaign', () => {
    render(
      <PredictThePitchOpenPositionRow position={basePosition} index={0} />,
    );

    expect(mockCanOpenPredict).toHaveBeenCalledWith({
      type: 'home',
      campaign: 'predict-the-pitch',
    });
  });

  it('keeps a disabled button that opens nothing when eventId is missing', () => {
    const { getByTestId } = render(
      <PredictThePitchOpenPositionRow
        position={{ ...basePosition, eventId: null }}
        index={1}
      />,
    );

    fireEvent.press(getByTestId(rowTestId(1)));

    expect(getByTestId(rowTestId(1))).toHaveProp('accessibilityRole', 'button');
    expect(mockOpenPredict).not.toHaveBeenCalled();
  });

  it.each([
    ['the campaign Venue is not active', true, false],
    ['Predict is unavailable', false, true],
  ])(
    'renders the row without an action when %s',
    (_case, isAvailable, canOpen) => {
      mockIsPredictAvailable = isAvailable;
      mockCanOpenPredict.mockReturnValue(canOpen);
      const { getByTestId, getByText } = render(
        <PredictThePitchOpenPositionRow position={basePosition} index={0} />,
      );

      fireEvent.press(getByTestId(rowTestId(0)));

      expect(getByText('Match winner')).toBeOnTheScreen();
      expect(getByTestId(rowTestId(0))).not.toHaveProp('accessibilityRole');
      expect(getByTestId(rowTestId(0))).not.toHaveProp('onPress');
      expect(mockOpenPredict).not.toHaveBeenCalled();
    },
  );
});
