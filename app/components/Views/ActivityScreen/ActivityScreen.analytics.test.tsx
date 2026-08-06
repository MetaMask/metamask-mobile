import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import type { CaipChainId } from '@metamask/utils';
import ActivityScreen from './ActivityScreen';
import { ActivityScreenSelectorsIDs } from './ActivityScreen.testIds';
import { ActivityScreenEntryPoint } from '../../../core/Analytics/events/activity';

const mockTrackFilterClicked = jest.fn();
const mockUseParams = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
}));

jest.mock('../../hooks/useTrackFilterClicked', () => ({
  useTrackFilterClicked: () => mockTrackFilterClicked,
}));

jest.mock('../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../util/navigation/navUtils'),
  useParams: () => mockUseParams(),
}));

jest.mock('./hooks/useNetworkFilterOptions', () => ({
  useNetworkFilterOptions: () => [
    { caipChainId: 'eip155:1', name: 'Ethereum Mainnet' },
    { caipChainId: 'eip155:137', name: 'Polygon' },
  ],
}));

// The list owns the data layer, which this suite is not exercising. The mock
// records the analytics-relevant props the screen hands down.
const mockActivityListProps = jest.fn();
jest.mock('../ActivityList', () => {
  const { View } = jest.requireActual('react-native');
  const ReactActual = jest.requireActual('react');

  return {
    __esModule: true,
    default: ReactActual.forwardRef(
      (props: Record<string, unknown>, _ref: unknown) => {
        mockActivityListProps(props);
        // The real list renders `header`, which is where the filter chips live.
        return ReactActual.createElement(
          View,
          { testID: 'activity-list-stub' },
          props.header as React.ReactNode,
        );
      },
    ),
  };
});

jest.mock('../ErrorBoundary', () => {
  const ReactActual = jest.requireActual('react');
  return {
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) =>
      ReactActual.createElement(ReactActual.Fragment, null, children),
  };
});

const mockNavigate = jest.fn();

/**
 * Opens the network filter sheet and returns the `onNetworkSelect` callback the
 * screen handed to it, which is what the sheet invokes on an explicit tap.
 */
type GetByTestId = ReturnType<typeof render>['getByTestId'];

const openNetworkSheet = (getByTestId: GetByTestId) => {
  mockNavigate.mockClear();
  fireEvent.press(getByTestId(ActivityScreenSelectorsIDs.NETWORK_FILTER_CHIP));

  const [, options] = mockNavigate.mock.calls[0];
  const onNetworkSelect = (
    options as { params: { onNetworkSelect: (c: unknown) => void } }
  ).params.onNetworkSelect;

  // Wrap so the resulting filter state change is flushed, as it would be when
  // the sheet invokes the callback from a real press.
  return (chainIds: CaipChainId[] | null) => {
    act(() => onNetworkSelect(chainIds));
  };
};

describe('ActivityScreen analytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParams.mockReturnValue({});
    jest.mocked(useNavigation).mockReturnValue({
      navigate: mockNavigate,
      setParams: jest.fn(),
      canGoBack: jest.fn().mockReturnValue(true),
      goBack: jest.fn(),
    } as unknown as ReturnType<typeof useNavigation>);
  });

  describe('Filter Clicked', () => {
    it('does not fire on screen load', () => {
      // Arrange / Act
      render(<ActivityScreen />);

      // Assert
      expect(mockTrackFilterClicked).not.toHaveBeenCalled();
    });

    it('does not fire when the filter sheet is merely opened', () => {
      // Arrange
      const { getByTestId } = render(<ActivityScreen />);

      // Act
      fireEvent.press(
        getByTestId(ActivityScreenSelectorsIDs.NETWORK_FILTER_CHIP),
      );

      // Assert
      expect(mockTrackFilterClicked).not.toHaveBeenCalled();
    });

    it('fires with to_network when a network is selected from all networks', () => {
      // Arrange
      const { getByTestId } = render(<ActivityScreen />);
      const onNetworkSelect = openNetworkSheet(getByTestId);

      // Act
      onNetworkSelect(['eip155:1'] as CaipChainId[]);

      // Assert
      expect(mockTrackFilterClicked).toHaveBeenCalledTimes(1);
      expect(mockTrackFilterClicked).toHaveBeenCalledWith({
        location: 'activity',
        filter_type: 'network',
        to_network: 'eip155:1',
      });
    });

    it('reports both networks when switching from one network to another', () => {
      // Arrange
      const { getByTestId } = render(<ActivityScreen />);
      openNetworkSheet(getByTestId)(['eip155:1'] as CaipChainId[]);

      // Act - reopen so the callback closes over the new selection
      openNetworkSheet(getByTestId)(['eip155:137'] as CaipChainId[]);

      // Assert
      expect(mockTrackFilterClicked).toHaveBeenLastCalledWith({
        location: 'activity',
        filter_type: 'network',
        from_network: 'eip155:1',
        to_network: 'eip155:137',
      });
    });

    it('omits to_network when the filter is cleared back to all networks', () => {
      // Arrange
      const { getByTestId } = render(<ActivityScreen />);
      openNetworkSheet(getByTestId)(['eip155:1'] as CaipChainId[]);

      // Act
      openNetworkSheet(getByTestId)(null);

      // Assert
      expect(mockTrackFilterClicked).toHaveBeenLastCalledWith({
        location: 'activity',
        filter_type: 'network',
        from_network: 'eip155:1',
      });
    });
  });

  describe('Activity Screen Viewed wiring', () => {
    it('opts the list into screen-view tracking', () => {
      // Arrange / Act
      render(<ActivityScreen />);

      // Assert
      expect(mockActivityListProps).toHaveBeenCalledWith(
        expect.objectContaining({ trackScreenViewed: true }),
      );
    });

    it('forwards the route entry point for attribution', () => {
      // Arrange
      mockUseParams.mockReturnValue({
        entryPoint: ActivityScreenEntryPoint.BottomNavClick,
      });

      // Act
      render(<ActivityScreen />);

      // Assert
      expect(mockActivityListProps).toHaveBeenCalledWith(
        expect.objectContaining({
          entryPoint: ActivityScreenEntryPoint.BottomNavClick,
        }),
      );
    });

    it('forwards no entry point when the route did not attribute one', () => {
      // Arrange / Act
      render(<ActivityScreen />);

      // Assert
      expect(mockActivityListProps).toHaveBeenCalledWith(
        expect.objectContaining({ entryPoint: undefined }),
      );
    });
  });
});
