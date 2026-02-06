import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { getEmptyNavHeader } from '../../components/UI/navbar/navbar';
import { useEmptyNavHeaderForConfirmations } from './useEmptyNavHeaderForConfirmations';

jest.mock('../../components/UI/navbar/navbar');

describe('useEmptyNavHeaderForConfirmations', () => {
  const mockGetEmptyNavHeader = jest.mocked(getEmptyNavHeader);

  const mockNavbarOptions = {
    header: () => <></>,
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
    expect(mockGetEmptyNavHeader).toHaveBeenCalledWith();
  });
});
