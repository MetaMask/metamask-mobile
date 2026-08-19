import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import Routes from '../../../../constants/navigation/Routes';
import { useActivityBlockExplorer } from '../hooks/useActivityBlockExplorer';
import {
  getActivityDetailsStepFailureTestId,
  getActivityDetailsStepIconTestId,
  getActivityDetailsStepTestId,
} from '../ActivityDetails.testIds';
import { ActivityDetailsPerpsStepTimeline } from './ActivityDetailsPerpsStepTimeline';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../hooks/useActivityBlockExplorer', () => ({
  useActivityBlockExplorer: jest.fn(() => ({
    url: 'https://arbiscan.io/tx/0xdeposit',
    title: 'Arbiscan',
  })),
}));

describe('ActivityDetailsPerpsStepTimeline', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('opens the block explorer when a step is pressed', () => {
    const { getByTestId } = renderWithProvider(
      <ActivityDetailsPerpsStepTimeline
        explorerTarget={{ chainId: 'eip155:42161', hash: '0xdeposit' }}
        status="completed"
        timestamp={1_765_361_640_000}
        type="deposit"
      />,
    );

    fireEvent.press(getByTestId(getActivityDetailsStepTestId(0)));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.WEBVIEW.MAIN, {
      screen: Routes.WEBVIEW.SIMPLE,
      params: {
        url: 'https://arbiscan.io/tx/0xdeposit',
        title: 'Arbiscan',
      },
    });
  });

  it.each([
    ['deposit' as const, 3],
    ['withdrawal' as const, 2],
  ])(
    'marks the failed %s step with the cross and leaves the rest as dots',
    (type, failedIndex) => {
      const { getByTestId, queryByTestId } = renderWithProvider(
        <ActivityDetailsPerpsStepTimeline
          explorerTarget={{ chainId: 'eip155:42161', hash: '0xdeposit' }}
          status="failed"
          timestamp={1_765_361_640_000}
          type={type}
        />,
      );

      expect(
        getByTestId(getActivityDetailsStepFailureTestId(failedIndex)),
      ).toBeDefined();

      for (let index = 0; index < failedIndex; index += 1) {
        expect(
          queryByTestId(getActivityDetailsStepFailureTestId(index)),
        ).toBeNull();
      }
    },
  );

  it('keeps the failed step row linked to the block explorer', () => {
    const { getByTestId } = renderWithProvider(
      <ActivityDetailsPerpsStepTimeline
        explorerTarget={{ chainId: 'eip155:42161', hash: '0xdeposit' }}
        status="failed"
        timestamp={1_765_361_640_000}
        type="deposit"
      />,
    );

    fireEvent.press(getByTestId(getActivityDetailsStepTestId(3)));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.WEBVIEW.MAIN, {
      screen: Routes.WEBVIEW.SIMPLE,
      params: {
        url: 'https://arbiscan.io/tx/0xdeposit',
        title: 'Arbiscan',
      },
    });
  });

  it('does not render step explorer icons when no explorer link is available', () => {
    jest.mocked(useActivityBlockExplorer).mockReturnValueOnce(undefined);

    const { queryByTestId } = renderWithProvider(
      <ActivityDetailsPerpsStepTimeline
        status="pending"
        timestamp={1_765_361_640_000}
        type="deposit"
      />,
    );

    expect(queryByTestId(getActivityDetailsStepIconTestId(0))).toBeNull();
  });
});
