import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { PerpsMode } from '@metamask/perps-controller';
import Routes from '../../../../../../constants/navigation/Routes';
import { selectCanSignTransactions } from '../../../../../../selectors/accountsController';
import { selectPerpsEnabledFlag } from '../../../../../UI/Perps';
import {
  selectIsFirstTimePerpsUser,
  selectPerpsMode,
} from '../../../../../UI/Perps/selectors/perpsController';
import { selectPerpsProModeEnabledFlag } from '../../../../../UI/Perps/selectors/featureFlags';
import { ActionPosition } from '../../../../../../util/analytics/actionButtonTracking';
import { HomepageActionButtonsGridTestIds } from '../HomepageActionButtonsGrid.testIds';
import PerpsButton from './PerpsButton';

const mockNavigate = jest.fn();
const mockUseSelector = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: (selector: unknown) => mockUseSelector(selector),
}));

jest.mock('../../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: jest.fn(),
    createEventBuilder: jest.fn(() => ({
      addProperties: jest.fn().mockReturnThis(),
      build: jest.fn(),
    })),
  }),
}));

interface SelectorOverrides {
  canSignTransactions?: boolean;
  isPerpsEnabled?: boolean;
  isFirstTimePerpsUser?: boolean;
  isProModeEnabled?: boolean;
  perpsMode?: PerpsMode;
}

const mockSelectorState = (overrides: SelectorOverrides = {}) => {
  const {
    canSignTransactions = true,
    isPerpsEnabled = true,
    isFirstTimePerpsUser = false,
    isProModeEnabled = false,
    perpsMode = PerpsMode.Lite,
  } = overrides;

  mockUseSelector.mockImplementation((selector: unknown) => {
    if (selector === selectCanSignTransactions) return canSignTransactions;
    if (selector === selectPerpsEnabledFlag) return isPerpsEnabled;
    if (selector === selectIsFirstTimePerpsUser) return isFirstTimePerpsUser;
    if (selector === selectPerpsProModeEnabledFlag) return isProModeEnabled;
    if (selector === selectPerpsMode) return perpsMode;
    return undefined;
  });
};

describe('PerpsButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectorState();
  });

  it('navigates to Perps home when Pro mode is not active', () => {
    const { getByTestId } = render(
      <PerpsButton actionPosition={ActionPosition.FIRST_POSITION} />,
    );

    fireEvent.press(getByTestId(HomepageActionButtonsGridTestIds.PERPS_BUTTON));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.PERPS_HOME,
      params: {},
    });
  });

  it('navigates to the default Pro market instead of Perps home when Pro mode is active', () => {
    mockSelectorState({ isProModeEnabled: true, perpsMode: PerpsMode.Pro });

    const { getByTestId } = render(
      <PerpsButton actionPosition={ActionPosition.FIRST_POSITION} />,
    );

    fireEvent.press(getByTestId(HomepageActionButtonsGridTestIds.PERPS_BUTTON));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.MARKET_DETAILS,
      params: expect.objectContaining({
        market: expect.objectContaining({ symbol: 'BTC' }),
      }),
    });
  });

  it('navigates to the tutorial for first-time users regardless of Pro mode', () => {
    mockSelectorState({
      isFirstTimePerpsUser: true,
      isProModeEnabled: true,
      perpsMode: PerpsMode.Pro,
    });

    const { getByTestId } = render(
      <PerpsButton actionPosition={ActionPosition.FIRST_POSITION} />,
    );

    fireEvent.press(getByTestId(HomepageActionButtonsGridTestIds.PERPS_BUTTON));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.TUTORIAL);
    expect(mockNavigate).not.toHaveBeenCalledWith(
      Routes.PERPS.ROOT,
      expect.anything(),
    );
  });
});
