import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';

import TradeTabBarItem from './TradeTabBarItem';
import { selectChainId } from '../../../../selectors/networkController';
import { useSelector } from 'react-redux';

const mockNavigate = jest.fn();

// mock useSelector selectedChainId
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

// Mock navigation
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

describe('TradeTabBarItem', () => {
  const defaultProps = {
    label: 'Trade',
  };
  beforeEach(() => {
    jest.clearAllMocks();
    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectChainId) return '1';
      return selector();
    });
  });

  it('renders TradeTabBarItem with icon and label', () => {
    const component = render(
      <TradeTabBarItem {...defaultProps} testID="trade-tab-item" />,
    );
    const { getByText, getByTestId } = component;

    expect(getByTestId('trade-tab-item')).toBeTruthy();
    expect(getByText('Trade')).toBeTruthy();
    expect(component).toMatchSnapshot();
  });

  it('renders TradeTabBarItem with icon only', () => {
    const component = render(
      <TradeTabBarItem testID="trade-tab-item" />,
    );
    const { queryByText, getByTestId } = component;

    expect(getByTestId('trade-tab-item')).toBeTruthy();
    expect(queryByText('Trade')).not.toBeTruthy();
    expect(component).toMatchSnapshot();
  });

  it('navigates to Trade screen on press and tracks event', () => {
    const { getByTestId } = render(
      <TradeTabBarItem {...defaultProps} testID="trade-tab-item" />,
    );

    const tradeTabItem = getByTestId('trade-tab-item');
    const tradeTabItemIconContainer = getByTestId(
      'trade-tab-bar-item-icon-container',
    );

    act(() => {
      fireEvent(tradeTabItemIconContainer, 'onLayout', {
        target: {
          measureInWindow: jest
            .fn()
            .mockImplementation((cb) => cb(123, 456, 100, 50)),
        },
      });
    });

    fireEvent.press(tradeTabItem);

    expect(mockNavigate).toHaveBeenCalledWith(
      'RootModalFlow',
      expect.objectContaining({
        screen: 'TradeWalletActions',
        params: expect.objectContaining({
          onDismiss: expect.any(Function),
          buttonLayout: expect.objectContaining({
            x: 123,
            y: 456,
            width: 100,
            height: 50,
          }),
        }),
      }),
    );
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });
});
