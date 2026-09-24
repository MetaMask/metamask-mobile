import { Wallet, ethers } from 'ethers';
import { Hex } from '@metamask/utils';
import {
  BATCH_DEFAULT_MODE,
  getDeleGatorEnvironment,
  getDelegationHashOffchain,
  type Delegation,
} from '../../../core/Delegation';
import {
  buildMigrationExecutionContexts,
  buildMigrationRedemption,
  getMusdAmountForShares,
  signDelegationWithPrivateKey,
} from './MoneyAccountMigrationDelegatedBatch';

const SOURCE = '0x1111111111111111111111111111111111111111' as Hex;
const DESTINATION = '0x2222222222222222222222222222222222222222' as Hex;
const SUBMITTER = '0x3333333333333333333333333333333333333333' as Hex;
const MUSD = '0x4444444444444444444444444444444444444444' as Hex;
const BORING_VAULT = '0x5555555555555555555555555555555555555555' as Hex;
const TELLER = '0x6666666666666666666666666666666666666666' as Hex;
const CHAIN_ID = '0x8f' as Hex;
const B_PRIVATE_KEY =
  '0x0123456789012345678901234567890123456789012345678901234567890123';
const B_ADDRESS = new Wallet(B_PRIVATE_KEY).address as Hex;

const environment = getDeleGatorEnvironment(Number(CHAIN_ID));

const signedSourceDelegation = (delegate = B_ADDRESS): Delegation => ({
  delegate,
  delegator: SOURCE,
  authority:
    '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
  caveats: [],
  salt: '0x01',
  signature: `0x${'11'.repeat(65)}`,
});

describe('MoneyAccountMigrationDelegatedBatch', () => {
  it('converts all vmUSD shares to the quoted mUSD amount', () => {
    expect(getMusdAmountForShares(5_000_000n, 1_100_000n)).toBe(5_500_000n);
  });

  it('builds the ordered A and B execution contexts', () => {
    const contexts = buildMigrationExecutionContexts({
      source: SOURCE,
      destination: B_ADDRESS,
      musdAddress: MUSD,
      boringVault: BORING_VAULT,
      tellerAddress: TELLER,
      vmUsdShares: 5_000_000n,
      musdAmount: 5_500_000n,
      minimumMint: 4_990_000n,
    });
    const erc20 = new ethers.utils.Interface([
      'function approve(address spender, uint256 amount)',
      'function transfer(address to, uint256 amount)',
    ]);
    const teller = new ethers.utils.Interface([
      'function withdraw(address withdrawAsset, uint256 shareAmount, uint256 minimumAssets, address to)',
      'function deposit(address depositAsset, uint256 depositAmount, uint256 minimumMint, address referralAddress)',
    ]);

    expect(contexts.sourceExecutions.map(({ target }) => target)).toEqual([
      TELLER,
      MUSD,
    ]);
    expect(contexts.destinationExecutions.map(({ target }) => target)).toEqual([
      MUSD,
      TELLER,
    ]);
    expect(contexts.sourceExecutions[0].callData).toBe(
      teller.encodeFunctionData('withdraw', [
        MUSD,
        '5000000',
        '5500000',
        SOURCE,
      ]),
    );
    expect(contexts.sourceExecutions[1].callData).toBe(
      erc20.encodeFunctionData('transfer', [B_ADDRESS, '5500000']),
    );
    expect(contexts.destinationExecutions[0].callData).toBe(
      erc20.encodeFunctionData('approve', [BORING_VAULT, '5500000']),
    );
    expect(contexts.destinationExecutions[1].callData).toBe(
      teller.encodeFunctionData('deposit', [
        MUSD,
        '5500000',
        '4990000',
        ethers.constants.AddressZero,
      ]),
    );
  });

  it('builds two B-submittable delegation contexts with exact execution caveats', async () => {
    const result = await buildMigrationRedemption({
      chainId: CHAIN_ID,
      environment,
      sourceDelegation: signedSourceDelegation(),
      source: SOURCE,
      destination: B_ADDRESS,
      submitter: SUBMITTER,
      bPrivateKey: B_PRIVATE_KEY,
      contexts: buildMigrationExecutionContexts({
        source: SOURCE,
        destination: B_ADDRESS,
        musdAddress: MUSD,
        boringVault: BORING_VAULT,
        tellerAddress: TELLER,
        vmUsdShares: 5_000_000n,
        musdAmount: 5_500_000n,
        minimumMint: 4_990_000n,
      }),
    });

    expect(result.delegations).toHaveLength(2);
    expect(result.delegations[0]).toHaveLength(2);
    expect(result.delegations[0][1].authority).toBe(
      getDelegationHashOffchain(signedSourceDelegation()),
    );
    expect(result.delegations[1][0].authority).toBe(
      '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
    );
    expect(result.delegations.flat().every(({ signature }) => signature !== '0x')).toBe(
      true,
    );
    expect(result.modes).toEqual([BATCH_DEFAULT_MODE, BATCH_DEFAULT_MODE]);
    expect(result.transactionData).toMatch(/^0x[0-9a-f]+$/u);
  });

  it('signs a delegation using the supplied private key', async () => {
    const wallet = new Wallet(B_PRIVATE_KEY);
    const delegation = {
      ...signedSourceDelegation(),
      delegate: SUBMITTER,
      delegator: wallet.address as Hex,
      signature: '0x',
    };

    const signature = await signDelegationWithPrivateKey({
      chainId: CHAIN_ID,
      environment,
      delegation,
      privateKey: B_PRIVATE_KEY,
    });

    expect(signature).toMatch(/^0x[0-9a-f]+$/u);
  });
});
