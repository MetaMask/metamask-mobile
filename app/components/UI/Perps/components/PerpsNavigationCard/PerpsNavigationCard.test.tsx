import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import PerpsNavigationCard, {
  type NavigationItem,
} from './PerpsNavigationCard';

jest.mock('../../../../hooks/useStyles', () => ({
  useStyles: () => ({
    styles: {
      container: {},
      itemWrapper: {},
      itemFirst: {},
      itemLast: {},
      listItem: {},
    },
  }),
}));

jest.mock('./PerpsNavigationCard.styles', () => ({}));

jest.mock(
  '../../../../../component-library/components/List/ListItem',
  () => 'ListItem',
);
jest.mock(
  '../../../../../component-library/components/List/ListItemColumn',
  () => ({
    __esModule: true,
    default: 'ListItemColumn',
    WidthType: {
      Fill: 'Fill',
      Auto: 'Auto',
    },
  }),
);
jest.mock('../../../../../component-library/components/Icons/Icon', () => ({
  __esModule: true,
  default: 'Icon',
  IconName: {
    Setting: 'Setting',
    Notification: 'Notification',
    ArrowRight: 'ArrowRight',
  },
  IconSize: {
    Md: 'Md',
  },
  IconColor: {
    Default: 'Default',
    Alternative: 'Alternative',
    Primary: 'Primary',
  },
}));
jest.mock('../../../../../component-library/components/Texts/Text', () => ({
  __esModule: true,
  default: 'Text',
  TextVariant: {
    BodyMD: 'BodyMD',
  },
  TextColor: {
    Default: 'Default',
  },
}));

describe('PerpsNavigationCard', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with single item', () => {
    // Arrange
    const items: NavigationItem[] = [
      {
        label: 'Settings',
        onPress: mockOnPress,
      },
    ];

    // Act
    const { getByText } = render(<PerpsNavigationCard items={items} />);

    // Assert
    expect(getByText('Settings')).toBeTruthy();
  });

  it('renders with multiple items', () => {
    // Arrange
    const items: NavigationItem[] = [
      {
        label: 'Settings',
        onPress: mockOnPress,
      },
      {
        label: 'Notifications',
        onPress: mockOnPress,
      },
      {
        label: 'Help',
        onPress: mockOnPress,
      },
    ];

    // Act
    const { getByText } = render(<PerpsNavigationCard items={items} />);

    // Assert
    expect(getByText('Settings')).toBeTruthy();
    expect(getByText('Notifications')).toBeTruthy();
    expect(getByText('Help')).toBeTruthy();
  });

  it('handles onPress callback when item is pressed', () => {
    // Arrange
    const items: NavigationItem[] = [
      {
        label: 'Settings',
        onPress: mockOnPress,
        testID: 'settings-item',
      },
    ];

    // Act
    const { getByTestId } = render(<PerpsNavigationCard items={items} />);
    const item = getByTestId('settings-item');
    fireEvent.press(item);

    // Assert
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('calls correct onPress for each item', () => {
    // Arrange
    const onPress1 = jest.fn();
    const onPress2 = jest.fn();
    const items: NavigationItem[] = [
      {
        label: 'Settings',
        onPress: onPress1,
        testID: 'settings-item',
      },
      {
        label: 'Notifications',
        onPress: onPress2,
        testID: 'notifications-item',
      },
    ];

    // Act
    const { getByTestId } = render(<PerpsNavigationCard items={items} />);
    fireEvent.press(getByTestId('settings-item'));
    fireEvent.press(getByTestId('notifications-item'));

    // Assert
    expect(onPress1).toHaveBeenCalledTimes(1);
    expect(onPress2).toHaveBeenCalledTimes(1);
  });

  it('renders with icon when iconName is provided', () => {
    // Arrange
    const items: NavigationItem[] = [
      {
        label: 'Settings',
        iconName: IconName.Setting,
        onPress: mockOnPress,
      },
    ];

    // Act
    const { UNSAFE_getAllByType } = render(
      <PerpsNavigationCard items={items} />,
    );
    const icons = UNSAFE_getAllByType('Icon' as never);

    // Assert - Should have both the left icon and the right arrow icon
    expect(icons.length).toBeGreaterThanOrEqual(2);
  });

  it('renders without left icon when iconName is not provided', () => {
    // Arrange
    const items: NavigationItem[] = [
      {
        label: 'Settings',
        onPress: mockOnPress,
      },
    ];

    // Act
    const { UNSAFE_getAllByType } = render(
      <PerpsNavigationCard items={items} />,
    );
    const icons = UNSAFE_getAllByType('Icon' as never);

    // Assert - Should have only the right arrow icon
    expect(icons.length).toBe(1);
  });

  it('shows arrow icon by default', () => {
    // Arrange
    const items: NavigationItem[] = [
      {
        label: 'Settings',
        onPress: mockOnPress,
      },
    ];

    // Act
    const { UNSAFE_getAllByType } = render(
      <PerpsNavigationCard items={items} />,
    );
    const icons = UNSAFE_getAllByType('Icon' as never);

    // Assert - Should render arrow icon
    expect(icons.length).toBeGreaterThan(0);
  });

  it('hides arrow icon when showArrow is false', () => {
    // Arrange
    const items: NavigationItem[] = [
      {
        label: 'Settings',
        onPress: mockOnPress,
        showArrow: false,
      },
    ];

    // Act
    const { UNSAFE_queryAllByType } = render(
      <PerpsNavigationCard items={items} />,
    );
    const icons = UNSAFE_queryAllByType('Icon' as never);

    // Assert - Should not render any icons (no arrow, no left icon)
    expect(icons.length).toBe(0);
  });

  it('renders empty list when items array is empty', () => {
    // Arrange
    const items: NavigationItem[] = [];

    // Act
    const { queryByText } = render(<PerpsNavigationCard items={items} />);

    // Assert
    expect(queryByText('Settings')).toBeNull();
  });

  it('renders items with testID when provided', () => {
    // Arrange
    const items: NavigationItem[] = [
      {
        label: 'Settings',
        onPress: mockOnPress,
        testID: 'custom-test-id',
      },
    ];

    // Act
    const { getByTestId } = render(<PerpsNavigationCard items={items} />);

    // Assert
    expect(getByTestId('custom-test-id')).toBeTruthy();
  });
});
