import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import PredictActivityDetails from './PredictActivityDetail';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { PredictActivityType } from '../../types';
import { PredictActivityDetailsSelectorsIDs } from '../../Predict.testIds';
import Routes from '../../../../../constants/navigation/Routes';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockCanGoBack = jest.fn();

let mockRoute = {
  params: {
    activity: {
      type: 'BUY',
      amountUsd: 100,
      marketTitle: 'Test Market Title',
      outcome: 'Yes',
      entry: {
        timestamp: 1706745600,
        amount: 100,
        price: 0.5,
      },
      priceImpactPercentage: 1.5,
    },
  },
};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: mockNavigate,
    canGoBack: mockCanGoBack,
  }),
  useRoute: () => mockRoute,
}));

jest.mock('../../../../../core/Engine', () => ({
  context: {
    PredictController: {
      trackActivityViewed: jest.fn(),
    },
  },
}));

jest.mock('./usdc.svg', () => 'UsdcIcon');

const mockBuyActivity = {
  type: PredictActivityType.BUY,
  amountUsd: 100,
  marketTitle: 'Test Market Title',
  outcome: 'Yes',
  entry: {
    timestamp: 1706745600,
    amount: 100,
    price: 0.5,
  },
  priceImpactPercentage: 1.5,
};

const mockSellActivity = {
  type: PredictActivityType.SELL,
  amountUsd: 150,
  marketTitle: 'Test Market Sell',
  outcome: 'No',
  entry: {
    timestamp: 1706745600,
    amount: 150,
    price: 0.75,
  },
  netPnlUsd: 50,
};

const mockClaimActivity = {
  type: PredictActivityType.CLAIM,
  amountUsd: 200,
  marketTitle: 'Test Claim Market',
  entry: {
    timestamp: 1706745600,
  },
  totalNetPnlUsd: 200,
  netPnlUsd: 200,
};

