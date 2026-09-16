import { render } from '@testing-library/react-native';
import React from 'react';
import { useSelector } from 'react-redux';
import { selectEarnTradeMenuRowRedesignEnabled } from '../../../../../components/UI/Earn/selectors/featureFlags';
import type { RootState } from '../../../../../reducers';
import EarnTradeMenuRow from './EarnTradeMenuRow';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../../components/UI/Earn/selectors/featureFlags', () => ({
  selectEarnTradeMenuRowRedesignEnabled: jest.fn(),
}));

jest.mock('./LegacyEarnTradeMenuRow', () => ({
  __esModule: true,
  default: () => {
    const ReactModule = jest.requireActual('react');
    const { Text: MockText } = jest.requireActual('react-native');
    return ReactModule.createElement(MockText, {
      testID: 'legacy-earn-trade-menu-row',
    });
  },
}));

jest.mock('./RedesignedEarnTradeMenuRow', () => ({
  __esModule: true,
  default: () => {
    const ReactModule = jest.requireActual('react');
    const { Text: MockText } = jest.requireActual('react-native');
    return ReactModule.createElement(MockText, {
      testID: 'redesigned-earn-trade-menu-row',
    });
  },
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockSelectEarnTradeMenuRowRedesignEnabled = jest.mocked(
  selectEarnTradeMenuRowRedesignEnabled,
);

describe('EarnTradeMenuRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockImplementation((selector) => selector({} as RootState));
  });

  it('renders the legacy row when redesign flag is disabled', () => {
    mockSelectEarnTradeMenuRowRedesignEnabled.mockReturnValue(false);

    const { getByTestId, queryByTestId } = render(
      <EarnTradeMenuRow onActionSelected={jest.fn()} isDisabled={false} />,
    );

    expect(getByTestId('legacy-earn-trade-menu-row')).toBeOnTheScreen();
    expect(
      queryByTestId('redesigned-earn-trade-menu-row'),
    ).not.toBeOnTheScreen();
  });

  it('renders the redesigned row when redesign flag is enabled', () => {
    mockSelectEarnTradeMenuRowRedesignEnabled.mockReturnValue(true);

    const { getByTestId, queryByTestId } = render(
      <EarnTradeMenuRow onActionSelected={jest.fn()} isDisabled={false} />,
    );

    expect(getByTestId('redesigned-earn-trade-menu-row')).toBeOnTheScreen();
    expect(queryByTestId('legacy-earn-trade-menu-row')).not.toBeOnTheScreen();
  });
});
