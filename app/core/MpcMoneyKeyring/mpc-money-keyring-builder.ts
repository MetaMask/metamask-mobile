import type {
  KeyringBuilder,
  KeyringV2Builder,
} from '@metamask/keyring-controller';
import {
  MpcMoneyKeyring as MpcMoneyKeyringV2,
  type MpcMoneyKeyringOptions,
} from '@metamask/eth-money-mpc-keyring/v2';
import { MpcMoneyKeyring as RealMpcMoneyKeyring } from '@metamask/eth-money-mpc-keyring';
import {
  getMfaRequirement,
  type MfaWhitelistConfig,
} from '@metamask/money-account-mfa-whitelist';
import { sha256 } from '@noble/hashes/sha2';
import { MpcMoneyKeyring } from './MpcMoneyKeyring';

// Only dev is deployed so far.
const MPC_CLOUD_URL =
  process.env.MM_MONEY_MPC_CLOUD_URL ||
  'https://mpc-service.dev-api.cx.metamask.io/v2';
const MPC_RELAYER_URL =
  process.env.MM_MONEY_MPC_RELAYER_URL ||
  'wss://mfa-relayer.dev-api.cx.metamask.io/connection/websocket';

/**
 * The Money Account contracts on Monad. Signatures that only touch these skip
 * 2FA; without the config, every signature requires it.
 */
export const MPC_MFA_WHITELIST_CONFIG: MfaWhitelistConfig = {
  chainId: '0x8f',
  contracts: {
    DelegationManager: '0xdb9B1e94B5b69Df7e401DDbedE43491141047dB3',
    EIP7702StatelessDeleGatorImpl: '0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B',
    ERC20TransferAmountEnforcer: '0xf100b0819427117EcF76Ed94B358B1A5b5C6D2Fc',
    ExactExecutionBatchEnforcer: '0x1e141e455d08721Dd5BCDA1BaA6Ea5633Afd5017',
    ExactExecutionEnforcer: '0x146713078D39eCC1F5338309c28405ccf85Abfbb',
    LimitedCallsEnforcer: '0x04658B29F6b82ed55274221a06Fc97D318E25416',
    RedeemerEnforcer: '0xE144b0b2618071B4E56f746313528a669c7E65c5',
    TimestampEnforcer: '0x1046bb45C8d673d4ea75321280DB34899413c069',
    ValueLteEnforcer: '0x92Bf12322527cAA612fd31a0e810472BBB106A8F',
  },
  musdTokenAddress: '0xacA92E438df0B2401fF60dA7E4337B687a2435DA',
  chompDelegateAddress: '0xb4827A2a066CD2Ef88560EFdf063dD05C6c41cC7',
  vaults: [
    {
      boringVault: '0xb4563bcD3B7764CCBf497f515585f70B6C3EA5Ae',
      tellerAddress: '0x2D49EA58A4C70b62c8B56DE971310d9e999c8117',
      vedaVaultAdapterAddress: '0xaD4c09d065fDb6320FA8ADf69460CDd9d472C25A',
    },
    {
      boringVault: '0xBFeC8c2b1ccea3931a1363E4CaC27352c1C908B7',
      tellerAddress: '0xB0025a2eBc0474d4F28E975F0D3E70471246ebae',
      vedaVaultAdapterAddress: '0x9AF808DA682aC92AA23CF40509F5A3694445e2b7',
    },
  ],
  cardSignInDomain: 'link.metamask.io',
};

/**
 * Build the V1 keyring builder for the Money MPC keyring stub.
 *
 * The real V1 `MpcMoneyKeyring` from `@metamask/eth-money-mpc-keyring` requires
 * the DKLS23/CL24 WebAssembly libraries and live MPC service endpoints, which
 * mobile is not ready to adopt; the local stub stands in with the same keyring
 * type. When mobile adopts the real V1 keyring this builder will construct it
 * instead.
 *
 * Registration is fenced behind the `MM_MONEY_MPC_KEYRING_ENABLED`
 * compile-time gate rather than unconditional like the Money builder. That is
 * safe only while no released build can hold a Money MPC keyring in its vault,
 * because the controller needs the builder to recognize the type while
 * deserializing the vault. Once any released build can hold one, the fence
 * must be removed.
 *
 * @returns The Money MPC keyring builder.
 */
export function buildMpcMoneyKeyringBuilder(): KeyringBuilder {
  const builder: KeyringBuilder = () => new MpcMoneyKeyring();

  builder.type = MpcMoneyKeyring.type;

  return builder;
}

