import { Hex } from '@metamask/utils';
import type { DeleGatorEnvironment } from '..';
import { exactExecutionBatchBuilder } from './exactExecutionBatchBuilder';

const mockEnvironment: DeleGatorEnvironment = {
  DelegationManager: '0x1234567890123456789012345678901234567890',
  EntryPoint: '0x2345678901234567890123456789012345678901',
  SimpleFactory: '0x3456789012345678901234567890123456789012',
  EIP7702StatelessDeleGatorImpl: '0x1234567890123456789012345678901234567890',
  implementations: {
    MultiSigDeleGatorImpl: '0x4567890123456789012345678901234567890123',
    HybridDeleGatorImpl: '0x5678901234567890123456789012345678901234',
  },
  caveatEnforcers: {
    LimitedCallsEnforcer: '0x1234567890123456789012345678901234567890',
  },
};

describe('exactExecutionBatchBuilder', () => {
  const testTo = '0x1234567890123456789012345678901234567890';
  const testValue = `0x${BigInt(10 * 10 ** 9).toString(16)}` as Hex;
  const testData = '0x1234567890123456789012345678901234567890';

  it('creates valid exact batch execution', () => {
    const caveat = exactExecutionBatchBuilder(mockEnvironment, [
      { to: testTo, value: testValue, data: testData },
    ]);

    expect(caveat.enforcer).toBe(
      mockEnvironment.caveatEnforcers.ExactExecutionBatchEnforcer,
    );

    expect(caveat.args).toBe('0x');
    expect(caveat.terms).toBeDefined();
  });

  it('throws if to is not an address', () => {
    const testToOverride =
      '0x12345678901234567890123456789012345678901234123412341234'; // longer than 42 chars

    expect(() => {
      exactExecutionBatchBuilder(mockEnvironment, [
        { to: testTo, value: testValue, data: testData },
        { to: testToOverride, value: testValue, data: testData },
      ]);
    }).toThrow('Index 1 - Invalid to: must be a valid address');
  });

  it('throw if value is not positive', () => {
    const testValueOverride = '-0x012123' as Hex; // negative value

    expect(() => {
      exactExecutionBatchBuilder(mockEnvironment, [
        { to: testTo, value: testValue, data: testData },
        { to: testTo, value: testValueOverride, data: testData },
      ]);
    }).toThrow('Index 1 - Invalid value: must be a positive integer or zero');
  });
});
