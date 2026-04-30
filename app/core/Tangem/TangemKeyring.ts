import { keccak256, publicToAddress, toChecksumAddress } from 'ethereumjs-util';
import type { TypedTransaction } from '@ethereumjs/tx';
import type { Hex, Json } from '@metamask/utils';
import type { Keyring } from '@metamask/keyring-utils';
import { ETH_DERIVATION_PATH, type TangemNfcBridge } from './TangemNfcBridge';

const HD_PATH_BASE = "m/44'/60'/0'/0";
const ACCOUNTS_PER_PAGE = 5;

export interface TangemAccountDetails {
  hdPath: string;
  walletPublicKey: string;
  index: number;
}

export interface TangemKeyringSerializedState {
  cardId: string;
  walletPublicKey: string;
  derivedPublicKey: string;
  accounts: Hex[];
  accountDetails: Record<string, TangemAccountDetails>;
  hdPath: string;
  page: number;
}

/**
 * Derives an Ethereum address from a compressed/uncompressed secp256k1 public key.
 */
function publicKeyToAddress(publicKeyHex: string): Hex {
  const pubKeyBuf = Buffer.from(publicKeyHex, 'hex');
  const address = publicToAddress(pubKeyBuf, true);
  return toChecksumAddress(`0x${address.toString('hex')}`) as Hex;
}

/**
 * TangemKeyring implements the MetaMask Keyring interface for Tangem NFC hardware wallet cards.
 *
 * Unlike BLE-based keyrings (Ledger), every operation that interacts with the card
 * (account discovery, signing) requires a discrete NFC tap from the user.
 */
export class TangemKeyring implements Keyring {
  static type = 'Tangem Hardware';

  readonly type = TangemKeyring.type;

  bridge: TangemNfcBridge;

  cardId = '';

  walletPublicKey = '';

  /** HD-derived public key at ETH_DERIVATION_PATH, used for address computation */
  derivedPublicKey = '';

  accounts: Hex[] = [];

  accountDetails: Record<string, TangemAccountDetails> = {};

  hdPath = HD_PATH_BASE;

  page = 0;

  perPage = ACCOUNTS_PER_PAGE;

  unlockedAccount = 0;

  constructor({ bridge }: { bridge: TangemNfcBridge }) {
    this.bridge = bridge;
  }

  async serialize(): Promise<Json> {
    return {
      cardId: this.cardId,
      walletPublicKey: this.walletPublicKey,
      derivedPublicKey: this.derivedPublicKey,
      accounts: [...this.accounts],
      accountDetails: { ...this.accountDetails },
      hdPath: this.hdPath,
      page: this.page,
    } as unknown as Json;
  }

  async deserialize(state: Json): Promise<void> {
    const opts = state as unknown as Partial<TangemKeyringSerializedState>;
    this.cardId = opts.cardId ?? '';
    this.walletPublicKey = opts.walletPublicKey ?? '';
    this.derivedPublicKey = opts.derivedPublicKey ?? '';
    this.accounts = (opts.accounts as Hex[]) ?? [];
    this.accountDetails = opts.accountDetails ?? {};
    this.hdPath = opts.hdPath ?? HD_PATH_BASE;
    this.page = opts.page ?? 0;
  }

  async getAccounts(): Promise<Hex[]> {
    return [...this.accounts];
  }

  setAccountToUnlock(index: number): void {
    this.unlockedAccount = index;
  }

  /**
   * Scan the card and populate walletPublicKey + derivedPublicKey.
   * walletPublicKey = master key (identifies the wallet for signing).
   * derivedPublicKey = child key at ETH_DERIVATION_PATH (used for addresses).
   */
  async #ensureScanned(): Promise<void> {
    if (this.cardId && this.walletPublicKey && this.derivedPublicKey) return;

    const card = await this.bridge.scanCard();
    this.cardId = card.cardId;

    const secp256k1Wallet = card.wallets?.find((w) => w.curve === 'secp256k1');
    if (!secp256k1Wallet) {
      throw new Error(
        'No secp256k1 wallet found on Tangem card. Please create one first.',
      );
    }

    this.walletPublicKey = secp256k1Wallet.publicKey;

