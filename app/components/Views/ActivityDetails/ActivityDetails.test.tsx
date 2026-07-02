import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import type { ActivityListItem } from '../../../util/activity-adapters';
import ActivityDetails from './ActivityDetails';
import { ActivityDetailsSelectorsIDs } from './ActivityDetails.testIds';
import { useActivityDetailsItem } from './hooks/useActivityDetailsItem';
import { useParams } from '../../../util/navigation/navUtils';

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack }),
}));

jest.mock('../../../util/navigation/navUtils', () => ({
  useParams: jest.fn(),
}));

jest.mock('./hooks/useActivityDetailsItem', () => ({
  useActivityDetailsItem: jest.fn(),
}));

// Focus on screen behaviour; the template dispatch is covered separately.
jest.mock('./templates/TemplateLoader', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    TemplateLoader: () =>
      ReactActual.createElement(View, { testID: 'mock-template-loader' }),
  };
});

const useParamsMock = jest.mocked(useParams);
const useActivityDetailsItemMock = jest.mocked(useActivityDetailsItem);

const sendItem: ActivityListItem = {
  type: 'send',
  chainId: 'eip155:1',
  status: 'success',
  timestamp: 1,
  hash: '0xhash',
  data: { from: '0xfrom', to: '0xto' },
} as ActivityListItem;

describe('ActivityDetails screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useParamsMock.mockReturnValue({
      chainId: 'eip155:1',
      txIdentifier: '0xhash',
    });
  });

  it('renders the template when the transaction resolves', () => {
    useActivityDetailsItemMock.mockReturnValue(sendItem);

    const { getByTestId, queryByTestId } = renderWithProvider(
      <ActivityDetails />,
    );

    expect(getByTestId(ActivityDetailsSelectorsIDs.SCREEN)).toBeOnTheScreen();
    expect(getByTestId('mock-template-loader')).toBeOnTheScreen();
    expect(queryByTestId(ActivityDetailsSelectorsIDs.NOT_FOUND)).toBeNull();
  });

  it('renders a not-found message when the transaction cannot be resolved', () => {
    useActivityDetailsItemMock.mockReturnValue(undefined);

    const { getByTestId, queryByTestId } = renderWithProvider(
      <ActivityDetails />,
    );

    expect(
      getByTestId(ActivityDetailsSelectorsIDs.NOT_FOUND),
    ).toBeOnTheScreen();
    expect(queryByTestId('mock-template-loader')).toBeNull();
  });
});
