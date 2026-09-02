import { ethers } from 'ethers';
import { TransactionType } from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';
import { MUSD_TOKEN_ADDRESS_BY_CHAIN } from '../../../Earn/constants/musd';
import {
  buildClaimDepositBatch,
  type ClaimDepositAuthorization,
} from './buildClaimDepositBatch';

const MOCK_CHAIN_ID = '0x8f' as Hex;
// All-lowercase: ethers accepts it without a checksum, avoiding a mixed-case
// literal that would have to be kept checksum-correct by hand.
const MOCK_MUSD = '0xaca92e438df0b2401ff60da7e4337b687a2435da' as Hex;
const MOCK_BORING_VAULT = '0xB5F07d769dD60fE54c97dd53101181073DDf21b2' as Hex;
const MOCK_TELLER = '0x86821F179eaD9F0b3C79b2f8deF0227eEBFDc9f9' as Hex;
const MOCK_ACCOUNTANT = '0x800ebc3B74F67EaC27C9CCE4E4FF28b17CdCA173' as Hex;
const MOCK_LENS = '0x846a7832022350434B5cC006d07cc9c782469660' as Hex;

const mockPreviewDeposit = jest.fn();

jest.mock('ethers', () => {
  const actual = jest.requireActual('ethers');
  return {
    ...actual,
    ethers: {
      ...actual.ethers,
      Contract: jest.fn(() => ({
        previewDeposit: (...args: unknown[]) => mockPreviewDeposit(...args),
      })),
    },
  };
});

const AUTHORIZATION: ClaimDepositAuthorization = {
  from: '0x1111111111111111111111111111111111111111' as Hex,
  to: '0x2222222222222222222222222222222222222222' as Hex,
  value: '12500000',
  validAfter: 0,
  validBefore: 1_800_000_060,
  nonce: `0x${'ab'.repeat(32)}` as Hex,
  signature: `0x${'cd'.repeat(65)}` as Hex,
};

const build = (amount = BigInt(12_500_000)) =>
  buildClaimDepositBatch({
    amount,
    chainId: MOCK_CHAIN_ID,
    boringVault: MOCK_BORING_VAULT,
    tellerAddress: MOCK_TELLER,
    accountantAddress: MOCK_ACCOUNTANT,
    lensAddress: MOCK_LENS,
    provider: {} as ethers.providers.Provider,
    authorization: AUTHORIZATION,
  });

describe('buildClaimDepositBatch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    MUSD_TOKEN_ADDRESS_BY_CHAIN[MOCK_CHAIN_ID] = MOCK_MUSD;
    mockPreviewDeposit.mockResolvedValue(ethers.BigNumber.from('1000000'));
  });

  it('returns the three legs in authorization, approve, deposit order', async () => {
    const batch = await build();

    expect(batch.map(({ type }) => type)).toStrictEqual([
      TransactionType.contractInteraction,
      TransactionType.tokenMethodApprove,
      TransactionType.moneyAccountDeposit,
    ]);
  });

  it('targets the mUSD token for the authorization and approve legs', async () => {
    const batch = await build();

    expect(batch[0].params.to).toBe(MOCK_MUSD);
    expect(batch[1].params.to).toBe(MOCK_MUSD);
    expect(batch[2].params.to).toBe(MOCK_TELLER);
  });

  it('encodes receiveWithAuthorization with every voucher field', async () => {
    const batch = await build();

    const iface = new ethers.utils.Interface([
      'function receiveWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, bytes signature)',
    ]);
    const decoded = iface.decodeFunctionData(
      'receiveWithAuthorization',
      batch[0].params.data as string,
    );

    expect(decoded[0].toLowerCase()).toBe(AUTHORIZATION.from);
    expect(decoded[1].toLowerCase()).toBe(AUTHORIZATION.to);
    expect(decoded[2].toString()).toBe(AUTHORIZATION.value);
    expect(decoded[3].toString()).toBe(String(AUTHORIZATION.validAfter));
    expect(decoded[4].toString()).toBe(String(AUTHORIZATION.validBefore));
    expect(decoded[5]).toBe(AUTHORIZATION.nonce);
    expect(decoded[6]).toBe(AUTHORIZATION.signature);
  });

  it('approves the boring vault for the claimed amount', async () => {
    const batch = await build();

    const iface = new ethers.utils.Interface([
      'function approve(address spender, uint256 amount)',
    ]);
    const decoded = iface.decodeFunctionData(
      'approve',
      batch[1].params.data as string,
    );

    expect(decoded[0].toLowerCase()).toBe(MOCK_BORING_VAULT.toLowerCase());
    expect(decoded[1].toString()).toBe('12500000');
  });

  it('applies slippage to the previewed shares as minimumMint', async () => {
    mockPreviewDeposit.mockResolvedValue(ethers.BigNumber.from('1000000'));

    const batch = await build();

    const iface = new ethers.utils.Interface([
      'function deposit(address depositAsset, uint256 depositAmount, uint256 minimumMint, address referralAddress) payable returns (uint256 shares)',
    ]);
    const decoded = iface.decodeFunctionData(
      'deposit',
      batch[2].params.data as string,
    );

    // 0.2% tolerance, matching the shared builder's applySlippage.
    expect(decoded[2].toString()).toBe('998000');
  });

  it('previews against the lens with the claimed amount', async () => {
    await build();

    expect(mockPreviewDeposit).toHaveBeenCalledWith(
      MOCK_MUSD,
      '12500000',
      MOCK_BORING_VAULT,
      MOCK_ACCOUNTANT,
    );
  });

  it('skips the preview round trip for a zero amount', async () => {
    await build(BigInt(0));

    expect(mockPreviewDeposit).not.toHaveBeenCalled();
  });

  it('carries no native value on any leg', async () => {
    const batch = await build();

    expect(batch.every(({ params }) => params.value === '0x0')).toBe(true);
  });

  it('throws when mUSD is not deployed on the chain', async () => {
    delete MUSD_TOKEN_ADDRESS_BY_CHAIN[MOCK_CHAIN_ID];

    await expect(build()).rejects.toThrow('mUSD not deployed');
  });
});
