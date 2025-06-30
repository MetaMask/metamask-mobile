import React from 'react';
import { render } from '@testing-library/react-native';
import { TokenFilterBottomSheet } from './TokenFilterBottomSheet';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';

// Mock modules
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('../../../../util/theme', () => ({
  useTheme: jest.fn(() => ({
    colors: {
      text: { default: '#000', alternative: '#666' },
      background: { default: '#fff' },
      border: { muted: '#ccc' },
      icon: { alternative: '#666' },
    },
  })),
}));

jest.mock('../../../../component-library/hooks/useStyles', () => ({
  useStyles: jest.fn(() => ({
    styles: {
      sheet: {},
      notch: {},
      networkTabsSelectorTitle: {},
      networkTabsSelectorWrapper: {},
      tabUnderlineStyle: {},
      inactiveUnderlineStyle: {},
      tabStyle: {},
      textStyle: {},
      tabBar: {},
      editNetworkMenu: {},
    },
  })),
}));

jest.mock('../../../hooks/useMetrics', () => ({
  useMetrics: jest.fn(() => ({
    trackEvent: jest.fn(),
    createEventBuilder: jest.fn(() => ({
      build: jest.fn(),
    })),
  })),
  MetaMetricsEvents: {
    ASSET_FILTER_SELECTED: 'asset_filter_selected',
    ASSET_FILTER_CUSTOM_SELECTED: 'asset_filter_custom_selected',
  },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(() => ({
    top: 20,
    bottom: 20,
    left: 0,
    right: 0,
  })),
}));

jest.mock('../../../../util/device', () => ({
  getDeviceHeight: jest.fn(() => 800),
  isIos: jest.fn(),
  isAndroid: jest.fn(),
}));

// Mock tab view
jest.mock('react-native-scrollable-tab-view', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DefaultTabBar: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

// // Mock child components
// jest.mock('../../NetworkMultiSelector/NetworkMultiSelector', () => () => (
//   <div data-testid="network-multi-selector">NetworkMultiSelector</div>
// ));

// jest.mock('../../CustomNetworkSelector/CustomNetworkSelector', () => () => (
//   <div data-testid="custom-network-selector">CustomNetworkSelector</div>
// ));

// jest.mock(
//   '../../ReusableModal',
//   () =>
//     ({ children }: { children: React.ReactNode }) =>
//       <div data-testid="reusable-modal">{children}</div>,
// );

describe('TokenFilterBottomSheet', () => {
  const mockNavigate = jest.fn();
  const mockGoBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (useNavigation as jest.Mock).mockReturnValue({
      navigate: mockNavigate,
      goBack: mockGoBack,
    });

    (useSelector as jest.Mock).mockReturnValue({
      // Add basic mock state that the component might need
      settings: {},
      user: {},
      networkConfiguration: {},
    });
  });

  it('renders correctly', () => {
    const { toJSON } = render(<TokenFilterBottomSheet />);
    expect(toJSON()).toMatchSnapshot();
  });
});
