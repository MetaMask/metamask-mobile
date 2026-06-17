import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import Routes from '../../../../../constants/navigation/Routes';
import { selectPerpsEnabledFlag } from '../../../../UI/Perps/selectors/featureFlags';
import { selectPredictEnabledFlag } from '../../../../UI/Predict/selectors/featureFlags';
import { HomepageDiscoveryPillsTestIds } from './HomepageDiscoveryPills.testIds';
import { HOMESCREEN_PILL_SOURCE } from './useHomepageDiscoveryPillsNavigation';

const mockNavigate = jest.fn();
const mockTrackPillTapped = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../../hooks/usePillViewedEvent', () => ({
  __esModule: true,
  default: () => ({ trackPillTapped: mockTrackPillTapped }),
}));

jest.mock('../../../../../constants/navigation/exploreTabIndices', () => ({
  EXPLORE_TAB_INDEX: {
    NOW: 0,
    MACRO: 1,
    RWAS: 2,
    CRYPTO: 3,
    SPORTS: 4,
    SITES: 5,
  },
}));

const mockUseSelector = jest.fn();
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: (selector: unknown) => mockUseSelector(selector),
}));

import HomepageDiscoveryPills from './HomepageDiscoveryPills';

const mockSelectorState = ({
  isPerpsEnabled = true,
  isPredictEnabled = true,
}: {
  isPerpsEnabled?: boolean;
  isPredictEnabled?: boolean;
} = {}) => {
  mockUseSelector.mockImplementation((selector: unknown) => {
    if (selector === selectPerpsEnabledFlag) {
      return isPerpsEnabled;
    }
    if (selector === selectPredictEnabledFlag) {
      return isPredictEnabled;
    }
    return undefined;
  });
};

describe('HomepageDiscoveryPills', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectorState();
  });

  it('renders crypto and stocks when perps and predict are disabled', () => {
    mockSelectorState({ isPerpsEnabled: false, isPredictEnabled: false });

    const { queryByTestId } = render(
      <HomepageDiscoveryPills iconStyle="gray" />,
    );

    expect(
      queryByTestId(HomepageDiscoveryPillsTestIds.pill('perpetuals')),
    ).toBeNull();
    expect(
      queryByTestId(HomepageDiscoveryPillsTestIds.pill('predictions')),
    ).toBeNull();
    expect(
      queryByTestId(HomepageDiscoveryPillsTestIds.pill('crypto')),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(HomepageDiscoveryPillsTestIds.pill('stocks')),
    ).toBeOnTheScreen();
  });

  it('renders enabled discovery pills', () => {
    const { getByTestId } = render(<HomepageDiscoveryPills iconStyle="gray" />);

    expect(
      getByTestId(HomepageDiscoveryPillsTestIds.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      getByTestId(HomepageDiscoveryPillsTestIds.pill('perpetuals')),
    ).toBeOnTheScreen();
    expect(
      getByTestId(HomepageDiscoveryPillsTestIds.pill('predictions')),
    ).toBeOnTheScreen();
    expect(
      getByTestId(HomepageDiscoveryPillsTestIds.pill('crypto')),
    ).toBeOnTheScreen();
    expect(
      getByTestId(HomepageDiscoveryPillsTestIds.pill('stocks')),
    ).toBeOnTheScreen();
  });

  it('omits perps pill when perps flag is disabled', () => {
    mockSelectorState({ isPerpsEnabled: false });

    const { queryByTestId } = render(
      <HomepageDiscoveryPills iconStyle="gray" />,
    );

    expect(
      queryByTestId(HomepageDiscoveryPillsTestIds.pill('perpetuals')),
    ).toBeNull();
    expect(
      queryByTestId(HomepageDiscoveryPillsTestIds.pill('crypto')),
    ).toBeOnTheScreen();
  });

  it('navigates to perps home when perpetuals pill is pressed', () => {
    const { getByTestId } = render(<HomepageDiscoveryPills iconStyle="gray" />);

    fireEvent.press(
      getByTestId(HomepageDiscoveryPillsTestIds.pill('perpetuals')),
    );

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.PERPS_HOME,
      params: { source: HOMESCREEN_PILL_SOURCE },
    });
  });

  it('navigates to predict feed when predictions pill is pressed', () => {
    const { getByTestId } = render(<HomepageDiscoveryPills iconStyle="gray" />);

    fireEvent.press(
      getByTestId(HomepageDiscoveryPillsTestIds.pill('predictions')),
    );

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_LIST,
      params: { entryPoint: HOMESCREEN_PILL_SOURCE },
    });
  });

  it('navigates to explore crypto tab when crypto pill is pressed', () => {
    const { getByTestId } = render(<HomepageDiscoveryPills iconStyle="gray" />);

    fireEvent.press(getByTestId(HomepageDiscoveryPillsTestIds.pill('crypto')));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.TRENDING_VIEW, {
      screen: Routes.TRENDING_FEED,
      params: { initialTab: 3, source: HOMESCREEN_PILL_SOURCE },
    });
  });

  it('navigates to explore RWAs tab when stocks pill is pressed', () => {
    const { getByTestId } = render(<HomepageDiscoveryPills iconStyle="gray" />);

    fireEvent.press(getByTestId(HomepageDiscoveryPillsTestIds.pill('stocks')));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.TRENDING_VIEW, {
      screen: Routes.TRENDING_FEED,
      params: { initialTab: 2, source: HOMESCREEN_PILL_SOURCE },
    });
  });

  it('tracks pill_tapped before navigation when a pill is pressed', () => {
    const onPillPress = jest.fn();
    const { getByTestId } = render(
      <HomepageDiscoveryPills iconStyle="gray" onPillPress={onPillPress} />,
    );

    fireEvent.press(getByTestId(HomepageDiscoveryPillsTestIds.pill('crypto')));

    expect(mockTrackPillTapped).toHaveBeenCalledWith('crypto', 3);
    expect(onPillPress).toHaveBeenCalledWith('crypto', 3);
    expect(mockNavigate).toHaveBeenCalled();
  });
});
