import { renderHook, act } from '@testing-library/react-native';
import { useImmersveResumeOnboarding } from './useImmersveResumeOnboarding';
import type { CardSpendingPrerequisite } from '../../../../core/Engine/controllers/card-controller/provider-types';

const mockSetSelectedCountry = jest.fn();
const mockCreateFundingSource = jest.fn();
const mockGetFundingSources = jest.fn();
const mockGetSpendingPrerequisites = jest.fn();
jest.mock('../../../../core/Engine', () => ({
  context: {
    CardController: {
      setSelectedCountry: (...args: unknown[]) =>
        mockSetSelectedCountry(...args),
      createFundingSource: (...args: unknown[]) =>
        mockCreateFundingSource(...args),
      getFundingSources: (...args: unknown[]) => mockGetFundingSources(...args),
      getSpendingPrerequisites: (...args: unknown[]) =>
        mockGetSpendingPrerequisites(...args),
    },
  },
}));

const mockSignIn = jest.fn();
jest.mock('./useImmersveSiweAuth', () => ({
  useImmersveSiweAuth: () => ({
    signIn: mockSignIn,
    isAuthenticating: false,
    error: null,
  }),
}));

const mockRoute = jest.fn();
jest.mock('./useImmersveOnboardingRouter', () => ({
  useImmersveOnboardingRouter: () => mockRoute,
}));

const mockDispatch = jest.fn();
let mockCardFeatureFlag: unknown = {
  immersve: { fundingChannelId: 'base-channel' },
};
jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: () => mockCardFeatureFlag,
}));

jest.mock('../../../../core/redux/slices/card', () => ({
  setImmersveFundingSourceId: (id: string) => ({
    type: 'card/setImmersveFundingSourceId',
    payload: id,
  }),
}));

const PARAMS = { country: 'GB', address: '0xabc', email: 'user@example.com' };

const contactPrereqs: CardSpendingPrerequisite[] = [
  {
    stage: 'kyc',
    status: 'action-required',
    actionType: 'submit_contact_email',
  },
];

