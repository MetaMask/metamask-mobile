import tangemSdk, {
  type Card,
  type Wallet,
  type SignHashResponse,
  type SignHashesResponse,
  type NFCStatusResponse,
  EllipticCurve,
} from 'tangem-sdk-react-native';

export const ETH_DERIVATION_PATH = "m/44'/60'/0'/0/0";

export interface DerivedKey {
  publicKey: string;
  chainCode?: string;
}

export type WalletWithDerivedKeys = Wallet & {
  derivedKeys?: Record<string, DerivedKey>;
};

export type CardWithDerivedKeys = Omit<Card, 'wallets'> & {
  wallets?: WalletWithDerivedKeys[];
};

/**
 * Bridge layer wrapping the Tangem SDK's NFC operations.
 * Each operation triggers a discrete NFC session requiring
 * the user to physically tap their Tangem card.
 */
export class TangemNfcBridge {
  /**
   * Scan a Tangem card via NFC with ETH key derivation.
   * Passes derivationPaths so the card returns the derived
   * public key for m/44'/60'/0'/0/0 alongside the master key.
   */
  async scanCard(): Promise<CardWithDerivedKeys> {
    return (await tangemSdk.scanCard({
      header: 'MetaMask',
      body: 'Hold your Tangem card to the back of your phone',
    })) as CardWithDerivedKeys;
  }

  /**
   * Sign a single hash on the card.
   * Triggers an NFC session; the card performs the signing internally.
   *
   * @param hash - Hex-encoded hash to sign
   * @param walletPublicKey - Public key identifying which wallet on the card to use
   * @param cardId - Unique Tangem card identifier
   * @param hdPath - Optional BIP44 derivation path (COS v4.28+)
   * @returns The signature and card metadata
   */
  async signHash(
    hash: string,
    walletPublicKey: string,
    cardId: string,
    hdPath?: string,
  ): Promise<SignHashResponse> {
    const response = await tangemSdk.signHash(
      hash,
      walletPublicKey,
      cardId,
      hdPath,
      {
        header: 'MetaMask',
        body: 'Hold your Tangem card to sign the transaction',
      },
    );
    return Array.isArray(response) ? response[0] : response;
  }

  /**
   * Sign multiple hashes in a single NFC session.
   * Required for UTXO-style multi-input transactions.
   */
  async signHashes(
    hashes: string[],
    walletPublicKey: string,
    cardId: string,
    hdPath?: string,
  ): Promise<SignHashesResponse> {
    const response = await tangemSdk.signHashes(
      hashes,
      walletPublicKey,
      cardId,
      hdPath,
      {
        header: 'MetaMask',
        body: 'Hold your Tangem card to sign',
      },
    );
    return Array.isArray(response) ? response[0] : response;
  }

  /**
   * Create a new secp256k1 wallet on the card.
   */
  async createWallet(cardId: string) {
    return tangemSdk.createWallet(EllipticCurve.Secp256k1, cardId, {
      header: 'MetaMask',
      body: 'Hold your Tangem card to create a wallet',
    });
  }

  async startSession(): Promise<void> {
    return tangemSdk.startSession();
  }

  async stopSession(): Promise<void> {
    return tangemSdk.stopSession();
  }

  async getNfcStatus(): Promise<NFCStatusResponse> {
    return tangemSdk.getNFCStatus();
  }
}