/**
 * Build the V2 keyring builder for the Money MPC keyring.
 *
 * The V2 adapter comes from `@metamask/eth-money-mpc-keyring/v2` and wraps the
 * legacy keyring passed by the controller (no `entropySource`: the Money MPC
 * keyring has no entropy source of its own). The controller dispatches V2
 * builders by matching against the inner keyring's `type`, so `builder.type`
 * must equal `MpcMoneyKeyring.type`.
 *
 * @returns The Money MPC keyring V2 builder.
 */
export function buildMpcMoneyKeyringV2Builder(): KeyringV2Builder {
  const builder: KeyringV2Builder = Object.assign(
    (keyring: unknown) =>
      new MpcMoneyKeyringV2({
        legacyKeyring: keyring as MpcMoneyKeyringOptions['legacyKeyring'],
      }),
    { type: MpcMoneyKeyring.type },
  );

  return builder;
}

export interface RealMpcMoneyKeyringBuilderOptions {
  /** Returns the profile access token used for the MPC service. */
  getBearerToken: () => Promise<string>;
  /**
   * Returns a one-time 2FA approval for a signature hash. Without it,
   * signatures that need 2FA use the profile token.
   */
  getTwoFactorApproval?: (hash: Uint8Array) => Promise<string>;
  /**
   * Returns a profile token verified with 2FA, for calls that need 2FA
   * without a signature hash, such as restoring the key on a new device.
   * Without it, those calls use the profile token.
   */
  getTwoFactorToken?: () => Promise<string>;
}

let twoFactorTokenProvider: (() => Promise<string>) | undefined;

/**
 * Sets where MPC calls that need 2FA get their token. Without one, they use
 * the bearer token, which the dev MPC service accepts.
 *
 * @param provider - Returns a verification token, or `undefined` to unset.
 */
export const setMpcTwoFactorTokenProvider = (
  provider: (() => Promise<string>) | undefined,
) => {
  twoFactorTokenProvider = provider;
};

// JWT segments are base64url; the React Native `buffer` polyfill only decodes base64.
const getProfileId = (token: string): string => {
  const payload = token.split('.')[1].replaceAll('-', '+').replaceAll('_', '/');
  return (
    JSON.parse(Buffer.from(payload, 'base64').toString('utf8')) as {
      sub: string;
    }
  ).sub;
};

/**
 * Build the V1 keyring builder for the real Money MPC keyring, backed by the
 * DKLS23/CL24 libraries from `@metamask/mpc-react-native` and the MPC service.
 *
 * The profile bearer token is used as the profile token unless a 2FA token
 * provider is set: the dev MPC service does not enforce the 2FA claims yet. The backup encryption key is a
 * placeholder derived from the profile id until its source is decided.
 *
 * @param options - Builder options.
 * @param options.getBearerToken - Returns the profile access token.
 * @param options.getTwoFactorApproval - Returns a 2FA approval for a hash.
 * @param options.getTwoFactorToken - Returns a 2FA-verified profile token.
 * @returns The real Money MPC keyring builder.
 */
export function buildRealMpcMoneyKeyringBuilder({
  getBearerToken,
  getTwoFactorApproval,
  getTwoFactorToken,
}: RealMpcMoneyKeyringBuilderOptions): KeyringBuilder {
  const builder: KeyringBuilder = () => {
    // Loaded lazily so builds without the real keyring never load the native
    // module.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { cl24Lib, dkls23Lib } = require('@metamask/mpc-react-native');
    return new RealMpcMoneyKeyring({
      cl24Lib,
      dkls23Lib,
      cloudURL: MPC_CLOUD_URL,
      relayerURL: MPC_RELAYER_URL,
      getProfileToken: (options?: {
        twoFactor?: boolean;
        challenge?: Uint8Array;
      }) => {
        if (options?.twoFactor && twoFactorTokenProvider) {
          return twoFactorTokenProvider();
        }
        if (options?.twoFactor && options.challenge && getTwoFactorApproval) {
          return getTwoFactorApproval(options.challenge);
        }
        if (options?.twoFactor && !options.challenge && getTwoFactorToken) {
          return getTwoFactorToken();
        }
        return getBearerToken();
      },
      // TODO: replace the placeholder once the backup key source is decided.
      getBackupEncryptionKey: async () =>
        sha256(
          new TextEncoder().encode(
            `mm-mobile-dev-backup:${getProfileId(await getBearerToken())}`,
          ),
        ),
      isMfaRequired: async (request, { address, hash }) =>
        getMfaRequirement(request, {
          address,
          hash,
          config: MPC_MFA_WHITELIST_CONFIG,
        }).mfaRequired,
      webSocket: WebSocket,
    });
  };

  builder.type = RealMpcMoneyKeyring.type;

  return builder;
}
