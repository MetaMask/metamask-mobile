import React from 'react';
import { render, screen, act } from '@testing-library/react-native';
import {
  NavigationContainer,
  NavigationContainerRef,
} from '@react-navigation/native';
import Routes from '../../../../constants/navigation/Routes';
import PredictScreenStack, { PredictModalStack } from './index';

let mockPayWithAnyTokenEnabled = false;
let mockPredictPortfolioEnabled = true;
let mockPredictHomeRedesignEnabled = false;
let mockWorldCupHubV2Enabled = false;

const mockSelectPredictWithAnyTokenEnabledFlag = jest.fn(
  () => mockPayWithAnyTokenEnabled,
);
const mockSelectPredictPortfolioEnabledFlag = jest.fn(
  () => mockPredictPortfolioEnabled,
);
const mockSelectPredictHomeRedesignEnabledFlag = jest.fn(
  () => mockPredictHomeRedesignEnabled,
);
const mockSelectPredictWorldCupHubV2Enabled = jest.fn(
  () => mockWorldCupHubV2Enabled,
);

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn((selector: (state: unknown) => unknown) => selector({})),
}));

jest.mock('../selectors/featureFlags', () => ({
  selectPredictWithAnyTokenEnabledFlag: () =>
    mockSelectPredictWithAnyTokenEnabledFlag(),
  selectPredictPortfolioEnabledFlag: () =>
    mockSelectPredictPortfolioEnabledFlag(),
  selectPredictHomeRedesignEnabledFlag: () =>
    mockSelectPredictHomeRedesignEnabledFlag(),
  selectPredictWorldCupHubV2EnabledFlag: () =>
    mockSelectPredictWorldCupHubV2Enabled(),
}));

jest.mock('../contexts', () => {
  const { View } = jest.requireActual('react-native');
  return {
    PredictPreviewSheetProvider: ({
      children,
    }: {
      children: React.ReactNode;
    }) => <View testID="preview-sheet-provider">{children}</View>,
  };
});

jest.mock('../views/PredictFeed', () => {
  const { View, Text } = jest.requireActual('react-native');
  return () => (
    <View testID="predict-feed">
      <Text>PredictFeed</Text>
    </View>
  );
});

jest.mock('../views/PredictHome', () => {
  const { View, Text } = jest.requireActual('react-native');
  return () => (
    <View testID="predict-home">
      <Text>PredictHome</Text>
    </View>
  );
});

jest.mock('../views/PredictWorldCup', () => {
  const { View } = jest.requireActual('react-native');
  return () => <View testID="predict-world-cup" />;
});

jest.mock('../views/PredictWorldCupHub', () => {
  const { View } = jest.requireActual('react-native');
  return () => <View testID="predict-world-cup-hub" />;
});

jest.mock('../views/PredictFeedView', () => {
  const { View } = jest.requireActual('react-native');
  return () => <View testID="predict-feed-view" />;
});

jest.mock('../views/PredictMarketDetails', () => {
  const { View } = jest.requireActual('react-native');
  return () => <View testID="predict-market-details" />;
});

jest.mock('../views/PredictPositionsView', () => {
  const { View } = jest.requireActual('react-native');
  return () => <View testID="predict-positions-view" />;
});

jest.mock('../views/PredictBuyPreview/PredictBuyPreview', () => {
  const { View } = jest.requireActual('react-native');
  return () => <View testID="predict-buy-preview" />;
});

jest.mock('../views/PredictBuyWithAnyToken', () => {
  const { View } = jest.requireActual('react-native');
  return () => <View testID="predict-buy-with-any-token" />;
});

jest.mock('../views/PredictSellPreview/PredictSellPreview', () => {
  const { View } = jest.requireActual('react-native');
  return () => <View testID="predict-sell-preview" />;
});

jest.mock('../views/PredictUnavailableModal', () => {
  const { View } = jest.requireActual('react-native');
  return () => <View testID="predict-unavailable-modal" />;
});

jest.mock('../views/PredictAddFundsModal/PredictAddFundsModal', () => {
  const { View } = jest.requireActual('react-native');
  return () => <View testID="predict-add-funds-modal" />;
});

jest.mock('../components/PredictActivityDetail/PredictActivityDetail', () => {
  const { View } = jest.requireActual('react-native');
  return () => <View testID="predict-activity-detail" />;
});

jest.mock('../../../Views/confirmations/components/confirm', () => ({
  Confirm: () => {
    const { View } = jest.requireActual('react-native');
    return <View testID="confirm-component" />;
  },
}));

jest.mock(
  '../../../../constants/navigation/clearStackNavigatorOptions',
  () => ({
    clearNativeStackNavigatorOptions: {},
    transparentModalScreenOptions: {},
  }),
);

