import { address, getAddressEncoder } from '@solana/addresses';

const MEMO_PROGRAM = getAddressEncoder().encode(
  address('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
);

/** A serialized legacy or v0 transaction with an unsigned payer and short memo instructions. */
export function wireWithMemo(
  memo: string | string[],
  version: 'legacy' | 0 = 'legacy',
): string {
  const memos = Array.isArray(memo) ? memo : [memo];
  if (
    memos.length >= 128 ||
    memos.some((text) => Buffer.byteLength(text) >= 128)
  ) {
    throw new Error('Fixture supports single-byte compact lengths only');
  }
  return Buffer.concat([
    Buffer.from([1]), // One signature slot.
    Buffer.alloc(64),
    ...(version === 0 ? [Buffer.from([0x80])] : []),
    Buffer.from([1, 0, 1, 2]), // One writable signer, one readonly program, two accounts.
    Buffer.alloc(32), // Payer.
    Buffer.from(MEMO_PROGRAM),
    Buffer.alloc(32), // Recent blockhash (base58-encoded as 32 ones).
    Buffer.from([memos.length]),
    ...memos.flatMap((text) => [
      Buffer.from([1, 0, Buffer.byteLength(text)]), // Program index, zero accounts, data length.
      Buffer.from(text),
    ]),
    ...(version === 0 ? [Buffer.from([0])] : []), // No address table lookups.
  ]).toString('base64');
}
