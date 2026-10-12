import { ContractCheckKey } from '../components/V1/SecurityTab/SecurityTab.types';
import { feature } from './__fixtures__/securityData';
import { CONTRACT_CHECK_KEYS, resolveSecurityChecks } from './securityChecks';

describe('resolveSecurityChecks', () => {
  it('resolves every contract check for any payload', () => {
    const checks = resolveSecurityChecks([]);

    expect(Object.keys(checks)).toStrictEqual([...CONTRACT_CHECK_KEYS]);
  });

  describe('no honeypot', () => {
    it('fails when HONEYPOT is present', () => {
      const checks = resolveSecurityChecks([feature('HONEYPOT', 'Warning')]);

      expect(checks[ContractCheckKey.NoHoneypot]).toStrictEqual({
        outcome: 'fail',
        value: 'Sells may fail',
      });
    });

    it('passes when HONEYPOT is absent', () => {
      const checks = resolveSecurityChecks([]);

      expect(checks[ContractCheckKey.NoHoneypot]).toStrictEqual({
        outcome: 'pass',
        value: 'Sells work',
      });
    });
  });

  describe('contract verified', () => {
    it('passes on VERIFIED_CONTRACT', () => {
      const checks = resolveSecurityChecks([
        feature('VERIFIED_CONTRACT', 'Benign'),
      ]);

      expect(checks[ContractCheckKey.ContractVerified]).toStrictEqual({
        outcome: 'pass',
        value: 'Yes',
      });
    });

    it('fails on UNVERIFIED_CONTRACT', () => {
      const checks = resolveSecurityChecks([
        feature('UNVERIFIED_CONTRACT', 'Info'),
      ]);

      expect(checks[ContractCheckKey.ContractVerified]).toStrictEqual({
        outcome: 'fail',
        value: 'No',
      });
    });

    // The only check Blockaid covers from both sides, so it is the only one
    // that can say "we do not know" instead of guessing. Solana sends neither.
    it('is unknown with a null value when neither feature arrives', () => {
      const checks = resolveSecurityChecks([]);

      expect(checks[ContractCheckKey.ContractVerified]).toStrictEqual({
        outcome: 'unknown',
        value: null,
      });
    });

    it('prefers the failure when both features arrive', () => {
      const checks = resolveSecurityChecks([
        feature('VERIFIED_CONTRACT', 'Benign'),
        feature('UNVERIFIED_CONTRACT', 'Info'),
      ]);

      expect(checks[ContractCheckKey.ContractVerified].outcome).toBe('fail');
    });
  });

  describe('renounced', () => {
    it('passes on OWNERSHIP_RENOUNCED', () => {
      const checks = resolveSecurityChecks([
        feature('OWNERSHIP_RENOUNCED', 'Benign'),
      ]);

      expect(checks[ContractCheckKey.Renounced]).toStrictEqual({
        outcome: 'pass',
        value: 'Renounced',
      });
    });

    // The one check that fails closed: silence means not renounced, so the
    // worst case is understating a good token rather than reassuring about a
    // bad one.
    it('fails rather than dashes when the feature is absent', () => {
      const checks = resolveSecurityChecks([]);

      expect(checks[ContractCheckKey.Renounced]).toStrictEqual({
        outcome: 'fail',
        value: 'Not renounced',
      });
    });

    it('passes regardless of the type the API gave the feature', () => {
      const asInfo = resolveSecurityChecks([
        feature('OWNERSHIP_RENOUNCED', 'Info'),
      ]);

      expect(asInfo[ContractCheckKey.Renounced].outcome).toBe('pass');
    });
  });

  describe('no blacklist', () => {
    it('fails when CAN_BLACKLIST is present', () => {
      const checks = resolveSecurityChecks([feature('CAN_BLACKLIST', 'Info')]);

      expect(checks[ContractCheckKey.NoBlacklist]).toStrictEqual({
        outcome: 'fail',
        value: 'Control detected',
      });
    });

    it('passes when CAN_BLACKLIST is absent', () => {
      const checks = resolveSecurityChecks([]);

      expect(checks[ContractCheckKey.NoBlacklist]).toStrictEqual({
        outcome: 'pass',
        value: 'No controls',
      });
    });
  });

  // The API types the same featureId differently per chain, so a rule that
  // consulted `type` would read the same on-chain fact two ways.
  it('ignores the feature type entirely', () => {
    const asWarning = resolveSecurityChecks([
      feature('CAN_BLACKLIST', 'Warning'),
    ]);
    const asInfo = resolveSecurityChecks([feature('CAN_BLACKLIST', 'Info')]);

    expect(asWarning).toStrictEqual(asInfo);
  });
});
