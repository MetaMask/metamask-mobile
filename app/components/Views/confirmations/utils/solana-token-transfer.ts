import { base58 } from 'ethers/lib/utils';
import { INFURA_PROJECT_ID } from '../../../../constants/network';

const SOLANA_RPC_URL = `https://solana-mainnet.infura.io/v3/${INFURA_PROJECT_ID}`;

const SIGNATURE_LENGTH = 64;
const TRANSFER_CHECKED_INSTRUCTION = 12;

interface TokenAccount {
  address: string;
  programId: string;
}

/**
 * Build an unsigned legacy Solana transaction that transfers a token from the
 * owner's token account back to itself, as a stand-in for a purchase that
 * spends the token.
 *
 * Built by hand to avoid a Solana SDK dependency. All counts are below 128, so
 * every compact-u16 length fits in a single byte.
 *
 * @param options - Transfer options.
 * @param options.amount - Raw token amount.
 * @param options.decimals - Token decimals.
 * @param options.mint - Token mint address.
 * @param options.owner - Owner and fee payer address.
 * @returns The base64 encoded unsigned transaction.
 */
export async function buildSolanaTokenSelfTransfer({
  amount,
  decimals,
  mint,
  owner,
}: {
  amount: number;
  decimals: number;
  mint: string;
  owner: string;
}): Promise<string> {
  const [tokenAccount, blockhash] = await Promise.all([
    getTokenAccount(owner, mint),
    getLatestBlockhash(),
  ]);

  // Signer and writable first, then writable, then read-only.
  const accountKeys = [owner, tokenAccount.address, mint, tokenAccount.programId];

  // Source, mint, destination, owner.
  const instructionAccounts = [1, 2, 1, 0];
  const instructionData = [
    TRANSFER_CHECKED_INSTRUCTION,
    ...encodeU64(amount),
    decimals,
  ];

  const message = [
    // Header: one signer, no read-only signers, two read-only accounts.
    1,
    0,
    2,
    accountKeys.length,
    ...accountKeys.flatMap((key) => [...base58.decode(key)]),
    ...base58.decode(blockhash),
    // One instruction using the token program.
    1,
    3,
    instructionAccounts.length,
    ...instructionAccounts,
    instructionData.length,
    ...instructionData,
  ];

  const transaction = Uint8Array.from([
    1,
    ...new Array(SIGNATURE_LENGTH).fill(0),
    ...message,
  ]);

  return Buffer.from(transaction).toString('base64');
}

async function getTokenAccount(
  owner: string,
  mint: string,
): Promise<TokenAccount> {
  const result = await solanaRpc<{
    value: { account: { owner: string }; pubkey: string }[];
  }>('getTokenAccountsByOwner', [
    owner,
    { mint },
    { commitment: 'confirmed', encoding: 'jsonParsed' },
  ]);

  const [tokenAccount] = result.value;

  if (!tokenAccount) {
    throw new Error(`No token account for mint ${mint}`);
  }

  return {
    address: tokenAccount.pubkey,
    programId: tokenAccount.account.owner,
  };
}

async function getLatestBlockhash(): Promise<string> {
  const result = await solanaRpc<{ value: { blockhash: string } }>(
    'getLatestBlockhash',
    [{ commitment: 'confirmed' }],
  );

  return result.value.blockhash;
}

async function solanaRpc<Result>(
  method: string,
  params: unknown[],
): Promise<Result> {
  const response = await fetch(SOLANA_RPC_URL, {
    body: JSON.stringify({ id: 1, jsonrpc: '2.0', method, params }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });

  const { error, result } = await response.json();

  if (error) {
    throw new Error(`Solana RPC ${method} failed: ${error.message}`);
  }

  return result;
}

function encodeU64(value: number): number[] {
  const bytes = [];
  let remaining = value;

  for (let i = 0; i < 8; i++) {
    bytes.push(remaining % 256);
    remaining = Math.floor(remaining / 256);
  }

  return bytes;
}
