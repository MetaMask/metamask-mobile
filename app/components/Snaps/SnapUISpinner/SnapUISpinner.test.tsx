import React from 'react';
import { ActivityIndicator } from 'react-native';
import { render } from '@testing-library/react-native';
import { SnapUISpinner } from './SnapUISpinner';
import { lightTheme } from '@metamask/design-tokens';

const mockUseTheme = jest.fn();
jest.mock('../../../util/theme', () => ({
  useTheme: () => mockUseTheme(),
}));

const mockColor = lightTheme.colors.primary.default;

describe('SnapUISpinner', () => {
  beforeEach(() => {
    mockUseTheme.mockReturnValue({
      colors: {
        primary: {
          default: mockColor,
        },
      },
    });
  });

  it('renders ActivityIndicator with correct props', () => {
    const { UNSAFE_getByType } = render(<SnapUISpinner />);
    const activityIndicator = UNSAFE_getByType(ActivityIndicator);

    expect(activityIndicator).toBeTruthy();
    expect(activityIndicator.props.size).toBe('large');
    expect(activityIndicator.props.color).toBe(mockColor);
    expect(activityIndicator.props.style).toEqual({
      alignItems: 'flex-start',
    });
  });

  it('uses theme color from context', () => {
    mockUseTheme.mockReturnValue({
      colors: {
        primary: {
          default: mockColor,
        },
      },
    });

    const { UNSAFE_getByType } = render(<SnapUISpinner />);
    const activityIndicator = UNSAFE_getByType(ActivityIndicator);

    expect(activityIndicator.props.color).toBe(mockColor);
  });
});
