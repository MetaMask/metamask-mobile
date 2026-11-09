import { renderHook, act } from '@testing-library/react-native';
import { useImmersveResumeOnboarding } from './useImmersveResumeOnboarding';
import type { CardSpendingPrerequisite } from '../../../../core/Engine/controllers/card-controller/provider-types';
import Logger from '../../../../util/Logger';

const mockSetSelectedCountry = jest.fn();
const mockCreateFundingSource = jest.fn();
const mockGetFundingSources = jest.fn();
const mockGetResumeCardInfo = jest.fn();
const mockGetSpendingPrerequisites = jest.fn();
const mockPatchContactDetails = jest.fn();
const mockRecordProviderOnboardingStarted = jest.fn();
const mockRecordCardActivated = jest.fn();
const mockResolveMoneyAccountFundingSourceId = jest.fn();
jest.mock('../../../../core/Engine', () => ({
  context: {
    CardController: {
      setSelectedCountry: (...args: unknown[]) =>
        mockSetSelectedCountry(...args),
      createFundingSource: (...args: unknown[]) =>
        mockCreateFundingSource(...args),
      resolveMoneyAccountFundingSourceId: (...args: unknown[]) =>
        mockResolveMoneyAccountFundingSourceId(...args),
      getFundingSources: (...args: unknown[]) => mockGetFundingSources(...args),
      getResumeCardInfo: (...args: unknown[]) => mockGetResumeCardInfo(...args),
      getSpendingPrerequisites: (...args: unknown[]) =>
        mockGetSpendingPrerequisites(...args),
      patchContactDetails: (...args: unknown[]) =>
        mockPatchContactDetails(...args),
      recordProviderOnboardingStarted: (...args: unknown[]) =>
        mockRecordProviderOnboardingStarted(...args),
      recordCardActivated: (...args: unknown[]) =>
        mockRecordCardActivated(...args),
    },
  },
}));

const mockSignIn = jest.fn();
jest.mock('./useImmersveSiweAuth', () => ({
  ...jest.requireActual('./useImmersveSiweAuth'),
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

const mockHandoffMfa = jest.fn();
jest.mock('./useImmersveMfaHandoff', () => ({
  useImmersveMfaHandoff: () => mockHandoffMfa,
}));

const mockDispatch = jest.fn();
let mockImmersveConfig: unknown = { fundingChannelId: 'base-channel' };
let mockCountryFunding: Record<string, unknown> = {};
let mockPrimaryMoneyAccount: { address: string } | null = null;
jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector: unknown) => {
    const {
      selectCardImmersveConfig: configSelector,
      selectCardImmersveCountryFunding: countryFundingSelector,
    } = jest.requireActual('../../../../selectors/featureFlagController/card');
    const { selectPrimaryMoneyAccount: moneyAccountSelector } =
      jest.requireActual('../../../../selectors/moneyAccountController');
    if (selector === configSelector) {
      return mockImmersveConfig;
    }
    if (selector === countryFundingSelector) {
      return mockCountryFunding;
    }
    if (selector === moneyAccountSelector) {
      return mockPrimaryMoneyAccount;
    }
    return undefined;
  },
}));
jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
}));

jest.mock('../../../../core/redux/slices/card', () => ({
  setImmersveFundingSourceId: (id: string) => ({
    type: 'card/setImmersveFundingSourceId',
    payload: id,
  }),
}));

jest.mock('../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: jest.fn(),
    createEventBuilder: jest.fn(() => ({
      addProperties: jest.fn().mockReturnValue({ build: jest.fn() }),
    })),
  }),
}));