jest.mock(
  '../../../Views/confirmations/hooks/ui/useEmptyNavHeaderForConfirmations',
  () => ({
    useEmptyNavHeaderForConfirmations: () => ({ headerShown: false }),
  }),
);

let navigationRef: React.RefObject<NavigationContainerRef<
  Record<string, unknown>
> | null>;

const renderWithNavigation = (component: React.ReactElement) =>
  render(
    <NavigationContainer ref={navigationRef}>{component}</NavigationContainer>,
  );

describe('PredictScreenStack', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPayWithAnyTokenEnabled = false;
    mockPredictPortfolioEnabled = true;
    mockPredictHomeRedesignEnabled = false;
    mockWorldCupHubV2Enabled = false;
    navigationRef = React.createRef();
  });

  it('wraps content in PredictPreviewSheetProvider', () => {
    renderWithNavigation(<PredictScreenStack />);

    expect(screen.getByTestId('preview-sheet-provider')).toBeOnTheScreen();
  });

  it('renders PredictFeed at market list when home redesign flag is disabled', () => {
    mockPredictHomeRedesignEnabled = false;
    renderWithNavigation(<PredictScreenStack />);

    expect(screen.getByTestId('predict-feed')).toBeOnTheScreen();
    expect(screen.queryByTestId('predict-home')).toBeNull();
  });

  it('renders PredictHome at market list when home redesign flag is enabled', () => {
    mockPredictHomeRedesignEnabled = true;
    renderWithNavigation(<PredictScreenStack />);

    expect(screen.getByTestId('predict-home')).toBeOnTheScreen();
    expect(screen.queryByTestId('predict-feed')).toBeNull();
  });

  it('navigates to MARKET_DETAILS screen', async () => {
    renderWithNavigation(<PredictScreenStack />);

    await act(async () => {
      navigationRef.current?.navigate(Routes.PREDICT.MARKET_DETAILS);
    });

    expect(screen.getByTestId('predict-market-details')).toBeOnTheScreen();
  });

  it('navigates to WORLD_CUP screen and renders the V1 screen when hub V2 is disabled', async () => {
    mockWorldCupHubV2Enabled = false;
    renderWithNavigation(<PredictScreenStack />);

    await act(async () => {
      navigationRef.current?.navigate(Routes.PREDICT.WORLD_CUP);
    });

    expect(screen.getByTestId('predict-world-cup')).toBeOnTheScreen();
    expect(screen.queryByTestId('predict-world-cup-hub')).not.toBeOnTheScreen();
  });

  it('navigates to WORLD_CUP screen and renders the V2 hub when hub V2 is enabled', async () => {
    mockWorldCupHubV2Enabled = true;
    renderWithNavigation(<PredictScreenStack />);

    await act(async () => {
      navigationRef.current?.navigate(Routes.PREDICT.WORLD_CUP);
    });

    expect(screen.getByTestId('predict-world-cup-hub')).toBeOnTheScreen();
    expect(screen.queryByTestId('predict-world-cup')).not.toBeOnTheScreen();
  });

  it('navigates to FEED screen', async () => {
    renderWithNavigation(<PredictScreenStack />);

    await act(async () => {
      navigationRef.current?.navigate(Routes.PREDICT.FEED, {
        feedId: 'sports',
      });
    });

    expect(screen.getByTestId('predict-feed-view')).toBeOnTheScreen();
  });

  it('navigates to POSITIONS screen when portfolio flag is enabled', async () => {
    mockPredictPortfolioEnabled = true;
    renderWithNavigation(<PredictScreenStack />);

    await act(async () => {
      navigationRef.current?.navigate(Routes.PREDICT.POSITIONS);
    });

    expect(screen.getByTestId('predict-positions-view')).toBeOnTheScreen();
  });

  it('navigates to POSITIONS screen when portfolio flag is disabled', async () => {
    mockPredictPortfolioEnabled = false;
    renderWithNavigation(<PredictScreenStack />);

    await act(async () => {
      navigationRef.current?.navigate(Routes.PREDICT.POSITIONS);
    });

    expect(screen.getByTestId('predict-positions-view')).toBeOnTheScreen();
  });

  it('navigates to BUY_PREVIEW with PredictBuyPreview when payWithAnyToken is off', async () => {
    mockPayWithAnyTokenEnabled = false;

    renderWithNavigation(<PredictScreenStack />);

    await act(async () => {
      navigationRef.current?.navigate(Routes.PREDICT.MODALS.BUY_PREVIEW);
    });

    expect(screen.getByTestId('predict-buy-preview')).toBeOnTheScreen();
  });

  it('navigates to BUY_PREVIEW with PredictBuyWithAnyToken when payWithAnyToken is on', async () => {
    mockPayWithAnyTokenEnabled = true;

    renderWithNavigation(<PredictScreenStack />);

    await act(async () => {
      navigationRef.current?.navigate(Routes.PREDICT.MODALS.BUY_PREVIEW);
    });

    expect(screen.getByTestId('predict-buy-with-any-token')).toBeOnTheScreen();
  });

  it('navigates to SELL_PREVIEW screen', async () => {
    renderWithNavigation(<PredictScreenStack />);

    await act(async () => {
      navigationRef.current?.navigate(Routes.PREDICT.MODALS.SELL_PREVIEW);
    });

    expect(screen.getByTestId('predict-sell-preview')).toBeOnTheScreen();
  });

  it('navigates to redesigned confirmation screen', async () => {
    renderWithNavigation(<PredictScreenStack />);

    await act(async () => {
      navigationRef.current?.navigate(
        Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
      );
    });

    expect(screen.getByTestId('confirm-component')).toBeOnTheScreen();
  });

  it('navigates to no-header confirmation screen', async () => {
    renderWithNavigation(<PredictScreenStack />);

    await act(async () => {
      navigationRef.current?.navigate(
        Routes.FULL_SCREEN_CONFIRMATIONS.NO_HEADER,
      );
    });

    expect(screen.getByTestId('confirm-component')).toBeOnTheScreen();
  });

  it('navigates to no-header confirmation with animation disabled', async () => {
    renderWithNavigation(<PredictScreenStack />);

    await act(async () => {
      navigationRef.current?.navigate(
        Routes.FULL_SCREEN_CONFIRMATIONS.NO_HEADER,
        { animationEnabled: false },
      );
    });

    expect(screen.getByTestId('confirm-component')).toBeOnTheScreen();
  });

  it('navigates to redesigned confirmation with animation disabled', async () => {
    renderWithNavigation(<PredictScreenStack />);

    await act(async () => {
      navigationRef.current?.navigate(
        Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
        { animationEnabled: false },
      );
    });

    expect(screen.getByTestId('confirm-component')).toBeOnTheScreen();
  });

  it('navigates to redesigned confirmation with animation enabled', async () => {
    renderWithNavigation(<PredictScreenStack />);

    await act(async () => {
      navigationRef.current?.navigate(
        Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
        { animationEnabled: true },
      );
    });

    expect(screen.getByTestId('confirm-component')).toBeOnTheScreen();
  });
});

