import React from 'react';
import { render, screen } from '@testing-library/react-native';
import {
  PredictPositionsEmptySelectorsIDs,
  PredictPositionsHistoryListSelectorsIDs,
} from '../../Predict.testIds';
import { PredictPositionStatus, type PredictPosition } from '../../types';
import PredictPositionsHistoryList from './PredictPositionsHistoryList';

jest.mock('../../views/PredictTransactionsView', () => {
  const ReactLib = jest.requireActual('react');
  const { Text, View } = jest.requireActual('react-native');

  return function MockPredictTransactionsView({
    claimPendingPositions,
    onClaimPendingPositionsRefresh,
    activityContainerStyle,
    containerStyle,
    emptyState,
    isPrivacyMode,
    isVisible,
    shouldTrackActivityViewed,
  }: {
    claimPendingPositions?: PredictPosition[];
    onClaimPendingPositionsRefresh?: () => Promise<unknown> | void;
    activityContainerStyle?: string;
    containerStyle?: string;
    emptyState: React.ReactNode;
    isPrivacyMode?: boolean;
    isVisible: boolean;
    shouldTrackActivityViewed?: boolean;
  }) {
    return ReactLib.createElement(
      View,
      {
        testID: 'mock-predict-transactions-view',
      },
      ReactLib.createElement(Text, null, `visible:${isVisible}`),
      ReactLib.createElement(
        Text,
        null,
        `claim-pending-present:${claimPendingPositions !== undefined}`,
      ),
      ReactLib.createElement(
        Text,
        null,
        `claim-pending-count:${claimPendingPositions?.length ?? 0}`,
      ),
      ReactLib.createElement(
        Text,
        null,
        `claim-pending-refresh-present:${Boolean(
          onClaimPendingPositionsRefresh,
        )}`,
      ),
      ReactLib.createElement(Text, null, `privacy:${Boolean(isPrivacyMode)}`),
      ReactLib.createElement(Text, null, `container:${containerStyle}`),
      ReactLib.createElement(Text, null, `activity:${activityContainerStyle}`),
      ReactLib.createElement(
        Text,
        null,
        `track-activity-viewed:${shouldTrackActivityViewed}`,
      ),
      emptyState,
    );
  };
});

jest.mock('../PredictPositionsEmpty', () => {
  const ReactLib = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const { PredictPositionsEmptySelectorsIDs: testIds } = jest.requireActual(
    '../../Predict.testIds',
  );

  return function MockPredictPositionsEmpty() {
    return ReactLib.createElement(View, { testID: testIds.CONTAINER });
  };
});

const createClaimablePosition = (
  overrides: Partial<PredictPosition> = {},
): PredictPosition => ({
  amount: 1,
  avgPrice: 0.5,
  cashPnl: 1,
  claimable: true,
  currentValue: 4.5,
  endDate: '2026-05-25T00:00:00.000Z',
  icon: 'https://example.com/icon.png',
  id: 'claimable-position',
  initialValue: 1,
  marketId: 'market-1',
  outcome: 'Yes',
  outcomeId: 'outcome-1',
  outcomeIndex: 0,
  outcomeTokenId: 'token-1',
  percentPnl: 350,
  price: 0.5,
  providerId: 'provider-1',
  size: 1,
  status: PredictPositionStatus.WON,
  title: 'Prediction market',
  ...overrides,
});

describe('PredictPositionsHistoryList', () => {
  it('wraps the transactions view with the shared empty state', () => {
    render(<PredictPositionsHistoryList isVisible />);

    expect(
      screen.getByTestId(PredictPositionsHistoryListSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId('mock-predict-transactions-view'),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(PredictPositionsEmptySelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
  });

  it('passes the visible state to transaction history', () => {
    render(<PredictPositionsHistoryList isVisible={false} />);

    expect(screen.getByText('visible:false')).toBeOnTheScreen();
  });

  it('passes claim pending options to transaction history', () => {
    const mockRefreshClaimPendingPositions = jest.fn();

    render(
      <PredictPositionsHistoryList
        claimPendingPositions={[createClaimablePosition()]}
        onClaimPendingPositionsRefresh={mockRefreshClaimPendingPositions}
        isPrivacyMode
        isVisible
      />,
    );

    expect(screen.getByText('claim-pending-present:true')).toBeOnTheScreen();
    expect(screen.getByText('claim-pending-count:1')).toBeOnTheScreen();
    expect(
      screen.getByText('claim-pending-refresh-present:true'),
    ).toBeOnTheScreen();
    expect(screen.getByText('privacy:true')).toBeOnTheScreen();
  });

  it('passes compact spacing to transaction history', () => {
    render(<PredictPositionsHistoryList isVisible />);

    expect(screen.getByText('container:p-0')).toBeOnTheScreen();
    expect(screen.getByText('activity:px-0')).toBeOnTheScreen();
  });

  it('lets the Positions screen own History tab analytics', () => {
    render(<PredictPositionsHistoryList isVisible />);

    expect(screen.getByText('track-activity-viewed:false')).toBeOnTheScreen();
  });
});
