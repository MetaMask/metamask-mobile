import {
  SeedlessOnboardingControllerState,
  AuthConnection as SeedlessAuthConnection,
} from '@metamask/seedless-onboarding-controller';
import { RootState } from '../reducers';
import {
  selectSeedlessOnboardingUserId,
  selectSeedlessOnboardingUserEmail,
  selectSeedlessOnboardingAuthConnection,
  selectSeedlessOnboardingLoginFlow,
} from './seedlessOnboardingController';

const createMockState = (
  seedlessOnboardingState?: Partial<SeedlessOnboardingControllerState>,
): RootState =>
  ({
    engine: {
      backgroundState: {
        SeedlessOnboardingController: {
          socialBackupsMetadata: [],
          ...seedlessOnboardingState,
        },
      },
    },
  }) as RootState;

describe('Seedless Onboarding Controller Selectors', () => {
  describe('selectSeedlessOnboardingUserId', () => {
    it('returns userId when it exists', () => {
      const mockUserId = 'test-user-123';
      const mockState = createMockState({
        userId: mockUserId,
      });

      const result = selectSeedlessOnboardingUserId(mockState);

      expect(result).toBe(mockUserId);
    });

    it('returns empty string when userId is undefined', () => {
      const mockState = createMockState();

      const result = selectSeedlessOnboardingUserId(mockState);

      expect(result).toBe(undefined);
    });
  });

  describe('selectSeedlessOnboardingUserEmail', () => {
    it('returns socialLoginEmail when it exists', () => {
      const mockEmail = 'test@example.com';
      const mockState = createMockState({
        socialLoginEmail: mockEmail,
      });

      const result = selectSeedlessOnboardingUserEmail(mockState);

      expect(result).toBe(mockEmail);
    });

    it('returns empty string when socialLoginEmail is undefined', () => {
      const mockState = createMockState();

      const result = selectSeedlessOnboardingUserEmail(mockState);

      expect(result).toBe(undefined);
    });
  });

  describe('selectSeedlessOnboardingAuthConnection', () => {
    it('returns authConnection when it exists', () => {
      const mockAuthConnection = SeedlessAuthConnection.Google;
      const mockState = createMockState({
        authConnection: mockAuthConnection,
      });

      const result = selectSeedlessOnboardingAuthConnection(mockState);

      expect(result).toBe(mockAuthConnection);
    });

    it('returns empty string when authConnection is undefined', () => {
      const mockState = createMockState();

      const result = selectSeedlessOnboardingAuthConnection(mockState);

      expect(result).toBe(undefined);
    });
  });

  describe('selectSeedlessOnboardingLoginFlow', () => {
    it('returns true when vault exists and is truthy', () => {
      const mockVault = 'encrypted-vault-data';
      const mockState = createMockState({
        vault: mockVault,
      });

      const result = selectSeedlessOnboardingLoginFlow(mockState);

      expect(result).toBe(true);
    });

    it('returns false when vault is undefined', () => {
      const mockState = createMockState();

      const result = selectSeedlessOnboardingLoginFlow(mockState);

      expect(result).toBe(false);
    });
  });
});