describe('useImmersveResumeOnboarding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCardFeatureFlag = { immersve: { fundingChannelId: 'base-channel' } };
    mockSignIn.mockResolvedValue({ done: true });
    mockGetFundingSources.mockResolvedValue([]);
    mockCreateFundingSource.mockResolvedValue({ id: 'fs-new' });
    mockGetSpendingPrerequisites.mockResolvedValue({ prerequisites: [] });
  });

  it('sets the provider country, signs in, then resolves + routes for a new user (empty funding list)', async () => {
    mockGetSpendingPrerequisites.mockResolvedValue({
      prerequisites: contactPrereqs,
    });
    const { result } = renderHook(() => useImmersveResumeOnboarding());

    await act(async () => {
      await result.current(PARAMS);
    });

    expect(mockSetSelectedCountry).toHaveBeenCalledWith('GB');
    expect(mockSignIn).toHaveBeenCalledWith({
      country: 'GB',
      address: '0xabc',
    });
    expect(mockGetFundingSources).toHaveBeenCalled();
    expect(mockCreateFundingSource).toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'card/setImmersveFundingSourceId',
      payload: 'fs-new',
    });
    expect(mockGetSpendingPrerequisites).toHaveBeenCalledWith('fs-new', {
      kycRegion: 'GB',
      kycRedirectUrl: 'https://metamask.io/card/kyc-complete',
    });
    expect(mockRoute).toHaveBeenCalledWith(
      { type: 'contact', needsEmail: true, needsPhone: false },
      { email: 'user@example.com', countryKey: 'GB' },
    );
  });

  it('reuses the existing funding source and does not create one for a returning user', async () => {
    mockGetFundingSources.mockResolvedValue([
      { id: 'fs-existing', fundingChannelId: 'base-channel' },
    ]);

    const { result } = renderHook(() => useImmersveResumeOnboarding());
    await act(async () => {
      await result.current(PARAMS);
    });

    expect(mockCreateFundingSource).not.toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'card/setImmersveFundingSourceId',
      payload: 'fs-existing',
    });
    expect(mockGetSpendingPrerequisites).toHaveBeenCalledWith(
      'fs-existing',
      expect.any(Object),
    );
  });

  it('selects the funding source matching the configured fundingChannelId, not items[0]', async () => {
    // arbitrum source first (wrong channel), base source second (configured channel).
    mockGetFundingSources.mockResolvedValue([
      { id: 'fs-arbitrum', fundingChannelId: 'arbitrum-channel' },
      { id: 'fs-base', fundingChannelId: 'base-channel' },
    ]);

    const { result } = renderHook(() => useImmersveResumeOnboarding());
    await act(async () => {
      await result.current(PARAMS);
    });

    expect(mockCreateFundingSource).not.toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'card/setImmersveFundingSourceId',
      payload: 'fs-base',
    });
    expect(mockGetSpendingPrerequisites).toHaveBeenCalledWith(
      'fs-base',
      expect.any(Object),
    );
  });

  it('creates a funding source when none matches the configured channel', async () => {
    mockGetFundingSources.mockResolvedValue([
      { id: 'fs-arbitrum', fundingChannelId: 'arbitrum-channel' },
    ]);

    const { result } = renderHook(() => useImmersveResumeOnboarding());
    await act(async () => {
      await result.current(PARAMS);
    });

    expect(mockCreateFundingSource).toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'card/setImmersveFundingSourceId',
      payload: 'fs-new',
    });
  });

  it('forwards navigateFromRoot to the router', async () => {
    const { result } = renderHook(() => useImmersveResumeOnboarding());
    await act(async () => {
      await result.current({ ...PARAMS, navigateFromRoot: true });
    });

    expect(mockRoute).toHaveBeenCalledWith(
      { type: 'active' },
      expect.objectContaining({ navigateFromRoot: true }),
    );
  });

  it('forwards showAccountExistsToast to the router', async () => {
    mockGetFundingSources.mockResolvedValue([
      { id: 'fs-existing', fundingChannelId: 'base-channel' },
    ]);

    const { result } = renderHook(() => useImmersveResumeOnboarding());
    await act(async () => {
      await result.current({ ...PARAMS, showAccountExistsToast: false });
    });

    expect(mockRoute).toHaveBeenCalledWith(
      { type: 'active' },
      expect.objectContaining({ showAccountExistsToast: false }),
    );
  });

  it('routes to `active` when all prerequisites are satisfied', async () => {
    mockGetFundingSources.mockResolvedValue([
      { id: 'fs-existing', fundingChannelId: 'base-channel' },
    ]);
    mockGetSpendingPrerequisites.mockResolvedValue({
      prerequisites: [
        { stage: 'kyc', status: 'ok' },
        { stage: 'funding', status: 'ok' },
      ],
    });

    const { result } = renderHook(() => useImmersveResumeOnboarding());
    await act(async () => {
      await result.current(PARAMS);
    });

    expect(mockRoute).toHaveBeenCalledWith(
      { type: 'active' },
      { email: 'user@example.com', countryKey: 'GB' },
    );
  });

  it('routes to `funding` when a smart_contract_write prerequisite is outstanding', async () => {
    mockGetFundingSources.mockResolvedValue([
      { id: 'fs-existing', fundingChannelId: 'base-channel' },
    ]);
    const write = {
      abi: [],
      contractAddress: '0xusdc',
      method: 'approve',
      params: { _spender: '0xspender', _value: '1' },
    };
    mockGetSpendingPrerequisites.mockResolvedValue({
      prerequisites: [
        {
          stage: 'funding',
          status: 'action-required',
          actionType: 'smart_contract_write',
          params: write,
        },
      ],
    });

    const { result } = renderHook(() => useImmersveResumeOnboarding());
    await act(async () => {
      await result.current(PARAMS);
    });

    expect(mockRoute).toHaveBeenCalledWith(
      { type: 'funding', write },
      { email: 'user@example.com', countryKey: 'GB' },
    );
  });

  it('routes to `rejected` when a prerequisite is blocked', async () => {
    mockGetFundingSources.mockResolvedValue([
      { id: 'fs-existing', fundingChannelId: 'base-channel' },
    ]);
    mockGetSpendingPrerequisites.mockResolvedValue({
      prerequisites: [{ stage: 'kyc', status: 'blocked' }],
    });

    const { result } = renderHook(() => useImmersveResumeOnboarding());
    await act(async () => {
      await result.current(PARAMS);
    });

    expect(mockRoute).toHaveBeenCalledWith(
      { type: 'rejected', retryUrl: undefined },
      { email: 'user@example.com', countryKey: 'GB' },
    );
  });

  it('rethrows and does not route when SIWE fails', async () => {
    mockSignIn.mockRejectedValue(new Error('siwe failed'));

    const { result } = renderHook(() => useImmersveResumeOnboarding());

    await expect(
      act(async () => {
        await result.current(PARAMS);
      }),
    ).rejects.toThrow('siwe failed');

    expect(mockGetFundingSources).not.toHaveBeenCalled();
    expect(mockRoute).not.toHaveBeenCalled();
  });
});
