import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import OndoLeaderboardView, {
  ONDO_LEADERBOARD_VIEW_TEST_IDS,
} from './OndoLeaderboardView';
import { useGetOndoLeaderboard } from '../hooks/useGetOndoLeaderboard';

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
  useRoute: () => ({ params: { campaignId: 'campaign-ondo-123' } }),
}));

jest.mock('react-native-safe-area-context', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const actual = jest.requireActual('react-native-safe-area-context');
  return {
    ...actual,
    useSafeAreaInsets: jest.fn(() => ({
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    })),
    SafeAreaView: ({
      children,
      testID,
      ...props
    }: {
      children: React.ReactNode;
      testID?: string;
    }) => ReactActual.createElement(View, { ...props, testID }, children),
  };
});

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return { ...actual };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: (...args: unknown[]) => args }),
}));

jest.mock(
  '../../../../component-library/components-temp/HeaderCompactStandard',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View, Text, Pressable } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({
        title,
        onBack,
        backButtonProps,
      }: {
        title: string;
        onBack: () => void;
        backButtonProps?: { testID?: string };
      }) =>
        ReactActual.createElement(
          View,
          { testID: 'header' },
          ReactActual.createElement(Text, null, title),
          ReactActual.createElement(Pressable, {
            onPress: onBack,
            testID: backButtonProps?.testID ?? 'header-back-button',
          }),
        ),
    };
  },
);

jest.mock('../../../Views/ErrorBoundary', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) =>
      ReactActual.createElement(View, null, children),
  };
});

jest.mock('../components/Campaigns/OndoLeaderboardPosition', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ campaignId }: { campaignId: string }) =>
      ReactActual.createElement(View, {
        testID: `ondo-leaderboard-position-${campaignId}`,
      }),
  };
});

jest.mock('../components/Campaigns/OndoLeaderboard', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () =>
      ReactActual.createElement(View, { testID: 'campaign-leaderboard' }),
  };
});

jest.mock('../hooks/useGetOndoLeaderboard');

const mockUseGetOndoLeaderboard = useGetOndoLeaderboard as jest.MockedFunction<
  typeof useGetOndoLeaderboard
>;

const hookDefaults = {
  leaderboard: null,
  isLoading: false,
  hasError: false,
  isLeaderboardNotYetComputed: false,
  tierNames: ['STARTER', 'MID'],
  selectedTier: 'STARTER',
  selectedTierData: { entries: [], totalParticipants: 10 },
  computedAt: '2024-03-20T12:00:00.000Z',
  setSelectedTier: jest.fn(),
  refetch: jest.fn(),
};

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

describe('OndoLeaderboardView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGetOndoLeaderboard.mockReturnValue(hookDefaults);
  });

  it('renders with the correct container testID', () => {
    const { getByTestId } = render(<OndoLeaderboardView />);
    expect(getByTestId(ONDO_LEADERBOARD_VIEW_TEST_IDS.CONTAINER)).toBeDefined();
  });

  it('renders the OndoLeaderboard component', () => {
    const { getByTestId } = render(<OndoLeaderboardView />);
    expect(getByTestId('campaign-leaderboard')).toBeDefined();
  });

  it('renders the OndoLeaderboardPosition component with the campaign ID', () => {
    const { getByTestId } = render(<OndoLeaderboardView />);
    expect(
      getByTestId('ondo-leaderboard-position-campaign-ondo-123'),
    ).toBeDefined();
  });

  it('calls useGetOndoLeaderboard with the campaign ID from route params', () => {
    render(<OndoLeaderboardView />);
    expect(mockUseGetOndoLeaderboard).toHaveBeenCalledWith('campaign-ondo-123');
  });

  it('navigates back when the back button is pressed', () => {
    const { getByTestId } = render(<OndoLeaderboardView />);
    fireEvent.press(getByTestId('ondo-leaderboard-back-button'));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('renders while leaderboard is loading', () => {
    mockUseGetOndoLeaderboard.mockReturnValue({
      ...hookDefaults,
      isLoading: true,
    });
    const { getByTestId } = render(<OndoLeaderboardView />);
    expect(getByTestId(ONDO_LEADERBOARD_VIEW_TEST_IDS.CONTAINER)).toBeDefined();
  });

  it('renders while leaderboard has an error', () => {
    mockUseGetOndoLeaderboard.mockReturnValue({
      ...hookDefaults,
      hasError: true,
    });
    const { getByTestId } = render(<OndoLeaderboardView />);
    expect(getByTestId(ONDO_LEADERBOARD_VIEW_TEST_IDS.CONTAINER)).toBeDefined();
  });

  it('renders when leaderboard is not yet computed', () => {
    mockUseGetOndoLeaderboard.mockReturnValue({
      ...hookDefaults,
      isLeaderboardNotYetComputed: true,
    });
    const { getByTestId } = render(<OndoLeaderboardView />);
    expect(getByTestId(ONDO_LEADERBOARD_VIEW_TEST_IDS.CONTAINER)).toBeDefined();
  });
});
