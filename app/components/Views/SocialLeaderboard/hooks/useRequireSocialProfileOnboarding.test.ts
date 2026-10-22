import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import Routes from '../../../../constants/navigation/Routes';
import { selectProfileControllerLinkedEvmAddress } from '../../../../selectors/profileController';
import { useRequireSocialProfileOnboarding } from './useRequireSocialProfileOnboarding';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

const LINKED_ADDRESS = '0x1111111111111111111111111111111111111111';

const mockLinkedAddress = (linkedAddress: string | null) => {
  jest
    .mocked(useSelector)
    .mockImplementation((selector: unknown) =>
      selector === selectProfileControllerLinkedEvmAddress
        ? linkedAddress
        : undefined,
    );
};

describe('useRequireSocialProfileOnboarding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLinkedAddress(LINKED_ADDRESS);
  });

  it('returns false and navigates to onboarding when no linked wallet exists', () => {
    mockLinkedAddress(null);
    const { result } = renderHook(() => useRequireSocialProfileOnboarding());

    const canContinue = result.current.ensureSocialProfileOnboarding();

    expect(canContinue).toBe(false);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.SOCIAL.PROFILE_ONBOARDING);
  });

  it('returns false and navigates to onboarding when the linked wallet is blank', () => {
    mockLinkedAddress('  ');
    const { result } = renderHook(() => useRequireSocialProfileOnboarding());

    const canContinue = result.current.ensureSocialProfileOnboarding();

    expect(canContinue).toBe(false);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.SOCIAL.PROFILE_ONBOARDING);
  });

  it('returns true without navigation when a linked wallet exists', () => {
    const { result } = renderHook(() => useRequireSocialProfileOnboarding());

    const canContinue = result.current.ensureSocialProfileOnboarding();

    expect(canContinue).toBe(true);
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
