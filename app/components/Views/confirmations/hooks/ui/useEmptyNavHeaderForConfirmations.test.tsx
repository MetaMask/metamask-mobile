import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { Theme } from '../../../../../util/theme/models';
import { getEmptyNavHeader } from '../../components/UI/navbar/navbar';
import { useEmptyNavHeaderForConfirmations } from './useEmptyNavHeaderForConfirmations';

jest.mock('../../../../../util/theme', () => {
  const { mockTheme } = jest.requireActual('../../../../../util/theme');
  return {
    useTheme: jest.fn().mockReturnValue({
      colors: mockTheme.colors,
      typography: {},
      shadows: {},
      brandColors: mockTheme.brandColors,
      themeAppearance: 'light' as const,
    } as Theme),
  };
});
jest.mock('../../components/UI/navbar/navbar');

describe('useEmptyNavHeaderForConfirmations', () => {
  const mockGetEmptyNavHeader = jest.mocked(getEmptyNavHeader);
  const { mockTheme } = jest.requireActual('../../../../../util/theme');

  const mockNavbarOptions = {
    headerTitle: () => <></>,
    headerLeft: () => <></>,
    headerRight: () => <></>,
    headerTitleAlign: 'center' as const,
    headerStyle: {
      backgroundColor: mockTheme.colors.background.default,
      shadowColor: 'transparent',
      elevation: 0,
    },
    headerShown: true,
    gestureEnabled: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetEmptyNavHeader.mockReturnValue(mockNavbarOptions);
  });

  it('returns navbar options from getEmptyNavHeader', () => {
    const { result } = renderHook(() => useEmptyNavHeaderForConfirmations());
    expect(result.current).toBe(mockNavbarOptions);
  });
});
