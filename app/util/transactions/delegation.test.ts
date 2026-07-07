import {
  IsAtomicBatchSupportedRequest,
  TransactionController,
  TransactionMeta,
} from '@metamask/transaction-controller';
import { SignMessenger, getDelegationTransaction } from './delegation';
import { MOCK_ANY_NAMESPACE, Messenger } from '@metamask/messenger';
import { Hex } from '@metamask/utils';
import { type Caveat } from '../../core/Delegation';

const mockGetNonceLock = jest.fn();

const mockIsAtomicBatchSupported: jest.MockedFn<
  TransactionController['isAtomicBatchSupported']
> = jest.fn();

jest.spyOn(Math, 'random').mockReturnValue(0);

jest.mock('../../core/Engine', () => ({
  context: {
    TransactionController: {
      getNonceLock: () => mockGetNonceLock(),
      isAtomicBatchSupported: (request: IsAtomicBatchSupportedRequest) =>
        mockIsAtomicBatchSupported(request),
    },
  },
}));

const DELEGATION_SIGNATURE_MOCK = '0x111222333';
const UPGRADE_CONTRACT_ADDRESS_MOCK = '0x456' as Hex;
const NONCE_MOCK = 123;

const AUTHORIZATION_SIGNATURE_MOCK =
  '0xf85c827a6994663f3ad617193148711d28f5334ee4ed070166028080a040e292da533253143f134643a03405f1af1de1d305526f44ed27e62061368d4ea051cfb0af34e491aa4d6796dececf95569088322e116c4b2f312bb23f20699269';

const NETWORK_CLIENT_ID_MOCK = 'mainnet';

const TRANSACTION_META_MOCK = {
  chainId: '0x1' as Hex,
  networkClientId: NETWORK_CLIENT_ID_MOCK,
  nestedTransactions: [
    {
      data: '0x123456781234' as Hex,
      to: '0x1234567890abcdef1234567890abcdef12345678' as Hex,
    },
  ],
  txParams: {
    from: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
  },
} as TransactionMeta;