    const derived = secp256k1Wallet.derivedKeys?.[ETH_DERIVATION_PATH];
    if (derived?.publicKey) {
      this.derivedPublicKey = derived.publicKey;
    } else {
      this.derivedPublicKey = secp256k1Wallet.publicKey;
    }
  }

  /**
   * Add accounts by scanning the Tangem card via NFC.
   * If no card has been scanned yet, triggers a full card scan first.
   */
  async addAccounts(amount = 1): Promise<Hex[]> {
    await this.#ensureScanned();

    const newAccounts: Hex[] = [];
    for (let i = 0; i < amount; i++) {
      const index = this.unlockedAccount;
      const derivationPath = `${this.hdPath}/${index}`;
      const address = publicKeyToAddress(this.derivedPublicKey);

      if (!this.accounts.includes(address)) {
        this.accounts.push(address);
        this.accountDetails[address] = {
          hdPath: derivationPath,
          walletPublicKey: this.walletPublicKey,
          index,
        };
      }
      newAccounts.push(address);
    }

    return newAccounts;
  }

  removeAccount(address: Hex): void {
    this.accounts = this.accounts.filter(
      (a) => a.toLowerCase() !== address.toLowerCase(),
    );
    const lowerAddress = Object.keys(this.accountDetails).find(
      (key) => key.toLowerCase() === address.toLowerCase(),
    );
    if (lowerAddress) {
      delete this.accountDetails[lowerAddress];
    }
  }

  /**
   * Account discovery. Tangem cards expose a single master public key via
   * scanCard(); child keys are derived on-card during signing but their
   * public keys are not available client-side. So discovery returns a
   * single account derived from the master key.
   */
  async getFirstPage(): Promise<
    { address: string; balance: number | null; index: number }[]
  > {
    this.page = 0;
    return this.#getPage(0);
  }

  async getNextPage(): Promise<
    { address: string; balance: number | null; index: number }[]
  > {
    return [];
  }

  async getPreviousPage(): Promise<
    { address: string; balance: number | null; index: number }[]
  > {
    this.page = 0;
    return this.#getPage(0);
  }

  /**
   * Sign an Ethereum transaction. Hashes the transaction and sends
   * the hash to the Tangem card via NFC for on-card signing.
   */
  async signTransaction(
    address: Hex,
    tx: TypedTransaction,
  ): Promise<TypedTransaction> {
    const accountDetail = this.#getAccountDetails(address);
    const msgHash = tx.getHashedMessageToSign();
    const hashHex = Buffer.from(msgHash).toString('hex');

    const result = await this.bridge.signHash(
      hashHex,
      accountDetail.walletPublicKey,
      this.cardId,
      accountDetail.hdPath,
    );

    const sigBuf = Buffer.from(result.signature, 'hex');
    const r = sigBuf.subarray(0, 32);
    const s = sigBuf.subarray(32, 64);

    // Recovery ID needs to be determined; try both 0 and 1
    const { addSignature } = tx;
    if (typeof addSignature === 'function') {
      tx.addSignature(BigInt(0), r, s);
      const sender = tx.getSenderAddress().toString().toLowerCase();
      if (sender !== address.toLowerCase()) {
        tx.addSignature(BigInt(1), r, s);
      }
    }

    return tx;
  }

  /**
   * Sign a raw message hash (eth_sign).
   */
  async signMessage(address: Hex, data: string): Promise<string> {
    const accountDetail = this.#getAccountDetails(address);
    const hash = data.startsWith('0x') ? data.slice(2) : data;

    const result = await this.bridge.signHash(
      hash,
      accountDetail.walletPublicKey,
      this.cardId,
      accountDetail.hdPath,
    );

    return `0x${result.signature}`;
  }

  /**
   * Sign a personal message (personal_sign / EIP-191).
   */
  async signPersonalMessage(address: Hex, message: Hex): Promise<string> {
    const accountDetail = this.#getAccountDetails(address);
    const msgBuf = Buffer.from(
      message.startsWith('0x') ? message.slice(2) : message,
      'hex',
    );
    const prefix = Buffer.from(
      `\u0019Ethereum Signed Message:\n${msgBuf.length}`,
    );
    const hash = keccak256(Buffer.concat([prefix, msgBuf])).toString('hex');

    const result = await this.bridge.signHash(
      hash,
      accountDetail.walletPublicKey,
      this.cardId,
      accountDetail.hdPath,
    );

    return `0x${result.signature}`;
  }

  /**
   * Sign EIP-712 typed data.
   */
  async signTypedData(
    address: Hex,
    typedData: Record<string, unknown>,
    options?: Record<string, unknown>,
  ): Promise<string> {
    const accountDetail = this.#getAccountDetails(address);
    const { TypedDataUtils, SignTypedDataVersion } = await import(
      '@metamask/eth-sig-util'
    );
    const version = (options?.version as string) ?? SignTypedDataVersion.V4;

    const hash = TypedDataUtils.eip712Hash(
      typedData as Parameters<typeof TypedDataUtils.eip712Hash>[0],
      version as SignTypedDataVersion,
    );
    const hashHex = Buffer.from(hash).toString('hex');

    const result = await this.bridge.signHash(
      hashHex,
      accountDetail.walletPublicKey,
      this.cardId,
      accountDetail.hdPath,
    );

    return `0x${result.signature}`;
  }

  forgetDevice(): void {
    this.cardId = '';
    this.walletPublicKey = '';
    this.derivedPublicKey = '';
    this.accounts = [];
    this.accountDetails = {};
    this.page = 0;
    this.unlockedAccount = 0;
  }

  getCardId(): string {
    return this.cardId;
  }

  isConnected(): boolean {
    return this.cardId !== '' && this.walletPublicKey !== '';
  }

  #getAccountDetails(address: Hex): TangemAccountDetails {
    const normalized = Object.keys(this.accountDetails).find(
      (key) => key.toLowerCase() === address.toLowerCase(),
    );
    if (!normalized || !this.accountDetails[normalized]) {
      throw new Error(
        `Tangem keyring: account ${address} not found. Please re-scan your card.`,
      );
    }
    return this.accountDetails[normalized];
  }

  async #getPage(
    _pageNum: number,
  ): Promise<
    { address: string; balance: number | null; index: number }[]
  > {
    await this.#ensureScanned();
    const address = publicKeyToAddress(this.derivedPublicKey);
    return [{ address, balance: null, index: 0 }];
  }
}
