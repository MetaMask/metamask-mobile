import { ethers, Wallet } from 'ethers';
import type { Hex } from '@metamask/utils';
import {
  BATCH_DEFAULT_MODE,
  createDelegation,
  getDelegationHashOffchain,
  type Delegation,
  type DeleGatorEnvironment,
  type ExecutionMode,
  type ExecutionStruct,
  type UnsignedDelegation,
} from '../../../core/Delegation';
import { encodeRedeemDelegations } from '../../../core/Delegation/delegation';
import { exactExecutionBatchBuilder } from '../../../core/Delegation/caveatBuilder/exactExecutionBatchBuilder';

const SHARE_SCALE = 1_000_000n;
const ERC20 = new ethers.utils.Interface([
  'function approve(address spender, uint256 amount)',
  'function transfer(address to, uint256 amount)',
]);
const TELLER = new ethers.utils.Interface([
  'function withdraw(address withdrawAsset, uint256 shareAmount, uint256 minimumAssets, address to)',
  'function deposit(address depositAsset, uint256 depositAmount, uint256 minimumMint, address referralAddress)',
]);
const SIGNABLE_DELEGATION_TYPES = {
  Caveat: [
    { name: 'enforcer', type: 'address' },
    { name: 'terms', type: 'bytes' },
  ],
  Delegation: [
    { name: 'delegate', type: 'address' },
    { name: 'delegator', type: 'address' },
    { name: 'authority', type: 'bytes32' },
    { name: 'caveats', type: 'Caveat[]' },
    { name: 'salt', type: 'uint256' },
  ],
};

export interface MigrationExecutionContexts {
  sourceExecutions: ExecutionStruct[];
  destinationExecutions: ExecutionStruct[];
}

export interface MigrationRedemption {
  delegations: Delegation[][];
  modes: ExecutionMode[];
  executions: ExecutionStruct[][];
  transactionData: Hex;
}

/**
 * Converts a raw vmUSD share balance to the mUSD amount returned by Teller.withdraw.
 *
 * The Veda accountant rate uses six decimal places for the share scale.
 */
export const getMusdAmountForShares = (
  vmUsdShares: bigint,
  exchangeRate: bigint,
): bigint => {
  if (vmUsdShares < 0n) {
    throw new Error('invalid-vmusd-share-amount');
  }
  if (exchangeRate <= 0n) {
    throw new Error('invalid-vault-exchange-rate');
  }
  return (vmUsdShares * exchangeRate) / SHARE_SCALE;
};

/**
 * Derives an EOA address without importing or persisting its private key.
 */
export const deriveAddressFromPrivateKey = (privateKey: string): Hex =>
  new Wallet(privateKey).address as Hex;

/**
 * Encodes the ordered calls executed by the A and B permission contexts.
 */
export const buildMigrationExecutionContexts = ({
  source,
  destination,
  musdAddress,
  boringVault,
  tellerAddress,
  vmUsdShares,
  musdAmount,
  minimumMint,
}: {
  source: Hex;
  destination: Hex;
  musdAddress: Hex;
  boringVault: Hex;
  tellerAddress: Hex;
  vmUsdShares: bigint;
  musdAmount: bigint;
  minimumMint: bigint;
}): MigrationExecutionContexts => ({
  sourceExecutions: [
    {
      target: tellerAddress,
      value: 0n,
      callData: TELLER.encodeFunctionData('withdraw', [
        musdAddress,
        vmUsdShares.toString(),
        musdAmount.toString(),
        source,
      ]) as Hex,
    },
    {
      target: musdAddress,
      value: 0n,
      callData: ERC20.encodeFunctionData('transfer', [
        destination,
        musdAmount.toString(),
      ]) as Hex,
    },
  ],
  destinationExecutions: [
    {
      target: musdAddress,
      value: 0n,
      callData: ERC20.encodeFunctionData('approve', [
        boringVault,
        musdAmount.toString(),
      ]) as Hex,
    },
    {
      target: tellerAddress,
      value: 0n,
      callData: TELLER.encodeFunctionData('deposit', [
        musdAddress,
        musdAmount.toString(),
        minimumMint.toString(),
        ethers.constants.AddressZero,
      ]) as Hex,
    },
  ],
});

