import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { TokenFilterBottomSheet } from './TokenFilterBottomSheet';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectChainId } from '../../../../selectors/networkController';
import { selectTokenNetworkFilter } from '../../../../selectors/preferencesController';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../util/theme', () => ({
  useTheme: jest.fn(() => ({ colors: {} })),
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    PreferencesController: {
      setTokenNetworkFilter: jest.fn(),
    },
  },
}));

jest.mock('@react-navigation/native', () => {
  const reactNavigationModule = jest.requireActual('@react-navigation/native');
  return {
    ...reactNavigationModule,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
    }),
  };
});

jest.mock('react-native-safe-area-context', () => {
  // copied from BottomSheetDialog.test.tsx
  const inset = { top: 1, right: 2, bottom: 3, left: 4 };
  const frame = { width: 5, height: 6, x: 7, y: 8 };
  return {
    SafeAreaProvider: jest.fn().mockImplementation(({ children }) => children),
    SafeAreaConsumer: jest
      .fn()
      .mockImplementation(({ children }) => children(inset)),
    useSafeAreaInsets: jest.fn().mockImplementation(() => inset),
    useSafeAreaFrame: jest.fn().mockImplementation(() => frame),
  };
});

describe('TokenFilterBottomSheet', () => {
  beforeEach(() => {
    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectChainId) {
        return '0x1'; // default chain ID
      } else if (selector === selectTokenNetworkFilter) {
        return {}; // default to show all networks
      }
      return null;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with the default option (All Networks) selected', () => {
    const { queryByText } = render(<TokenFilterBottomSheet />);

    expect(queryByText('All Networks')).toBeTruthy();
    expect(queryByText('Current Network')).toBeTruthy();
  });

  it('sets filter to All Networks and closes bottom sheet when first option is pressed', async () => {
    const { queryByText } = render(<TokenFilterBottomSheet />);

    fireEvent.press(queryByText('All Networks'));

    await waitFor(() => {
      expect(
        Engine.context.PreferencesController.setTokenNetworkFilter,
      ).toHaveBeenCalledWith({});
    });
  });

  it('sets filter to Current Network and closes bottom sheet when second option is pressed', async () => {
    const { queryByText } = render(<TokenFilterBottomSheet />);

    fireEvent.press(queryByText('Current Network'));

    await waitFor(() => {
      expect(
        Engine.context.PreferencesController.setTokenNetworkFilter,
      ).toHaveBeenCalledWith({
        '0x1': true,
      });
    });
  });

  it('displays the correct selection based on tokenNetworkFilter', () => {
    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectChainId) {
        return '0x1';
      } else if (selector === selectTokenNetworkFilter) {
        return { '0x1': true }; // filter by current network
      }
      return null;
    });

    const { queryByText } = render(<TokenFilterBottomSheet />);

    expect(queryByText('Current Network')).toBeTruthy();
  });
});
