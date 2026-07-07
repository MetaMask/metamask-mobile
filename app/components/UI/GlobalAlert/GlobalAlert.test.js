import React from 'react';
import { Text } from 'react-native';
import { brandColor, darkTheme } from '@metamask/design-tokens';
import GlobalAlert from './index';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { AppThemeKey } from '../../../util/theme/models';
import { getElevatedSurfaceColor } from '../../../util/theme/themeUtils';

jest.mock('react-native-modal', () => {
  const ReactMock = require('react');
  const { View } = require('react-native');

  return ({ children, isVisible }) =>
    isVisible
      ? ReactMock.createElement(View, { testID: 'global-alert-modal' }, children)
      : null;
});

jest.mock('react-native-elevated-view', () => {
  const ReactMock = require('react');
  const { View } = require('react-native');

  return ({ children, style }) =>
    ReactMock.createElement(
      View,
      { testID: 'global-alert-elevated-view', style },
      children,
    );
});

jest.mock('react-native-vector-icons/FontAwesome', () => {
  const ReactMock = require('react');
  const { Text: TextMock } = require('react-native');

  return ({ color }) =>
    ReactMock.createElement(TextMock, { testID: 'global-alert-icon', color });
});

const darkThemeValue = {
  colors: darkTheme.colors,
  themeAppearance: AppThemeKey.dark,
  typography: darkTheme.typography,
  shadows: darkTheme.shadows,
  brandColors: brandColor,
};

describe('GlobalAlert', () => {
  it('uses elevated surface and semantic foreground tokens for clipboard alerts', () => {
    const { getByTestId, getByText } = renderWithProvider(<GlobalAlert />, {
      theme: darkThemeValue,
      state: {
        alert: {
          isVisible: true,
          autodismiss: null,
          content: 'clipboard-alert',
          data: {
            msg: 'Address copied to clipboard',
            width: 280,
          },
        },
      },
    });

    const elevatedView = getByTestId('global-alert-elevated-view');
    const icon = getByTestId('global-alert-icon');
    const message = getByText('Address copied to clipboard');

    expect(elevatedView.props.style).toEqual(
      expect.objectContaining({
        backgroundColor: getElevatedSurfaceColor(darkThemeValue),
      }),
    );
    expect(icon.props.color).toBe(darkThemeValue.colors.icon.default);
    expect(message.props.style).toEqual(
      expect.objectContaining({
        color: darkThemeValue.colors.text.default,
      }),
    );
  });
});