describe('PredictModalStack', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    navigationRef = React.createRef();
  });

  it('renders with initial route UNAVAILABLE', () => {
    renderWithNavigation(<PredictModalStack />);

    expect(screen.getByTestId('predict-unavailable-modal')).toBeOnTheScreen();
  });

  it('navigates to ADD_FUNDS_SHEET', async () => {
    renderWithNavigation(<PredictModalStack />);

    await act(async () => {
      navigationRef.current?.navigate(Routes.PREDICT.MODALS.ADD_FUNDS_SHEET);
    });

    expect(screen.getByTestId('predict-add-funds-modal')).toBeOnTheScreen();
  });

  it('navigates to ACTIVITY_DETAIL', async () => {
    renderWithNavigation(<PredictModalStack />);

    await act(async () => {
      navigationRef.current?.navigate(Routes.PREDICT.ACTIVITY_DETAIL);
    });

    expect(screen.getByTestId('predict-activity-detail')).toBeOnTheScreen();
  });

  it('navigates to redesigned confirmation in modal stack', async () => {
    renderWithNavigation(<PredictModalStack />);

    await act(async () => {
      navigationRef.current?.navigate(
        Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
      );
    });

    expect(screen.getByTestId('confirm-component')).toBeOnTheScreen();
  });

  it('navigates to no-header confirmation in modal stack', async () => {
    renderWithNavigation(<PredictModalStack />);

    await act(async () => {
      navigationRef.current?.navigate(
        Routes.FULL_SCREEN_CONFIRMATIONS.NO_HEADER,
      );
    });

    expect(screen.getByTestId('confirm-component')).toBeOnTheScreen();
  });

  it('navigates to no-header confirmation with animation disabled in modal', async () => {
    renderWithNavigation(<PredictModalStack />);

    await act(async () => {
      navigationRef.current?.navigate(
        Routes.FULL_SCREEN_CONFIRMATIONS.NO_HEADER,
        { animationEnabled: false },
      );
    });

    expect(screen.getByTestId('confirm-component')).toBeOnTheScreen();
  });
});
