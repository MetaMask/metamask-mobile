import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { CardProviderIds } from '../../../../../../core/Engine/controllers/card-controller/provider-types';
import { useCardEnableCard } from './useCardEnableCard';
import { useImmersveEnableCard } from './useImmersveEnableCard';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('./useImmersveEnableCard', () => ({
  useImmersveEnableCard: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseImmersveEnableCard = useImmersveEnableCard as jest.MockedFunction<
  typeof useImmersveEnableCard
>;
const mockEnableCard = jest.fn();

function mockActiveProvider(providerId: string) {
  mockUseSelector.mockImplementation(() => providerId);
}

function mockImmersveState(
  overrides: Partial<ReturnType<typeof useImmersveEnableCard>> = {},
) {
  mockUseImmersveEnableCard.mockReturnValue({
    canEnableCard: false,
    enableCard: mockEnableCard,
    isReconciling: false,
    isKycUnderReview: false,
    hasPendingAction: false,
    provisioningView: 'hidden',
    setupStep: null,
    isEnableCardPending: false,
    markCardFlowOpened: jest.fn(),
    ...overrides,
  });
}

const PROVISIONING_DATA = {
  alerts: [{ type: 'card_provisioning', dismissable: false }],
} as never;

describe('useCardEnableCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockImmersveState();
  });

  it('exposes the Immersve state when Immersve is the active provider', () => {
    const markCardFlowOpened = jest.fn();
    mockActiveProvider(CardProviderIds.Immersve);
    mockImmersveState({
      canEnableCard: true,
      provisioningView: 'hidden',
      setupStep: 'kyc',
      isEnableCardPending: true,
      markCardFlowOpened,
    });

    const { result } = renderHook(() =>
      useCardEnableCard(PROVISIONING_DATA, { pollIntervalMs: 15_000 }),
    );

    expect(mockUseImmersveEnableCard).toHaveBeenCalledWith(PROVISIONING_DATA, {
      pollIntervalMs: 15_000,
    });
    expect(result.current.canEnableCard).toBe(true);
    expect(result.current.enableCard).toBe(mockEnableCard);
    expect(result.current.provisioningView).toBe('hidden');
    expect(result.current.setupStep).toBe('kyc');
    expect(result.current.isEnableCardPending).toBe(true);
    expect(result.current.markCardFlowOpened).toBe(markCardFlowOpened);
  });

  it('withholds the Immersve handler when Immersve cannot enable the card', () => {
    mockActiveProvider(CardProviderIds.Immersve);
    mockImmersveState({ canEnableCard: false });

    const { result } = renderHook(() => useCardEnableCard(PROVISIONING_DATA));

    expect(result.current.enableCard).toBeNull();
  });

  it('keeps the default provisioning banner for a non-Immersve provider', () => {
    mockActiveProvider(CardProviderIds.Baanx);
    // Immersve reports `hidden` for every other provider — it must not leak.
    mockImmersveState({ canEnableCard: true, provisioningView: 'hidden' });

    const { result } = renderHook(() => useCardEnableCard(PROVISIONING_DATA));

    expect(result.current.provisioningView).toBe('provisioning');
    expect(result.current.canEnableCard).toBe(false);
    expect(result.current.enableCard).toBeNull();
    expect(result.current.setupStep).toBeNull();
    expect(result.current.isEnableCardPending).toBe(false);
    expect(() => result.current.markCardFlowOpened()).not.toThrow();
  });

  it('does not report a pending Enable card for a non-Immersve provider', () => {
    mockActiveProvider(CardProviderIds.Baanx);
    mockImmersveState({ isEnableCardPending: true, canEnableCard: true });

    const { result } = renderHook(() => useCardEnableCard(PROVISIONING_DATA));

    expect(result.current.isEnableCardPending).toBe(false);
    expect(result.current.setupStep).toBeNull();
  });
});