describe('PredictActivityDetails', () => {
  const initialState = {
    engine: {
      backgroundState: {
        ...backgroundState,
        PreferencesController: {
          ...backgroundState.PreferencesController,
          privacyMode: false,
        },
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRoute = {
      params: {
        activity: mockBuyActivity,
      },
    };
    mockCanGoBack.mockReturnValue(true);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders container with testID', () => {
    // Arrange & Act
    const { getByTestId } = renderWithProvider(<PredictActivityDetails />, {
      state: initialState,
    });

    // Assert
    expect(
      getByTestId(PredictActivityDetailsSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
  });

  it('renders predict activity header title', () => {
    // Arrange & Act
    const { getByText } = renderWithProvider(<PredictActivityDetails />, {
      state: initialState,
    });

    // Assert
    expect(getByText('Predicted')).toBeOnTheScreen();
  });

  it('renders date row', () => {
    // Arrange & Act
    const { getByText } = renderWithProvider(<PredictActivityDetails />, {
      state: initialState,
    });

    // Assert
    expect(getByText('Date')).toBeOnTheScreen();
  });

  it('renders market row for buy activity', () => {
    // Arrange & Act
    const { getByText } = renderWithProvider(<PredictActivityDetails />, {
      state: initialState,
    });

    // Assert
    expect(getByText('Market')).toBeOnTheScreen();
    expect(getByText('Test Market Title')).toBeOnTheScreen();
  });

  it('renders outcome row for buy activity', () => {
    // Arrange & Act
    const { getByText } = renderWithProvider(<PredictActivityDetails />, {
      state: initialState,
    });

    // Assert
    expect(getByText('Outcome')).toBeOnTheScreen();
    expect(getByText('Yes')).toBeOnTheScreen();
  });

  it('renders predicted amount for buy activity', () => {
    // Arrange & Act
    const { getByText } = renderWithProvider(<PredictActivityDetails />, {
      state: initialState,
    });

    // Assert
    expect(getByText('Predicted amount')).toBeOnTheScreen();
  });

  it('renders shares bought for buy activity', () => {
    // Arrange & Act
    const { getByText } = renderWithProvider(<PredictActivityDetails />, {
      state: initialState,
    });

    // Assert
    expect(getByText('Shares bought')).toBeOnTheScreen();
  });

  it('renders price per share for buy activity', () => {
    // Arrange & Act
    const { getByText } = renderWithProvider(<PredictActivityDetails />, {
      state: initialState,
    });

    // Assert
    expect(getByText('Price per share')).toBeOnTheScreen();
  });

  it('renders price impact for buy activity', () => {
    // Arrange & Act
    const { getByText } = renderWithProvider(<PredictActivityDetails />, {
      state: initialState,
    });

    // Assert
    expect(getByText('Price impact')).toBeOnTheScreen();
  });

  it('navigates back when back button is pressed and canGoBack is true', () => {
    // Arrange
    const { getByTestId } = renderWithProvider(<PredictActivityDetails />, {
      state: initialState,
    });
    const backButton = getByTestId(
      PredictActivityDetailsSelectorsIDs.BACK_BUTTON,
    );

    // Act
    fireEvent.press(backButton);

    // Assert
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('navigates to PREDICT.ROOT when back button is pressed and canGoBack is false', () => {
    // Arrange
    mockCanGoBack.mockReturnValue(false);
    const { getByTestId } = renderWithProvider(<PredictActivityDetails />, {
      state: initialState,
    });
    const backButton = getByTestId(
      PredictActivityDetailsSelectorsIDs.BACK_BUTTON,
    );

    // Act
    fireEvent.press(backButton);

    // Assert
    expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT);
  });
});

describe('PredictActivityDetails - Sell Activity', () => {
  const initialState = {
    engine: {
      backgroundState: {
        ...backgroundState,
        PreferencesController: {
          ...backgroundState.PreferencesController,
          privacyMode: false,
        },
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRoute = {
      params: {
        activity: mockSellActivity,
      },
    };
  });

  it('renders cash out activity header title', () => {
    // Arrange & Act
    const { getByText } = renderWithProvider(<PredictActivityDetails />, {
      state: initialState,
    });

    // Assert
    expect(getByText('Cashed out')).toBeOnTheScreen();
  });

  it('renders amount display for sell activity', () => {
    // Arrange & Act
    const { getByTestId } = renderWithProvider(<PredictActivityDetails />, {
      state: initialState,
    });

    // Assert
    expect(
      getByTestId(PredictActivityDetailsSelectorsIDs.AMOUNT_DISPLAY),
    ).toBeOnTheScreen();
  });

  it('renders shares sold label for sell activity', () => {
    // Arrange & Act
    const { getByText } = renderWithProvider(<PredictActivityDetails />, {
      state: initialState,
    });

    // Assert
    expect(getByText('Shares sold')).toBeOnTheScreen();
  });

  it('renders net PnL for sell activity', () => {
    // Arrange & Act
    const { getByText } = renderWithProvider(<PredictActivityDetails />, {
      state: initialState,
    });

    // Assert
    expect(getByText('Net P&L')).toBeOnTheScreen();
  });
});

describe('PredictActivityDetails - Claim Activity', () => {
  const initialState = {
    engine: {
      backgroundState: {
        ...backgroundState,
        PreferencesController: {
          ...backgroundState.PreferencesController,
          privacyMode: false,
        },
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRoute = {
      params: {
        activity: mockClaimActivity,
      },
    };
  });

  it('renders claim activity header title', () => {
    // Arrange & Act
    const { getByText } = renderWithProvider(<PredictActivityDetails />, {
      state: initialState,
    });

    // Assert
    expect(getByText('Claimed winnings')).toBeOnTheScreen();
  });

  it('renders total net PnL for claim activity', () => {
    // Arrange & Act
    const { getByText } = renderWithProvider(<PredictActivityDetails />, {
      state: initialState,
    });

    // Assert
    expect(getByText('Total net P&L')).toBeOnTheScreen();
  });
});

describe('PredictActivityDetails - No Activity', () => {
  const initialState = {
    engine: {
      backgroundState: {
        ...backgroundState,
        PreferencesController: {
          ...backgroundState.PreferencesController,
          privacyMode: false,
        },
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRoute = {
      params: {},
    };
  });

  it('renders default header title when activity is missing', () => {
    // Arrange & Act
    const { getByText } = renderWithProvider(<PredictActivityDetails />, {
      state: initialState,
    });

    // Assert
    expect(getByText('Activity details')).toBeOnTheScreen();
  });
});
