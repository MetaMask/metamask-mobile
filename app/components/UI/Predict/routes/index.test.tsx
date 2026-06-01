import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react-native';
import {
  NavigationContainer,
  NavigationContainerRef,
} from '@react-navigation/native';
import Routes from '../../../../constants/navigation/Routes';
import PredictScreenStack, { PredictModalStack } from './index';

let mockPayWithAnyTokenEnabled = false;
let mockPredictPortfolioEnabled = true;

const mockSelectPredictWithAnyTokenEnabledFlag = jest.fn(
  () => mockPayWithAnyTokenEnabled,
);
const mockSelectPredictPortfolioEnabledFlag = jest.fn(
  () => mockPredictPortfolioEnabled,
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

jest.mock('../views/PredictWorldCup', () => {
  const { View } = jest.requireActual('react-native');
  return () => <View testID="predict-world-cup" />;
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

jest.mock('../components/PredictGTMModal', () => {
  const { View } = jest.requireActual('react-native');
  return () => <View testID="predict-gtm-modal" />;
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
    navigationRef = React.createRef();
  });

  it('wraps content in PredictPreviewSheetProvider', () => {
    renderWithNavigation(<PredictScreenStack />);

    expect(screen.getByTestId('preview-sheet-provider')).toBeOnTheScreen();
  });

  it('renders PredictFeed as initial route', () => {
    renderWithNavigation(<PredictScreenStack />);

    expect(screen.getByTestId('predict-feed')).toBeOnTheScreen();
  });

  it('navigates to MARKET_DETAILS screen', async () => {
    renderWithNavigation(<PredictScreenStack />);

    await act(async () => {
      navigationRef.current?.navigate(Routes.PREDICT.MARKET_DETAILS);
    });

    expect(screen.getByTestId('predict-market-details')).toBeOnTheScreen();
  });

  it('navigates to WORLD_CUP screen', async () => {
    renderWithNavigation(<PredictScreenStack />);

    await act(async () => {
      navigationRef.current?.navigate(Routes.PREDICT.WORLD_CUP);
    });

    expect(screen.getByTestId('predict-world-cup')).toBeOnTheScreen();
  });

  it('navigates to POSITIONS screen when portfolio flag is enabled', async () => {
    mockPredictPortfolioEnabled = true;
    renderWithNavigation(<PredictScreenStack />);

    await act(async () => {
      navigationRef.current?.navigate(Routes.PREDICT.POSITIONS);
    });

    expect(screen.getByTestId('predict-positions-view')).toBeOnTheScreen();
  });

  it('returns to market list when POSITIONS screen is disabled', async () => {
    mockPredictPortfolioEnabled = false;
    renderWithNavigation(<PredictScreenStack />);

    await act(async () => {
      navigationRef.current?.navigate(Routes.PREDICT.POSITIONS);
    });

    await waitFor(() => {
      expect(navigationRef.current?.getCurrentRoute()?.name).toBe(
        Routes.PREDICT.MARKET_LIST,
      );
    });
    expect(screen.queryByTestId('predict-positions-view')).toBeNull();
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

  it('navigates to GTM_MODAL', async () => {
    renderWithNavigation(<PredictModalStack />);

    await act(async () => {
      navigationRef.current?.navigate(Routes.PREDICT.MODALS.GTM_MODAL);
    });

    expect(screen.getByTestId('predict-gtm-modal')).toBeOnTheScreen();
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
