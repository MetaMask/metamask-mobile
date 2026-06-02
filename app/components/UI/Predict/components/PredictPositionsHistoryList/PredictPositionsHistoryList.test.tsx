import React from 'react';
import { render, screen } from '@testing-library/react-native';
import {
  PredictPositionsEmptySelectorsIDs,
  PredictPositionsHistoryListSelectorsIDs,
} from '../../Predict.testIds';
import PredictPositionsHistoryList from './PredictPositionsHistoryList';

jest.mock('../../views/PredictTransactionsView', () => {
  const ReactLib = jest.requireActual('react');
  const { Text, View } = jest.requireActual('react-native');

  return function MockPredictTransactionsView({
    emptyState,
    isVisible,
  }: {
    emptyState: React.ReactNode;
    isVisible: boolean;
  }) {
    return ReactLib.createElement(
      View,
      {
        testID: 'mock-predict-transactions-view',
      },
      ReactLib.createElement(Text, null, `visible:${isVisible}`),
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
});
