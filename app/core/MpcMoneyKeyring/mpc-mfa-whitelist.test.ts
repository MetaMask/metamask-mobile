import { Interface } from '@ethersproject/abi';
import { TypedDataUtils, SignTypedDataVersion } from '@metamask/eth-sig-util';
import { getMfaRequirement } from '@metamask/money-account-mfa-whitelist';
import { TELLER_ABI } from '@metamask/money-account-utils';
import { TransactionMeta } from '@metamask/transaction-controller';
import { bytesToHex, Hex } from '@metamask/utils';
import {
  ANY_BENEFICIARY,
  createDelegation,
  getDeleGatorEnvironment,
  toDelegationStruct,
} from '../Delegation';
import { getDelegationCaveats } from '../../util/transactions/caveats';
import { MPC_MFA_WHITELIST_CONFIG } from './mpc-mfa-whitelist-config';

const MONEY_ACCOUNT: Hex = '0x9c19f515eEdf1091C7220D028BFc10f885d3a8F9';
const RELAY_SIGNERS: Hex[] = [
  '0x1111111111111111111111111111111111111111',
  '0x2222222222222222222222222222222222222222',
];
const AMOUNT = 4_388_818n;

const ERC20 = new Interface([
  'function approve(address spender, uint256 amount)',
]);
const TELLER = new Interface(TELLER_ABI);

const buildDepositExecutions = () => {
  const { musdTokenAddress, vaults } = MPC_MFA_WHITELIST_CONFIG;
  const [{ boringVault, tellerAddress }] = vaults;

  return [
    {
      target: musdTokenAddress,
      value: 0n,
      callData: ERC20.encodeFunctionData('approve', [
        boringVault,
        AMOUNT,
      ]) as Hex,
    },
    {
      target: tellerAddress,
      value: 0n,
      callData: TELLER.encodeFunctionData('deposit', [
        musdTokenAddress,
        AMOUNT,
        AMOUNT - 1n,
        '0x0000000000000000000000000000000000000000',
      ]) as Hex,
    },
  ];
};

// Mirrors DelegationController:signDelegation's typed data.
const buildDepositSignatureRequest = (redeemers?: Hex[]) => {
  const chainId = parseInt(MPC_MFA_WHITELIST_CONFIG.chainId, 16);
  const environment = getDeleGatorEnvironment(chainId);
  const messenger = {
    call: () => ({ remoteFeatureFlags: {} }),
  } as unknown as Parameters<typeof getDelegationCaveats>[0]['messenger'];

  const delegation = createDelegation({
    from: MONEY_ACCOUNT,
    to: ANY_BENEFICIARY,
    caveats: getDelegationCaveats({
      environment,
      executions: buildDepositExecutions(),
      messenger,
      redeemers,
      transactionMeta: {} as TransactionMeta,
    }),
  });

  const data = {
    types: {
      EIP712Domain: [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' },
      ],
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
    },
    primaryType: 'Delegation' as const,
    domain: {
      chainId,
      name: 'DelegationManager',
      version: '1',
      verifyingContract: environment.DelegationManager,
    },
    message: toDelegationStruct(delegation),
  };

  return {
    request: {
      method: 'signTypedData',
      address: MONEY_ACCOUNT,
      version: 'V4',
      data,
    } as unknown as Parameters<typeof getMfaRequirement>[0],
    hash: bytesToHex(
      TypedDataUtils.eip712Hash(
        data as unknown as Parameters<typeof TypedDataUtils.eip712Hash>[0],
        SignTypedDataVersion.V4,
      ),
    ),
  };
};

describe('MPC_MFA_WHITELIST_CONFIG', () => {
  it.each([
    ['without relay redeemers', undefined],
    ['limited to the Sentinel relay signers', RELAY_SIGNERS],
  ])(
    'whitelists the vault deposit delegation the publish hook signs %s',
    (_description, redeemers) => {
      const { request, hash } = buildDepositSignatureRequest(redeemers);

      expect(
        getMfaRequirement(request, {
          address: MONEY_ACCOUNT,
          hash,
          config: MPC_MFA_WHITELIST_CONFIG,
        }),
      ).toStrictEqual({
        mfaRequired: false,
        rule: 'vault-deposit-delegation',
      });
    },
  );
});