describe('Transaction Delegation Utils', () => {
  const signDelegationMock = jest.fn();
  const sign7702Mock = jest.fn();
  let messengerMock: SignMessenger;

  beforeEach(() => {
    jest.clearAllMocks();

    messengerMock = new Messenger({
      namespace: MOCK_ANY_NAMESPACE,
    });

    messengerMock.registerActionHandler(
      'DelegationController:signDelegation',
      signDelegationMock,
    );

    messengerMock.registerActionHandler(
      'KeyringController:signEip7702Authorization',
      sign7702Mock,
    );

    signDelegationMock.mockResolvedValue(DELEGATION_SIGNATURE_MOCK);
    sign7702Mock.mockResolvedValue(AUTHORIZATION_SIGNATURE_MOCK);

    mockIsAtomicBatchSupported.mockResolvedValue([
      {
        chainId: TRANSACTION_META_MOCK.chainId,
        isSupported: false,
        upgradeContractAddress: UPGRADE_CONTRACT_ADDRESS_MOCK,
      },
    ]);

    mockGetNonceLock.mockResolvedValue({
      nonceDetails: { params: { nextNetworkNonce: NONCE_MOCK } },
      releaseLock: jest.fn(),
    });
  });

  describe('getDelegationTransaction', () => {
    it('returns delegation data', async () => {
      const result = await getDelegationTransaction(
        messengerMock,
        TRANSACTION_META_MOCK,
      );

      expect(result).toBeDefined();
      expect(result.to).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.value).toBe('0x0');
      expect(result.authorizationList).toHaveLength(1);
      expect(result.authorizationList?.[0].address).toBe(
        UPGRADE_CONTRACT_ADDRESS_MOCK,
      );
    });

    it('does not include authorization if already upgraded', async () => {
      mockIsAtomicBatchSupported.mockResolvedValue([
        {
          chainId: TRANSACTION_META_MOCK.chainId,
          delegationAddress: UPGRADE_CONTRACT_ADDRESS_MOCK,
          isSupported: true,
          upgradeContractAddress: UPGRADE_CONTRACT_ADDRESS_MOCK,
        },
      ]);

      const result = await getDelegationTransaction(messengerMock, {
        ...TRANSACTION_META_MOCK,
        delegationAddress: UPGRADE_CONTRACT_ADDRESS_MOCK,
      });

      expect(result.authorizationList).toBeUndefined();
    });

    it('includes authorization if upgraded to different contract', async () => {
      mockIsAtomicBatchSupported.mockResolvedValue([
        {
          chainId: TRANSACTION_META_MOCK.chainId,
          delegationAddress: UPGRADE_CONTRACT_ADDRESS_MOCK,
          isSupported: false,
          upgradeContractAddress: '0x789' as Hex,
        },
      ]);

      const result = await getDelegationTransaction(messengerMock, {
        ...TRANSACTION_META_MOCK,
        delegationAddress: UPGRADE_CONTRACT_ADDRESS_MOCK,
      });

      expect(result.authorizationList).toHaveLength(1);
    });

    it('calls DelegationController to sign delegation', async () => {
      await getDelegationTransaction(messengerMock, TRANSACTION_META_MOCK);

      expect(signDelegationMock).toHaveBeenCalledWith({
        chainId: TRANSACTION_META_MOCK.chainId,
        delegation: expect.any(Object),
      });
    });

    it('calls KeyringController to sign authorization', async () => {
      await getDelegationTransaction(messengerMock, TRANSACTION_META_MOCK);

      expect(sign7702Mock).toHaveBeenCalledWith({
        chainId: 1,
        contractAddress: UPGRADE_CONTRACT_ADDRESS_MOCK,
        from: TRANSACTION_META_MOCK.txParams.from,
        nonce: NONCE_MOCK,
      });
    });

    it('throws if chain does not support EIP-7702', async () => {
      mockIsAtomicBatchSupported.mockResolvedValue([]);

      await expect(
        getDelegationTransaction(messengerMock, TRANSACTION_META_MOCK),
      ).rejects.toThrow('Chain does not support EIP-7702');
    });

    it('throws if upgrade contract address is not found', async () => {
      mockIsAtomicBatchSupported.mockResolvedValue([
        {
          chainId: TRANSACTION_META_MOCK.chainId,
          isSupported: false,
          upgradeContractAddress: undefined,
        },
      ]);

      await expect(
        getDelegationTransaction(messengerMock, TRANSACTION_META_MOCK),
      ).rejects.toThrow('Upgrade contract address not found');
    });

    describe('subsidized', () => {
      const ORDER_ID_PLACEHOLDER =
        '0x07cece46d0aec658b12c9d194b3ac3cc74aadf102176005c76f96422b57328b2';
      const PLACEHOLDER_BODY = ORDER_ID_PLACEHOLDER.slice(2);
      const SELF_TARGET = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as Hex;

      const APPROVE_SELECTOR = '095ea7b3';
      const DEPOSIT_SELECTOR = 'f9e4bab4';
      const EXECUTE_SELECTOR = '1a2b3c4d';

      // Full calldata of each nested call (selector + args), matching the real
      // `transferAndMulticall` shape:
      //  - APPROVE_DATA carries NO order-ID placeholder -> no split point (merges left).
      //  - DEPOSIT_DATA carries the order-ID placeholder -> its selector gets a split.
      // The deposit's args also embed the approve selector twice, reproducing the
      // collision where a selector appears inside another call's arguments — those
      // coincidental matches must NOT create split points.
      const APPROVE_DATA = `${APPROVE_SELECTOR}${'22'.repeat(28)}`;
      const DEPOSIT_DATA = `${DEPOSIT_SELECTOR}${APPROVE_SELECTOR}${'33'.repeat(
        12,
      )}${PLACEHOLDER_BODY}${APPROVE_SELECTOR}${'33'.repeat(12)}`;

      // Batch-encoded 7702 calldata (txParams.data). The two nested calls appear
      // verbatim and whole-byte aligned; the fixed order-ID placeholder is embedded
      // `occurrences` times.
      //   [execute selector][fill][approve call][deposit call]
      //   [placeholder]([fill][placeholder]...)[suffix]
      const buildBatchData = (occurrences = 1): Hex => {
        const fill = (byte: string) => byte.repeat(16);
        const header = `${EXECUTE_SELECTOR}${fill('11')}${APPROVE_DATA}${DEPOSIT_DATA}`;
        const windows = Array.from(
          { length: occurrences },
          (_, index) => `${PLACEHOLDER_BODY}${fill(index === 0 ? '44' : '55')}`,
        ).join('');
        return `0x${header}${windows}${fill('cd')}` as Hex;
      };

      const buildSubsidizedTransaction = (data: Hex): TransactionMeta =>
        ({
          ...TRANSACTION_META_MOCK,
          txParams: {
            ...TRANSACTION_META_MOCK.txParams,
            to: SELF_TARGET,
            data,
            value: '0x0',
          },
          nestedTransactions: [
            {
              data: `0x${APPROVE_DATA}` as Hex,
              to: '0x1111111111111111111111111111111111111111' as Hex,
              value: '0x0' as Hex,
            },
            {
              data: `0x${DEPOSIT_DATA}` as Hex,
              to: '0x2222222222222222222222222222222222222222' as Hex,
              value: '0x0' as Hex,
            },
          ],
        }) as TransactionMeta;

      const getCaveats = (): Caveat[] => {
        const delegationCall = signDelegationMock.mock.calls[0][0];
        return (
          (delegationCall as Record<string, unknown>).delegation as Record<
            string,
            unknown
          >
        ).caveats as Caveat[];
      };

      // Byte value (index + slice) of an AllowedCalldata caveat term. Terms are
      // `0x` + 32-byte start index + enforced bytes.
      const parseAllowedCalldata = (terms: string) => ({
        startIndex: parseInt(terms.slice(2, 2 + 64), 16),
        value: terms.slice(2 + 64).toLowerCase(),
      });

      const getAllowedCalldataTerms = (caveats: Caveat[]) =>
        caveats
          .map((c) => c.terms)
          .filter((terms) => terms.length > 2 + 64)
          .map(parseAllowedCalldata);

      it('splits only after order-ID-bearing call selectors, folding the selector into the preceding segment', async () => {
        const data = buildBatchData(1);
        const body = data.slice(2).toLowerCase();

        await getDelegationTransaction(
          messengerMock,
          buildSubsidizedTransaction(data),
          true,
        );

        const enforced = getAllowedCalldataTerms(getCaveats());

        // No segment is the bare selector: the selector is folded into the run that
        // precedes the split, so an enforced segment ends with (not equals) the selector.
        expect(enforced).not.toContainEqual(
          expect.objectContaining({ value: APPROVE_SELECTOR }),
        );
        expect(enforced).not.toContainEqual(
          expect.objectContaining({ value: DEPOSIT_SELECTOR }),
        );

        const approveSplit = body.indexOf(APPROVE_DATA) / 2 + 4;
        const depositSplit = body.indexOf(DEPOSIT_DATA) / 2 + 4;
        const segmentEnds = enforced.map(
          ({ startIndex, value }) => startIndex + value.length / 2,
        );

        // The deposit carries the order-ID placeholder -> its selector gets a split.
        expect(segmentEnds).toContain(depositSplit);

        // The approve carries no order-ID placeholder -> no split; it merges into the
        // preceding run, so no segment ends at its post-selector offset.
        expect(segmentEnds).not.toContain(approveSplit);

        // The coincidental approve selectors inside the deposit args must NOT create
        // split points either: no segment ends there.
        const depositStart = body.indexOf(DEPOSIT_DATA) / 2;
        const innerApprove1 = depositStart + 4 + 4; // after deposit selector + inner approve selector
        expect(segmentEnds).not.toContain(innerApprove1);
      });

      it('produces far fewer caveats than the per-selector split (regression: 9 -> few)', async () => {
        const data = buildBatchData(2);

        await getDelegationTransaction(
          messengerMock,
          buildSubsidizedTransaction(data),
          true,
        );

        // allowedTargets + limitedCalls + allowedCalldata segments. The old
        // per-selector isolation emitted ~9 caveats for this two-call shape; splitting
        // only at the single order-ID-bearing call (the deposit) — not the approve, and
        // not the coincidental inner selectors — keeps it well under that.
        const caveats = getCaveats();
        expect(caveats.length).toBeLessThanOrEqual(7);
      });

      it('leaves the order-ID placeholder window free and enforces the full remainder', async () => {
        const data = buildBatchData(1);

        await getDelegationTransaction(
          messengerMock,
          buildSubsidizedTransaction(data),
          true,
        );

        const body = data.slice(2).toLowerCase();
        const enforced = getAllowedCalldataTerms(getCaveats());

        // No enforced segment overlaps the placeholder window.
        for (const { value } of enforced) {
          expect(value).not.toContain(PLACEHOLDER_BODY);
        }

        // Every non-placeholder byte is enforced exactly once: reassembling the enforced
        // segments at their offsets plus the placeholder window reproduces the body.
        const rebuilt = Array.from(body);
        for (const { startIndex, value } of enforced) {
          for (let i = 0; i < value.length; i++) {
            rebuilt[startIndex * 2 + i] = value[i];
          }
        }
        expect(rebuilt.join('')).toBe(body);

        // The placeholder window itself is not covered by any segment.
        const placeholderStart = body.indexOf(PLACEHOLDER_BODY) / 2;
        const covered = enforced.some(
          ({ startIndex, value }) =>
            startIndex <= placeholderStart &&
            placeholderStart < startIndex + value.length / 2,
        );
        expect(covered).toBe(false);
      });

      it('frees every occurrence when the placeholder appears multiple times', async () => {
        const data = buildBatchData(2);

        await getDelegationTransaction(
          messengerMock,
          buildSubsidizedTransaction(data),
          true,
        );

        const enforced = getAllowedCalldataTerms(getCaveats());

        for (const { value } of enforced) {
          expect(value).not.toContain(PLACEHOLDER_BODY);
        }

        // Every placeholder occurrence remains free — the two trailing windows plus
        // the one embedded inside the deposit call.
        const body = data.slice(2).toLowerCase();
        let searchIndex = body.indexOf(PLACEHOLDER_BODY);
        const placeholderStarts: number[] = [];
        while (searchIndex !== -1) {
          placeholderStarts.push(searchIndex / 2);
          searchIndex = body.indexOf(PLACEHOLDER_BODY, searchIndex + 1);
        }
        expect(placeholderStarts).toHaveLength(3);

        for (const start of placeholderStarts) {
          const covered = enforced.some(
            ({ startIndex, value }) =>
              startIndex <= start && start < startIndex + value.length / 2,
          );
          expect(covered).toBe(false);
        }
      });

      it('redeems the batch as a single execution in single mode', async () => {
        const data = buildBatchData(1);

        const result = await getDelegationTransaction(
          messengerMock,
          buildSubsidizedTransaction(data),
          true,
        );

        // Delegation transaction is produced without throwing on the two-step batch.
        expect(result.data).toBeDefined();
        expect(result.to).toBeDefined();
      });

      it('throws with the subsidized prefix when batch calldata is missing', async () => {
        const transaction = {
          ...TRANSACTION_META_MOCK,
          txParams: {
            ...TRANSACTION_META_MOCK.txParams,
            to: SELF_TARGET,
            data: undefined as unknown as Hex,
          },
        } as TransactionMeta;

        await expect(
          getDelegationTransaction(messengerMock, transaction, true),
        ).rejects.toThrow(
          'Subsidized Caveats: missing batch target or calldata',
        );
      });
    });
  });
});
