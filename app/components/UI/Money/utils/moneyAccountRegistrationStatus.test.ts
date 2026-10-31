import type { IntentEntry, UpgradeEntry } from '@metamask/chomp-api-service';
import {
  getAssociationStatus,
  getIntentsStatus,
  getLocalUpgradeStatus,
  getRegistrationSummary,
  getUpgradeStatus,
  MoneyAccountRegistrationSummary,
  RegistrationSignalStatus,
} from './moneyAccountRegistrationStatus';

const ERROR_RESULT = { status: 'error', error: new Error('failed') } as const;

const createUpgrade = (status: UpgradeEntry['status']) =>
  ({ chainId: '0x8f', status }) as unknown as UpgradeEntry;

const createIntent = (status: IntentEntry['status']) =>
  ({ chainId: '0x8f', status }) as unknown as IntentEntry;

describe('moneyAccountRegistrationStatus', () => {
  describe('getAssociationStatus', () => {
    it.each([
      [true, RegistrationSignalStatus.Complete],
      [false, RegistrationSignalStatus.Missing],
    ])('returns %s association as %s', (isAssociated, expected) => {
      const result = getAssociationStatus({
        status: 'success',
        data: isAssociated,
      });

      expect(result).toBe(expected);
    });

    it('returns unknown when the request failed', () => {
      expect(getAssociationStatus(ERROR_RESULT)).toBe(
        RegistrationSignalStatus.Unknown,
      );
    });
  });

  describe('getUpgradeStatus', () => {
    it('returns missing when there are no upgrades', () => {
      expect(getUpgradeStatus({ status: 'success', data: [] })).toBe(
        RegistrationSignalStatus.Missing,
      );
    });

    it('returns pending when any upgrade is pending', () => {
      const result = getUpgradeStatus({
        status: 'success',
        data: [createUpgrade('upgraded'), createUpgrade('pending')],
      });

      expect(result).toBe(RegistrationSignalStatus.Pending);
    });

    it('returns complete when every upgrade is upgraded', () => {
      const result = getUpgradeStatus({
        status: 'success',
        data: [createUpgrade('upgraded')],
      });

      expect(result).toBe(RegistrationSignalStatus.Complete);
    });

    it('returns unknown when the request failed', () => {
      expect(getUpgradeStatus(ERROR_RESULT)).toBe(
        RegistrationSignalStatus.Unknown,
      );
    });
  });

  describe('getIntentsStatus', () => {
    it('returns complete when an intent is active', () => {
      const result = getIntentsStatus({
        status: 'success',
        data: [createIntent('revoked'), createIntent('active')],
      });

      expect(result).toBe(RegistrationSignalStatus.Complete);
    });

    it('returns missing when every intent is revoked', () => {
      const result = getIntentsStatus({
        status: 'success',
        data: [createIntent('revoked')],
      });

      expect(result).toBe(RegistrationSignalStatus.Missing);
    });

    it('returns unknown when the request failed', () => {
      expect(getIntentsStatus(ERROR_RESULT)).toBe(
        RegistrationSignalStatus.Unknown,
      );
    });
  });

  describe('getLocalUpgradeStatus', () => {
    it('returns complete when a record exists', () => {
      expect(
        getLocalUpgradeStatus({ configFingerprint: 'abc', completedAt: 1 }),
      ).toBe(RegistrationSignalStatus.Complete);
    });

    it('returns missing when there is no record', () => {
      expect(getLocalUpgradeStatus(undefined)).toBe(
        RegistrationSignalStatus.Missing,
      );
    });
  });

  describe('getRegistrationSummary', () => {
    const { Complete, Pending, Missing, Unknown } = RegistrationSignalStatus;

    it.each([
      [[Complete, Complete], MoneyAccountRegistrationSummary.Registered],
      [[Complete, Pending], MoneyAccountRegistrationSummary.Pending],
      [[Pending, Missing], MoneyAccountRegistrationSummary.Incomplete],
      [[Unknown, Missing], MoneyAccountRegistrationSummary.Incomplete],
      [[Unknown, Pending], MoneyAccountRegistrationSummary.Pending],
      [[Complete, Unknown], MoneyAccountRegistrationSummary.Unknown],
    ])('summarises %j as %s', (statuses, expected) => {
      expect(getRegistrationSummary(statuses)).toBe(expected);
    });
  });
});
