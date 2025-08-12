// Third party dependencies.
import React from 'react';
import { fireEvent } from '@testing-library/react-native';

// External dependencies.
import { IconName } from '../../Icons/Icon';
import renderWithProvider from '../../../../util/test/renderWithProvider';

// Internal dependencies
import TabBarItem from './TabBarItem';

// Mock the dependencies
jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: jest.fn(() => ({
    style: jest.fn((classes) => ({ testClasses: classes })),
    color: jest.fn((colorClass) => {
      const colorMap: { [key: string]: string } = {
        'text-primary-inverse': '#FFFFFF',
      };
      return colorMap[colorClass] || '#000000';
    }),
  })),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
  Theme: {
    Light: 'light',
  },
}));

jest.mock('../../Icons/Icon', () => {
  const MockIcon = ({ name, testID }: { name: string; testID?: string }) => {
    const React = require('react');
    return React.createElement('MockIcon', { name, testID });
  };
  MockIcon.displayName = 'Icon';

  return {
    __esModule: true,
    default: MockIcon,
    IconColor: {
      Default: 'icon-default',
      Alternative: 'icon-alternative',
    },
    IconSize: {
      Md: 'md',
      Lg: 'lg',
    },
  };
});

jest.mock('../../Texts/Text', () => ({
  __esModule: true,
  default: ({
    children,
    testID,
  }: {
    children: React.ReactNode;
    testID?: string;
  }) => {
    const React = require('react');
    return React.createElement('MMText', { testID }, children);
  },
  TextColor: {
    Default: 'text-default',
    Alternative: 'text-alternative',
  },
  TextVariant: {
    BodyXSMedium: 'body-xs-medium',
  },
}));

describe('TabBarItem', () => {
  const defaultProps = {
    label: 'Home',
    iconName: IconName.Bank,
    onPress: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render correctly with default props', () => {
    const { toJSON } = renderWithProvider(<TabBarItem {...defaultProps} />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('should render correctly when active', () => {
    const { toJSON } = renderWithProvider(
      <TabBarItem {...defaultProps} isActive={true} />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('should render correctly with label text', () => {
    const { toJSON } = renderWithProvider(
      <TabBarItem {...defaultProps} labelText="Home" />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('should render correctly as trade button', () => {
    const { toJSON } = renderWithProvider(
      <TabBarItem {...defaultProps} isTradeButton={true} />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('should render correctly as trade button with light theme wrapper', () => {
    const { toJSON } = renderWithProvider(
      <TabBarItem {...defaultProps} isTradeButton={true} />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('should render correctly with flex style', () => {
    const { toJSON } = renderWithProvider(
      <TabBarItem {...defaultProps} flexStyle="flex" />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('should call onPress when pressed', () => {
    const mockOnPress = jest.fn();
    const { getByTestId } = renderWithProvider(
      <TabBarItem
        {...defaultProps}
        onPress={mockOnPress}
        testID="tab-bar-item-test"
      />,
    );

    fireEvent.press(getByTestId('tab-bar-item-test'));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('should not render label text for trade button', () => {
    const { toJSON } = renderWithProvider(
      <TabBarItem
        {...defaultProps}
        isTradeButton={true}
        labelText="This should not show"
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('should use correct icon colors based on state', () => {
    // Test inactive state
    const { rerender, toJSON: inactiveSnapshot } = renderWithProvider(
      <TabBarItem {...defaultProps} isActive={false} />,
    );
    expect(inactiveSnapshot()).toMatchSnapshot();

    // Test active state
    rerender(<TabBarItem {...defaultProps} isActive={true} />);
    expect(inactiveSnapshot()).toMatchSnapshot();

    // Test trade button (should override active state)
    rerender(
      <TabBarItem {...defaultProps} isActive={true} isTradeButton={true} />,
    );
    expect(inactiveSnapshot()).toMatchSnapshot();
  });
});