const PARAMS = {
  country: 'GB',
  address: '0xabc',
  email: 'user@example.com',
  phone: '+447911123456',
};

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
    mockHandoffMfa.mockReset();
    mockRecordProviderOnboardingStarted.mockResolvedValue(undefined);
    mockRecordCardActivated.mockResolvedValue(undefined);
    mockImmersveConfig = { fundingChannelId: 'base-channel' };
    mockCountryFunding = {};
    mockPrimaryMoneyAccount = null;
    mockSignIn.mockResolvedValue({ done: true });
    mockGetResumeCardInfo.mockResolvedValue(null);
    mockGetFundingSources.mockResolvedValue([]);
    mockCreateFundingSource.mockResolvedValue({ id: 'fs-new' });
    mockGetSpendingPrerequisites.mockResolvedValue({ prerequisites: [] });
  });

  describe('card link write', () => {
    it('records onboarding started for the SIWE account after sign-in succeeds', async () => {
      const { result } = renderHook(() => useImmersveResumeOnboarding());

      await act(async () => {
        await result.current(PARAMS);
      });

      expect(mockRecordProviderOnboardingStarted).toHaveBeenCalledTimes(1);
      expect(mockRecordProviderOnboardingStarted).toHaveBeenCalledWith({
        provider: 'immersve',
        address: '0xabc',
      });
    });

    it('records onboarding started when the user is already authenticated and has no card', async () => {
      const { result } = renderHook(() => useImmersveResumeOnboarding());

      await act(async () => {
        await result.current({ ...PARAMS, alreadyAuthenticated: true });
      });

      expect(mockRecordProviderOnboardingStarted).toHaveBeenCalledWith({
        provider: 'immersve',
        address: '0xabc',
      });
    });

    it('records active, not onboarding, when a fresh SIWE finds an existing card', async () => {
      mockGetResumeCardInfo.mockResolvedValue({ fundingSourceIds: ['fs-1'] });
      const { result } = renderHook(() => useImmersveResumeOnboarding());

      await act(async () => {
        await result.current(PARAMS);
      });

      expect(mockRecordCardActivated).toHaveBeenCalledWith({
        provider: 'immersve',
        address: '0xabc',
      });
      expect(mockRecordProviderOnboardingStarted).not.toHaveBeenCalled();
    });

    it('records the card as active for a returning user with an existing card', async () => {
      mockGetResumeCardInfo.mockResolvedValue({ fundingSourceIds: ['fs-1'] });
      const { result } = renderHook(() => useImmersveResumeOnboarding());

      await act(async () => {
        await result.current({ ...PARAMS, alreadyAuthenticated: true });
      });

      expect(mockRecordCardActivated).toHaveBeenCalledWith({
        provider: 'immersve',
        address: '0xabc',
      });
    });

    it('does not record activation for a user without a card', async () => {
      const { result } = renderHook(() => useImmersveResumeOnboarding());

      await act(async () => {
        await result.current(PARAMS);
      });

      expect(mockRecordCardActivated).not.toHaveBeenCalled();
    });

    it('does not record onboarding started when sign-in fails', async () => {
      mockSignIn.mockRejectedValue(new Error('siwe failed'));
      const { result } = renderHook(() => useImmersveResumeOnboarding());

      await act(async () => {
        await expect(result.current(PARAMS)).rejects.toThrow('siwe failed');
      });

      expect(mockRecordProviderOnboardingStarted).not.toHaveBeenCalled();
    });
  });

  it('sets the provider country, signs in, patches contact, then routes for a new user', async () => {
    mockGetSpendingPrerequisites
      .mockResolvedValueOnce({
        prerequisites: contactPrereqs,
      })
      .mockResolvedValueOnce({
        prerequisites: [
          {
            stage: 'kyc',
            status: 'action-required',
            actionType: 'follow_kyc_url',
            params: { kycUrl: 'https://kyc' },
          },
        ],
      });
    mockPatchContactDetails.mockResolvedValue(undefined);
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
    expect(mockPatchContactDetails).toHaveBeenCalledWith({
      email: 'user@example.com',
      phone: '+447911123456',
    });
    expect(mockGetSpendingPrerequisites).toHaveBeenCalledTimes(2);
    expect(mockRoute).toHaveBeenCalledWith(
      { type: 'kyc', url: 'https://kyc', ctaHint: undefined },
      {
        email: 'user@example.com',
        countryKey: 'GB',
        hasExistingCard: false,
        fundingAddress: '0xabc',
      },
    );
  });

  it('does not patch contact when prerequisites are already satisfied', async () => {
    mockGetFundingSources.mockResolvedValue([
      { id: 'fs-existing', fundingChannelId: 'base-channel' },
    ]);
    mockGetSpendingPrerequisites.mockResolvedValue({ prerequisites: [] });

    const { result } = renderHook(() => useImmersveResumeOnboarding());
    await act(async () => {
      await result.current(PARAMS);
    });

    expect(mockPatchContactDetails).not.toHaveBeenCalled();
    expect(mockRoute).toHaveBeenCalledWith(
      { type: 'active' },
      {
        email: 'user@example.com',
        countryKey: 'GB',
        hasExistingCard: false,
        fundingAddress: '0xabc',
      },
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

  it('resolves a Money account source by address instead of the stored wallet source', async () => {
    mockCountryFunding = {
      GB: { source: 'moneyAccount', fundingChannelId: 'money-channel' },
    };
    mockPrimaryMoneyAccount = {
      address: '0x000000000000000000000000000000000000dead',
    };
    mockResolveMoneyAccountFundingSourceId.mockResolvedValue('fs-money');
    mockGetResumeCardInfo.mockResolvedValue({ fundingSourceIds: ['fs-base'] });

    const { result } = renderHook(() => useImmersveResumeOnboarding());
    await act(async () => {
      await result.current(PARAMS);
    });

    expect(mockResolveMoneyAccountFundingSourceId).toHaveBeenCalledWith(
      '0x000000000000000000000000000000000000dEaD',
    );
    expect(mockGetFundingSources).not.toHaveBeenCalled();
    expect(mockCreateFundingSource).not.toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'card/setImmersveFundingSourceId',
      payload: 'fs-money',
    });
  });

  it('does not create a wallet source when the Money account address is missing', async () => {
    mockCountryFunding = {
      GB: { source: 'moneyAccount', fundingChannelId: 'money-channel' },
    };

    const { result } = renderHook(() => useImmersveResumeOnboarding());
    await act(async () => {
      await result.current(PARAMS);
    });

    expect(Logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        message:
          'useImmersveResumeOnboarding: Money account address is missing',
      }),
      expect.any(Object),
    );
    expect(mockResolveMoneyAccountFundingSourceId).not.toHaveBeenCalled();
    expect(mockGetFundingSources).not.toHaveBeenCalled();
    expect(mockCreateFundingSource).not.toHaveBeenCalled();
    expect(mockRoute).not.toHaveBeenCalled();
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
      {
        email: 'user@example.com',
        countryKey: 'GB',
        hasExistingCard: false,
        fundingAddress: '0xabc',
      },
    );
  });

  it('routes to `funding` with hasExistingCard false when there is no card', async () => {
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
      {
        email: 'user@example.com',
        countryKey: 'GB',
        hasExistingCard: false,
        fundingAddress: '0xabc',
      },
    );
  });

  it('routes to `funding` with hasExistingCard true when the user already has a card', async () => {
    mockGetResumeCardInfo.mockResolvedValue({
      cardProgramId: 'program-1',
      fundingSourceIds: ['fs-existing'],
    });
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
      {
        email: 'user@example.com',
        countryKey: 'GB',
        hasExistingCard: true,
        fundingAddress: '0xabc',
      },
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
      {
        email: 'user@example.com',
        countryKey: 'GB',
        hasExistingCard: false,
        fundingAddress: '0xabc',
      },
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

  it('uses the existing funding source when present', async () => {
    mockGetResumeCardInfo.mockResolvedValue({
      cardProgramId: 'program-arbitrum',
      fundingSourceIds: ['fs-arbitrum'],
    });

    const { result } = renderHook(() => useImmersveResumeOnboarding());
    await act(async () => {
      await result.current(PARAMS);
    });

    expect(mockGetFundingSources).not.toHaveBeenCalled();
    expect(mockCreateFundingSource).not.toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'card/setImmersveFundingSourceId',
      payload: 'fs-arbitrum',
    });
    expect(mockGetSpendingPrerequisites).toHaveBeenCalledWith(
      'fs-arbitrum',
      expect.any(Object),
    );
  });

  it('hands off to MFA and does not resume when sign-in returns a method step', async () => {
    mockHandoffMfa.mockReturnValue(true);
    mockSignIn.mockResolvedValue({
      done: false,
      nextStep: {
        type: 'mfa_select',
        options: [{ method: 'email', maskedDestination: 'j***@example.com' }],
      },
    });

    const { result } = renderHook(() => useImmersveResumeOnboarding());
    await act(async () => {
      await result.current(PARAMS);
    });

    expect(mockHandoffMfa).toHaveBeenCalledWith(
      expect.objectContaining({
        nextStep: expect.objectContaining({ type: 'mfa_select' }),
      }),
      {
        country: 'GB',
        address: '0xabc',
        continuation: {
          entrypoint: 'SIGN_UP',
          email: 'user@example.com',
          phone: '+447911123456',
          showAccountExistsToast: undefined,
          navigateFromRoot: undefined,
        },
      },
    );
    expect(mockGetResumeCardInfo).not.toHaveBeenCalled();
    expect(mockRoute).not.toHaveBeenCalled();
  });

  it('hands off to MFA when sign-in returns a code step', async () => {
    mockHandoffMfa.mockReturnValue(true);
    mockSignIn.mockResolvedValue({
      done: false,
      nextStep: {
        type: 'mfa_code',
        method: 'email',
        maskedDestination: 'j***@example.com',
        expiresAt: null,
      },
    });

    const { result } = renderHook(() => useImmersveResumeOnboarding());
    await act(async () => {
      await result.current(PARAMS);
    });

    expect(mockHandoffMfa).toHaveBeenCalledWith(
      expect.objectContaining({
        nextStep: expect.objectContaining({ type: 'mfa_code' }),
      }),
      expect.objectContaining({ country: 'GB', address: '0xabc' }),
    );
    expect(mockGetResumeCardInfo).not.toHaveBeenCalled();
  });

  it('does not resume when the MFA handoff rejects an unfinished login', async () => {
    mockHandoffMfa.mockImplementation(() => {
      throw new Error('Unexpected login step');
    });
    mockSignIn.mockResolvedValue({ done: false });

    const { result } = renderHook(() => useImmersveResumeOnboarding());

    await expect(
      act(async () => {
        await result.current(PARAMS);
      }),
    ).rejects.toThrow('Unexpected login step');
    expect(mockGetResumeCardInfo).not.toHaveBeenCalled();
  });

  it('falls back to the configured funding channel when there is no existing card', async () => {
    mockGetResumeCardInfo.mockResolvedValue(null);
    mockGetFundingSources.mockResolvedValue([
      { id: 'fs-base', fundingChannelId: 'base-channel' },
    ]);

    const { result } = renderHook(() => useImmersveResumeOnboarding());
    await act(async () => {
      await result.current(PARAMS);
    });

    expect(mockGetFundingSources).toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'card/setImmersveFundingSourceId',
      payload: 'fs-base',
    });
  });
});
