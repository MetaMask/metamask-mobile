import React from 'react';
import { userEvent } from '@testing-library/react-native';
import { lightTheme } from '@metamask/design-tokens';
import NotificationRoot from './Root';
import renderWithProvider from '../../../../util/test/renderWithProvider';

describe('NotificationRoot', () => {
  const arrange = () => {
    const mockOnPress = jest.fn();
    const testID = 'notification-root';
    const renderComponent = (props = { isRead: false }) =>
      renderWithProvider(
        <NotificationRoot
          handleOnPress={mockOnPress}
          isRead={props.isRead}
          testID={testID}
        >
          Hello
        </NotificationRoot>,
      );

    return {
      mockOnPress,
      renderComponent,
      testID,
    };
  };

  it('renders component with read styles', () => {
    const { renderComponent, testID } = arrange();
    const { getByTestId } = renderComponent({ isRead: true });
    expect(getByTestId(testID)).toHaveStyle({
      backgroundColor: lightTheme.colors.background.default,
    });
  });

  it('renders component with unread styles', () => {
    const { renderComponent, testID } = arrange();
    const { getByTestId } = renderComponent({ isRead: false });
    expect(getByTestId(testID)).toHaveStyle({
      backgroundColor: lightTheme.colors.info.muted,
    });
  });

  it('invokes callback when pressed', async () => {
    const { renderComponent, testID, mockOnPress } = arrange();
    const { getByTestId } = renderComponent();
    await userEvent.press(getByTestId(testID));
    expect(mockOnPress).toHaveBeenCalled();
  });
});
