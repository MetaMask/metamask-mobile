import { renderHook, waitFor } from '@testing-library/react-native';
import { usePasswordOutdated } from './usePasswordOutdated';
import { Authentication } from '../../../../core';
import { strings } from '../../../../../locales/i18n';
import { useSelector } from 'react-redux';

// Mock dependencies
jest.mock('../../../../core');
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const mockUseSelector = useSelector as jest.Mock;

describe('usePasswordOutdated', () => {
  const mockSetError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (Authentication.resetPassword as jest.Mock).mockResolvedValue(undefined);
  });

  it('sets error and resets password when password is outdated', async () => {
    mockUseSelector.mockReturnValue(true); // Password is outdated

    renderHook(() => usePasswordOutdated(mockSetError));

    await waitFor(() => {
      expect(mockSetError).toHaveBeenCalledWith(
        strings('login.seedless_password_outdated'),
      );
      expect(Authentication.resetPassword).toHaveBeenCalled();
    });
  });

  it('sets refreshAuthPref to true after successful password reset', async () => {
    mockUseSelector.mockReturnValue(true);

    const { result } = renderHook(() => usePasswordOutdated(mockSetError));

    await waitFor(() => {
      expect(result.current.refreshAuthPref).toBe(true);
    });
  });

  it('handles resetPassword error gracefully', async () => {
    mockUseSelector.mockReturnValue(true);
    (Authentication.resetPassword as jest.Mock).mockRejectedValue(
      new Error('Reset failed'),
    );

    const { result } = renderHook(() => usePasswordOutdated(mockSetError));

    await waitFor(() => {
      expect(mockSetError).toHaveBeenCalled();
      expect(result.current.refreshAuthPref).toBe(false);
    });
  });

  it('does nothing when password is not outdated', () => {
    mockUseSelector.mockReturnValue(false); // Password is not outdated

    renderHook(() => usePasswordOutdated(mockSetError));

    expect(mockSetError).not.toHaveBeenCalled();
    expect(Authentication.resetPassword).not.toHaveBeenCalled();
  });
});
