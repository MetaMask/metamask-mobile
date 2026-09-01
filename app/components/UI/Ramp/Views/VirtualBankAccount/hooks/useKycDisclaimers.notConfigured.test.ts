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
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  it('skips the fetch and reports an error so the caller can surface it', () => {
    const globalFetchSpy = jest.spyOn(global, 'fetch');

    const { result } = renderHook(() => useKycDisclaimers('BRA'));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.disclaimers).toStrictEqual([]);
    expect(result.current.error).toBe(
      'KYC service is not configured for this build',
    );
    expect(globalFetchSpy).not.toHaveBeenCalled();
  });
});
