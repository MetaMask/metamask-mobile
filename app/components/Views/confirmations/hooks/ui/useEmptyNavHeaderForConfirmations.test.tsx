import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { Theme } from '../../../../../util/theme/models';
import { getEmptyNavHeader } from '../../components/UI/navbar/navbar';
import { useEmptyNavHeaderForConfirmations } from './useEmptyNavHeaderForConfirmations';

jest.mock('../../../../../util/theme', () => ({
  useTheme: jest.fn().mockReturnValue({
    colors: { background: { alternative: '#ffffff' } },
    typography: {},
    shadows: {},
    brandColors: {},
    themeAppearance: 'light' as const,
  } as Theme),
}));
jest.mock('../../components/UI/navbar/navbar');

describe('useEmptyNavHeaderForConfirmations', () => {
  const mockGetEmptyNavHeader = jest.mocked(getEmptyNavHeader);

  const mockNavbarOptions = {
    headerTitle: () => <></>,
    headerLeft: () => <></>,
    headerStyle: {
      backgroundColor: '#ffffff',
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
