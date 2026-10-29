import { type FeatureFlags } from '@metamask/remote-feature-flag-controller';
import { TransactionMeta } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { getDeleGatorEnvironment, type Caveat } from '../../core/Delegation';
import { timestampBuilder } from '../../core/Delegation/caveatBuilder/timestampBuilder';
import {
  CONFIRMATIONS_DELEGATIONS_FEATURE_FLAG_NAME,
  getDelegationCaveats,
  type GetDelegationCaveatsRequest,
} from './caveats';

const FIXED_NOW_MS = 1_700_000_000_000;
const FIXED_NOW_S = Math.floor(FIXED_NOW_MS / 1000);
const DEFAULT_DEADLINE_SECONDS = 30 * 60;

const ENV = getDeleGatorEnvironment(1);

const { caveatEnforcers } = ENV;

const TRANSACTION_META_MOCK: TransactionMeta = {
  chainId: '0x1' as Hex,
  txParams: {
    data: '0xabcd1234' as Hex,
    from: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    to: '0x1234567890123456789012345678901234567890' as Hex,
  },
} as unknown as TransactionMeta;

const EXECUTION_MOCK = {
  callData: '0xabcd1234' as Hex,
  target: '0x1234567890123456789012345678901234567890' as Hex,
  value: BigInt(0),
};

const REDEEMER_1 = '0xB01caEa8c6C47bbf4F4b4c5080Ca642043359C2E' as Hex;
const REDEEMER_2 = '0xB42F812A44c22cc6b861478900401ee759EbEAD6' as Hex;

const buildExpectedTimestampTerms = (beforeThreshold: number) =>
  timestampBuilder(ENV, 0, beforeThreshold).terms;