/**
 * Signs a DelegationManager delegation with a private key held only in memory.
 */
export const signDelegationWithPrivateKey = async ({
  chainId,
  environment,
  delegation,
  privateKey,
}: {
  chainId: Hex;
  environment: DeleGatorEnvironment;
  delegation: UnsignedDelegation;
  privateKey: string;
}): Promise<Hex> => {
  const wallet = new Wallet(privateKey);
  if (wallet.address.toLowerCase() !== delegation.delegator.toLowerCase()) {
    throw new Error('delegation-signer-mismatch');
  }

  const signature = await wallet._signTypedData(
    {
      chainId: parseInt(chainId, 16),
      name: 'DelegationManager',
      version: '1',
      verifyingContract: environment.DelegationManager,
    },
    SIGNABLE_DELEGATION_TYPES,
    {
      delegate: delegation.delegate,
      delegator: delegation.delegator,
      authority: delegation.authority,
      caveats: delegation.caveats.map(({ enforcer, terms }) => ({
        enforcer,
        terms,
      })),
      salt: delegation.salt === '0x' ? '0' : BigInt(delegation.salt).toString(),
    },
  );

  return signature as Hex;
};

const buildExactExecutionCaveats = (
  environment: DeleGatorEnvironment,
  executions: ExecutionStruct[],
) =>
  exactExecutionBatchBuilder(
    environment,
    executions.map(({ target, value, callData }) => ({
      to: target,
      value: `0x${value.toString(16)}`,
      data: callData,
    })),
  );

/**
 * Builds the two permission contexts redeemed atomically by C.
 */
export const buildMigrationRedemption = async ({
  chainId,
  environment,
  sourceDelegation,
  source,
  destination,
  submitter,
  bPrivateKey,
  contexts,
}: {
  chainId: Hex;
  environment: DeleGatorEnvironment;
  sourceDelegation: Delegation;
  source: Hex;
  destination: Hex;
  submitter: Hex;
  bPrivateKey: string;
  contexts: MigrationExecutionContexts;
}): Promise<MigrationRedemption> => {
  if (sourceDelegation.delegator.toLowerCase() !== source.toLowerCase()) {
    throw new Error('source-delegation-mismatch');
  }
  if (sourceDelegation.delegate.toLowerCase() !== destination.toLowerCase()) {
    throw new Error('destination-delegation-mismatch');
  }
  if (deriveAddressFromPrivateKey(bPrivateKey).toLowerCase() !== destination.toLowerCase()) {
    throw new Error('destination-key-mismatch');
  }

  const successorUnsigned = createDelegation({
    from: destination,
    to: submitter,
    parentDelegation: getDelegationHashOffchain(sourceDelegation),
    caveats: [
      buildExactExecutionCaveats(environment, contexts.sourceExecutions),
    ],
  });
  const rootUnsigned = createDelegation({
    from: destination,
    to: submitter,
    caveats: [
      buildExactExecutionCaveats(environment, contexts.destinationExecutions),
    ],
  });

  const [successorSignature, rootSignature] = await Promise.all([
    signDelegationWithPrivateKey({
      chainId,
      environment,
      delegation: successorUnsigned,
      privateKey: bPrivateKey,
    }),
    signDelegationWithPrivateKey({
      chainId,
      environment,
      delegation: rootUnsigned,
      privateKey: bPrivateKey,
    }),
  ]);

  const delegations: Delegation[][] = [
    [
      sourceDelegation,
      { ...successorUnsigned, signature: successorSignature },
    ],
    [{ ...rootUnsigned, signature: rootSignature }],
  ];
  const executions = [
    contexts.sourceExecutions,
    contexts.destinationExecutions,
  ];
  const modes: ExecutionMode[] = [
    BATCH_DEFAULT_MODE,
    BATCH_DEFAULT_MODE,
  ];

  return {
    delegations,
    modes,
    executions,
    transactionData: encodeRedeemDelegations({ delegations, modes, executions }),
  };
};
