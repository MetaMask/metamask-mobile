import { ethers } from 'ethers';
import { TransactionType } from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';
import {
  applySlippage,
  getMoneyAccountDepositAssetAddress,
  TELLER_ABI,
  type MoneyAccountTxParams,
} from '../../../Money/utils/moneyAccountTransactions';

/**
 * Claim-only batch construction.
 *
 * This deliberately mirrors `buildMoneyAccountDepositBatch` rather than
 * extending it. The shared builder sits on the live MM Pay deposit path, and
 * this claim flow is a draft behind an off-by-default flag — widening the
 * shared function to take an optional authorization leg would have put
 * unverifiable risk on real user deposits for no benefit to them.
 *
 * The duplicated half is the approve/deposit encoding. The genuinely shared,
 * side-effect-free pieces (`applySlippage`, `TELLER_ABI`,
 * `getMoneyAccountDepositAssetAddress`) are imported, not copied, so the two
 * cannot drift on the parts that matter most.
 *
 * Reunify with `buildMoneyAccountDepositBatch` once the claim flow is real and
 * the shared path has an equivalent authorization case of its own.
 */

const LENS_ABI = [
  'function previewDeposit(address depositAsset, uint256 depositAmount, address boringVault, address accountant) view returns (uint256 shares)',
];

const ERC20_APPROVE_ABI = ['function approve(address spender, uint256 amount)'];

/**
 * EIP-3009. The signature-bytes overload matches the 65-byte signature the
 * referral-program claim voucher carries, rather than split `v, r, s`.
 */
const EIP_3009_ABI = [
  'function receiveWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, bytes signature)',
];

/** Referral address on the teller deposit; the claim flow attributes nothing. */
const NO_REFERRAL_ADDRESS = '0x0000000000000000000000000000000000000000';

/**
 * The EIP-3009 authorization that funds the money account inside the claim
 * batch. Supplied by the referral-program claim voucher.
 */
export interface ClaimDepositAuthorization {
  /** Treasury address the mUSD is drawn from. */
  from: Hex;
  /** The money account receiving the mUSD. Must equal the batch's `from`. */
  to: Hex;
  /** mUSD base units as a decimal string. */
  value: string;
  /** Unix seconds. */
  validAfter: number;
  /** Unix seconds. The voucher window is one minute. */
  validBefore: number;
  /** hex bytes32 */
  nonce: Hex;
  /** hex bytes65 */
  signature: Hex;
}

/**
 * The three legs, in submission order. An ordered array rather than a keyed
 * object because the only consumer submits them as a batch and never addresses
 * one positionally. Mutable because `addTransactionBatch` takes a mutable
 * array; the builder returns a fresh one on every call, so there is nothing to
 * protect against.
 */
export type ClaimDepositBatch = MoneyAccountTxParams[];

function buildReceiveWithAuthorizationData(
  authorization: ClaimDepositAuthorization,
): Hex {
  const iface = new ethers.utils.Interface(EIP_3009_ABI);
  return iface.encodeFunctionData('receiveWithAuthorization', [
    authorization.from,
    authorization.to,
    authorization.value,
    authorization.validAfter,
    authorization.validBefore,
    authorization.nonce,
    authorization.signature,
  ]) as Hex;
}

function buildApproveData(boringVault: string, amount: bigint): Hex {
  const iface = new ethers.utils.Interface(ERC20_APPROVE_ABI);
  return iface.encodeFunctionData('approve', [
    boringVault,
    amount.toString(),
  ]) as Hex;
}

function buildDepositData(
  musdAddress: string,
  amount: bigint,
  minimumMint: bigint,
): Hex {
  const iface = new ethers.utils.Interface(TELLER_ABI);
  return iface.encodeFunctionData('deposit', [
    musdAddress,
    amount.toString(),
    minimumMint.toString(),
    NO_REFERRAL_ADDRESS,
  ]) as Hex;
}

async function getExpectedDepositShares({
  lensAddress,
  boringVault,
  accountantAddress,
  musdAddress,
  amount,
  provider,
}: {
  lensAddress: string;
  boringVault: string;
  accountantAddress: string;
  musdAddress: string;
  amount: bigint;
  provider: ethers.providers.Provider;
}): Promise<bigint> {
  const lens = new ethers.Contract(lensAddress, LENS_ABI, provider);
  const shares = await lens.previewDeposit(
    musdAddress,
    amount.toString(),
    boringVault,
    accountantAddress,
  );
  return BigInt(shares.toString());
}

/**
 * Builds the three-leg claim batch: the EIP-3009 authorization that moves the
 * claimed mUSD from the treasury into the money account, then the approve and
 * deposit that put it into the vault.
 *
 * The authorization is what makes this batch self-funding, which is why the
 * caller must not also declare mUSD in `requiredAssets` — doing so would have
 * MM Pay fund the account a second time for money the batch already carries.
 *
 * @param params - Vault addresses, provider, amount and the voucher authorization.
 * @returns The three legs in submission order.
 */
export async function buildClaimDepositBatch({
  amount,
  chainId,
  boringVault,
  tellerAddress,
  accountantAddress,
  lensAddress,
  provider,
  authorization,
}: {
  amount: bigint;
  chainId: Hex;
  boringVault: string;
  tellerAddress: string;
  accountantAddress: string;
  lensAddress: string;
  provider: ethers.providers.Provider;
  authorization: ClaimDepositAuthorization;
}): Promise<ClaimDepositBatch> {
  const musdAddress = getMoneyAccountDepositAssetAddress(chainId);

  const minimumMint =
    amount === 0n
      ? 0n
      : applySlippage(
          await getExpectedDepositShares({
            lensAddress,
            boringVault,
            accountantAddress,
            musdAddress,
            amount,
            provider,
          }),
        );

  return [
    {
      params: {
        to: musdAddress,
        data: buildReceiveWithAuthorizationData(authorization),
        value: '0x0' as Hex,
      },
      type: TransactionType.contractInteraction,
    },
    {
      params: {
        to: musdAddress,
        data: buildApproveData(boringVault, amount),
        value: '0x0' as Hex,
      },
      type: TransactionType.tokenMethodApprove,
    },
    {
      params: {
        to: tellerAddress as Hex,
        data: buildDepositData(musdAddress, amount, minimumMint),
        value: '0x0' as Hex,
      },
      type: TransactionType.moneyAccountDeposit,
    },
  ];
}
