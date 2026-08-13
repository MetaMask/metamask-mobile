import { renderHook } from '@testing-library/react-native';
import { useKycDisclaimers } from './useKycDisclaimers';

jest.mock('../../../../../../core/Engine', () => ({
  context: {
    AuthenticationController: {
      getBearerToken: jest.fn(),
    },
  },
}));

jest.mock('../constants', () => ({
  ...jest.requireActual('../constants'),
  KYC_API_BASE_URL: '',
}));

describe('useKycDisclaimers when the KYC API base URL is not configured', () => {
  it('skips the fetch and returns an empty list immediately', () => {
    const globalFetchSpy = jest.spyOn(global, 'fetch');

    const { result } = renderHook(() => useKycDisclaimers('BRA'));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.disclaimers).toStrictEqual([]);
    expect(result.current.error).toBeNull();
    expect(globalFetchSpy).not.toHaveBeenCalled();
  });
});