describe('getDelegationCaveats', () => {
  let remoteFeatureFlags: FeatureFlags;
  let messengerMock: GetDelegationCaveatsRequest['messenger'];

  beforeEach(() => {
    remoteFeatureFlags = {};
    jest.spyOn(Date, 'now').mockReturnValue(FIXED_NOW_MS);

    messengerMock = {
      call: jest
        .fn()
        .mockImplementation(() => ({ cacheTimestamp: 0, remoteFeatureFlags })),
    } as unknown as GetDelegationCaveatsRequest['messenger'];
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('provided caveats passthrough', () => {
    it('returns provided caveats unchanged when caveats array is given', () => {
      const customCaveats: Caveat[] = [
        {
          args: '0x',
          enforcer: '0xdeadbeef' as Hex,
          terms: '0xcafe' as Hex,
        },
      ];

      const result = getDelegationCaveats({
        caveats: customCaveats,
        environment: ENV,
        executions: [EXECUTION_MOCK],
        messenger: messengerMock,
        transactionMeta: TRANSACTION_META_MOCK,
      });

      expect(result).toBe(customCaveats);
    });

    it('returns provided caveats unchanged even when redeemers are also supplied', () => {
      const customCaveats: Caveat[] = [
        {
          args: '0x',
          enforcer: '0xdeadbeef' as Hex,
          terms: '0xcafe' as Hex,
        },
      ];

      const result = getDelegationCaveats({
        caveats: customCaveats,
        environment: ENV,
        executions: [EXECUTION_MOCK],
        messenger: messengerMock,
        redeemers: [REDEEMER_1],
        transactionMeta: TRANSACTION_META_MOCK,
      });

      expect(result).toBe(customCaveats);
    });
  });

  describe('single execution (non-subsidized)', () => {
    it('produces [limitedCalls, timestamp, exactExecution] for one execution', () => {
      const result = getDelegationCaveats({
        environment: ENV,
        executions: [EXECUTION_MOCK],
        messenger: messengerMock,
        transactionMeta: TRANSACTION_META_MOCK,
      });

      expect(result).toHaveLength(3);

      // [0] limitedCalls
      expect(result[0].enforcer).toBe(caveatEnforcers.LimitedCallsEnforcer);

      // [1] timestamp
      expect(result[1].enforcer).toBe(caveatEnforcers.TimestampEnforcer);
      const expectedTerms = buildExpectedTimestampTerms(
        FIXED_NOW_S + DEFAULT_DEADLINE_SECONDS,
      );
      expect(result[1].terms).toBe(expectedTerms);

      // [2] exactExecution
      expect(result[2].enforcer).toBe(caveatEnforcers.ExactExecutionEnforcer);
    });
  });

  describe('batch execution (non-subsidized)', () => {
    it('uses exactExecutionBatch when more than one execution is provided', () => {
      const execution2 = {
        callData: '0x5678' as Hex,
        target: '0x0000000000000000000000000000000000000002' as Hex,
        value: BigInt(0),
      };

      const result = getDelegationCaveats({
        environment: ENV,
        executions: [EXECUTION_MOCK, execution2],
        messenger: messengerMock,
        transactionMeta: TRANSACTION_META_MOCK,
      });

      expect(result).toHaveLength(3);
      expect(result[0].enforcer).toBe(caveatEnforcers.LimitedCallsEnforcer);
      expect(result[1].enforcer).toBe(caveatEnforcers.TimestampEnforcer);
      expect(result[2].enforcer).toBe(
        caveatEnforcers.ExactExecutionBatchEnforcer,
      );
    });
  });

  describe('redeemers caveat', () => {
    it('inserts redeemer caveat after timestamp when redeemers are provided', () => {
      const result = getDelegationCaveats({
        environment: ENV,
        executions: [EXECUTION_MOCK],
        messenger: messengerMock,
        redeemers: [REDEEMER_1],
        transactionMeta: TRANSACTION_META_MOCK,
      });

      // [0] limitedCalls, [1] timestamp, [2] redeemer, [3] exactExecution
      expect(result).toHaveLength(4);
      expect(result[0].enforcer).toBe(caveatEnforcers.LimitedCallsEnforcer);
      expect(result[1].enforcer).toBe(caveatEnforcers.TimestampEnforcer);
      expect(result[2].enforcer).toBe(caveatEnforcers.RedeemerEnforcer);
      expect(result[3].enforcer).toBe(caveatEnforcers.ExactExecutionEnforcer);
    });

    it('concatenates multiple redeemer addresses lowercased in terms', () => {
      const result = getDelegationCaveats({
        environment: ENV,
        executions: [EXECUTION_MOCK],
        messenger: messengerMock,
        redeemers: [REDEEMER_1, REDEEMER_2],
        transactionMeta: TRANSACTION_META_MOCK,
      });

      const redeemerCaveat = result.find(
        (c) => c.enforcer === caveatEnforcers.RedeemerEnforcer,
      );

      expect(redeemerCaveat).toBeDefined();
      const expected =
        `0x${REDEEMER_1.slice(2)}${REDEEMER_2.slice(2)}`.toLowerCase();
      expect(redeemerCaveat?.terms).toBe(expected);
    });

    it('omits redeemer caveat when redeemers array is empty', () => {
      const result = getDelegationCaveats({
        environment: ENV,
        executions: [EXECUTION_MOCK],
        messenger: messengerMock,
        redeemers: [],
        transactionMeta: TRANSACTION_META_MOCK,
      });

      const redeemerCaveat = result.find(
        (c) => c.enforcer === caveatEnforcers.RedeemerEnforcer,
      );
      expect(redeemerCaveat).toBeUndefined();
    });

    it('omits redeemer caveat when redeemers is undefined', () => {
      const result = getDelegationCaveats({
        environment: ENV,
        executions: [EXECUTION_MOCK],
        messenger: messengerMock,
        transactionMeta: TRANSACTION_META_MOCK,
      });

      const redeemerCaveat = result.find(
        (c) => c.enforcer === caveatEnforcers.RedeemerEnforcer,
      );
      expect(redeemerCaveat).toBeUndefined();
    });
  });

  describe('subsidized caveats', () => {
    it('returns base caveats followed by subsidized caveats when isSubsidized is true', () => {
      const result = getDelegationCaveats({
        environment: ENV,
        executions: [EXECUTION_MOCK],
        isSubsidized: true,
        messenger: messengerMock,
        transactionMeta: TRANSACTION_META_MOCK,
      });

      // Base: [limitedCalls, timestamp] + subsidized: [allowedTargets, ...allowedCalldata]
      expect(result.length).toBeGreaterThanOrEqual(3);
      expect(result[0].enforcer).toBe(caveatEnforcers.LimitedCallsEnforcer);
      expect(result[1].enforcer).toBe(caveatEnforcers.TimestampEnforcer);
      // Third caveat onwards are subsidized (allowedTargets first)
      expect(result[2].enforcer).toBe(caveatEnforcers.AllowedTargetsEnforcer);
    });

    it('does not include exactExecution when isSubsidized is true', () => {
      const result = getDelegationCaveats({
        environment: ENV,
        executions: [EXECUTION_MOCK],
        isSubsidized: true,
        messenger: messengerMock,
        transactionMeta: TRANSACTION_META_MOCK,
      });

      const hasExactExecution = result.some(
        (c) =>
          c.enforcer === caveatEnforcers.ExactExecutionEnforcer ||
          c.enforcer === caveatEnforcers.ExactExecutionBatchEnforcer,
      );
      expect(hasExactExecution).toBe(false);
    });
  });

  describe('deadline default (1800 seconds)', () => {
    it('uses 1800 s deadline when no flag is set', () => {
      remoteFeatureFlags = {};

      const result = getDelegationCaveats({
        environment: ENV,
        executions: [EXECUTION_MOCK],
        messenger: messengerMock,
        transactionMeta: TRANSACTION_META_MOCK,
      });

      const timestampCaveat = result.find(
        (c) => c.enforcer === caveatEnforcers.TimestampEnforcer,
      );

      expect(timestampCaveat?.terms).toBe(
        buildExpectedTimestampTerms(FIXED_NOW_S + DEFAULT_DEADLINE_SECONDS),
      );
    });
  });

  describe('deadlineSeconds feature flag override', () => {
    it('applies the deadlineSeconds override from the feature flag', () => {
      const overrideSeconds = 600;
      remoteFeatureFlags = {
        [CONFIRMATIONS_DELEGATIONS_FEATURE_FLAG_NAME]: {
          deadlineSeconds: overrideSeconds,
        },
      };

      const result = getDelegationCaveats({
        environment: ENV,
        executions: [EXECUTION_MOCK],
        messenger: messengerMock,
        transactionMeta: TRANSACTION_META_MOCK,
      });

      const timestampCaveat = result.find(
        (c) => c.enforcer === caveatEnforcers.TimestampEnforcer,
      );

      expect(timestampCaveat?.terms).toBe(
        buildExpectedTimestampTerms(FIXED_NOW_S + overrideSeconds),
      );
    });

    it('floors fractional deadlineSeconds values', () => {
      remoteFeatureFlags = {
        [CONFIRMATIONS_DELEGATIONS_FEATURE_FLAG_NAME]: {
          deadlineSeconds: 900.9,
        },
      };

      const result = getDelegationCaveats({
        environment: ENV,
        executions: [EXECUTION_MOCK],
        messenger: messengerMock,
        transactionMeta: TRANSACTION_META_MOCK,
      });

      const timestampCaveat = result.find(
        (c) => c.enforcer === caveatEnforcers.TimestampEnforcer,
      );

      expect(timestampCaveat?.terms).toBe(
        buildExpectedTimestampTerms(FIXED_NOW_S + 900),
      );
    });
  });

  describe('invalid deadlineSeconds values fall back to default', () => {
    it.each([
      ['zero', 0],
      ['negative', -60],
      ['NaN', NaN],
      ['Infinity', Infinity],
      ['string', 'thirty'],
      ['missing flag object', undefined],
    ] as [string, unknown][])(
      'falls back to default when deadlineSeconds is %s',
      (label, value) => {
        remoteFeatureFlags = {
          [CONFIRMATIONS_DELEGATIONS_FEATURE_FLAG_NAME]:
            value === undefined ? {} : { deadlineSeconds: value as number },
        };

        const result = getDelegationCaveats({
          environment: ENV,
          executions: [EXECUTION_MOCK],
          messenger: messengerMock,
          transactionMeta: TRANSACTION_META_MOCK,
        });

        const timestampCaveat = result.find(
          (c) => c.enforcer === caveatEnforcers.TimestampEnforcer,
        );

        expect(timestampCaveat?.terms).toBe(
          buildExpectedTimestampTerms(FIXED_NOW_S + DEFAULT_DEADLINE_SECONDS),
        );
      },
    );

    it('falls back to default when the flag object itself is missing', () => {
      remoteFeatureFlags = {};

      const result = getDelegationCaveats({
        environment: ENV,
        executions: [EXECUTION_MOCK],
        messenger: messengerMock,
        transactionMeta: TRANSACTION_META_MOCK,
      });

      const timestampCaveat = result.find(
        (c) => c.enforcer === caveatEnforcers.TimestampEnforcer,
      );

      expect(timestampCaveat?.terms).toBe(
        buildExpectedTimestampTerms(FIXED_NOW_S + DEFAULT_DEADLINE_SECONDS),
      );
    });
  });
});
