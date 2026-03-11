import { getRandomBytes } from '../../../core/Encryptor/bytes';
import { Dkls19TssLib } from '@metamask/mfa-wallet-dkls19-lib';
// import { FrostTssLib } from '@metamask/mfa-wallet-frost-lib';

import {
  dkls19Lib as dkls19LibReactNative,
  // frostLib as frostLibReactNative,
} from '@metamask/mpc-libs-react-native/src/wrapper';

import { TSSLibrary, ThresholdKey } from '@metamask/mfa-wallet-interface';
import {
  createScopedSessionId,
  MfaNetworkIdentity,
  MfaNetworkManager,
} from '@metamask/mfa-wallet-network';

import {
  CL24DKM,
  secp256k1,
  edwards25519,
} from '@metamask/mfa-wallet-cl24-lib';

import { keccak_256 } from '@noble/hashes/sha3';
import Logger from '../../../util/Logger';
import {
  getMfaCloudSignerUrl,
  getMfaRelayerUrl,
} from '../../../core/Engine/controllers/mpc-controller/utils';

const CENTRIFUGE_URL = getMfaRelayerUrl();

export enum SupportedProtocols {
  FROST = 'frost',
  DKLS = 'dkls19',
}

export enum SupportedDKMProtocols {
  CL24_SECP256K1 = 'cl24-secp256k1',
  CL24_ED25519 = 'cl24-ed25519',
}

function getCurveForProtocol(dkmProtocol: SupportedDKMProtocols) {
  return dkmProtocol === SupportedDKMProtocols.CL24_SECP256K1
    ? secp256k1
    : edwards25519;
}

/**
 * Creates a DKM instance for the given protocol
 */
function createDKMInstance(dkmProtocol: SupportedDKMProtocols) {
  Logger.log('createDKMInstance', dkmProtocol);
  const cl24 = new CL24DKM(getCurveForProtocol(dkmProtocol), {
    generateRandomBytes: getRandomBytes,
  });
  return cl24;
}

const randomGenerator = {
  generateRandomBytes: getRandomBytes,
};
function createTssInstance(protocol: SupportedProtocols): TSSLibrary {
  Logger.log('dkls19LibReactNative', protocol);

  return new Dkls19TssLib(dkls19LibReactNative, randomGenerator, true);
  // return protocol === SupportedProtocols.FROST
  //   ? new FrostTssLib(frostLibReactNative, randomGenerator)
  //   : new Dkls19TssLib(dkls19LibReactNative, randomGenerator);
}

// single client instance sign
export const createSingleClientSignPromise = async (params: {
  key: ThresholdKey;
  clientSignerIdentity: MfaNetworkIdentity;
  custodians: string[];
  message: Uint8Array;
  sessionNonce: string;
  protocol: SupportedProtocols;
  networkManager: MfaNetworkManager;
  setupData?: Uint8Array;
}) => {
  const {
    key,
    clientSignerIdentity,
    custodians,
    message,
    sessionNonce,
    protocol,
    networkManager,
    setupData,
  } = params;

  const sessionId = createScopedSessionId(custodians, sessionNonce);
  const networkSession = await networkManager.createSession(
    clientSignerIdentity,
    sessionId,
  );

  const tss = createTssInstance(protocol);
  const signature = await tss.sign({
    key,
    signers: [...custodians],
    message,
    networkSession,
    setup: setupData,
  });

  return signature;
};

export const createSingleClientDKMCreatePromise = async (params: {
  clientSignerIdentity: MfaNetworkIdentity;
  networkManager: MfaNetworkManager;
  custodians: string[];
  threshold: number;
  dkmProtocol: SupportedDKMProtocols;
  sessionNonce: string;
  withDKLS19Setup: boolean;
}): Promise<{ clientKey: ThresholdKey; setupData?: Uint8Array }> => {
  const {
    clientSignerIdentity,
    custodians,
    threshold,
    dkmProtocol,
    networkManager,
    sessionNonce,
    withDKLS19Setup,
  } = params;

  const sessionId = createScopedSessionId(custodians, sessionNonce);
  const networkSession = await networkManager.createSession(
    clientSignerIdentity,
    sessionId,
  );
  const dkm = createDKMInstance(dkmProtocol);

  if (withDKLS19Setup) {
    const subsessionCreate = networkSession.createSubsession('create-key');
    const subsessionSetup = networkSession.createSubsession('dkls19-setup');

    const result = await dkm.createKey({
      threshold,
      custodians,
      networkSession: subsessionCreate,
    });

    const dkls19Tss = createTssInstance(SupportedProtocols.DKLS);
    const setupData = await dkls19Tss.setup?.({
      custodians,
      shareIndexes: result.shareIndexes,
      networkSession: subsessionSetup,
    });

    return { clientKey: result, setupData };
  }
  const result = await dkm.createKey({
    threshold,
    custodians,
    networkSession,
  });
  return { clientKey: result };
};

// ============================================================================
// MPC API helpers
// ============================================================================

const DEFAULT_THRESHOLD = 2;

enum MPCStatus {
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

interface MPCStatusResponse {
  status: MPCStatus;
  signature?: number[];
  error?: string;
}

interface CreateKeyResponse {
  sessionId: string;
  serverCustodianId: string;
  status: string;
}

interface SignResponse {
  sessionId: string;
  serverCustodianId: string;
  status: string;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

async function waitForMPCStatus(params: {
  fetchStatus: () => Promise<MPCStatusResponse>;
  sessionId: string;
  timeoutMs?: number;
  pollIntervalMs?: number;
}): Promise<MPCStatusResponse> {
  const {
    fetchStatus,
    sessionId,
    timeoutMs = 30000,
    pollIntervalMs = 1000,
  } = params;

  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const status = await fetchStatus();
    if (
      status.status === MPCStatus.COMPLETED ||
      status.status === MPCStatus.FAILED
    ) {
      return status;
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error(
    `Timeout waiting for MPC operation to complete. SessionId: ${sessionId}`,
  );
}

function createFetchStatusFn(
  baseUrl: string,
  sessionId: string,
): () => Promise<MPCStatusResponse> {
  return async () => {
    const resp = await fetch(`${baseUrl}/status?sessionId=${sessionId}`);
    return resp.json() as Promise<MPCStatusResponse>;
  };
}

// ============================================================================
// Main operation: create key + sign
// ============================================================================

export async function operationTestSign(params: {
  dkmProtocol?: SupportedDKMProtocols;
  protocol?: SupportedProtocols;
  message?: string;
}) {
  const {
    dkmProtocol = SupportedDKMProtocols.CL24_ED25519,
    protocol = SupportedProtocols.FROST,
    message = 'hello world',
  } = params;

  const baseUrl = getMfaCloudSignerUrl();
  // baseUrl: 'http://localhost:3000',
  // baseUrl: 'https://mpc-service.dev-api.cx.metamask.io',
  // baseUrl: 'https://mpc-service-non-enclave.dev-api.cx.metamask.io',

  Logger.log(
    'start operationTestSign',
    baseUrl,
    dkmProtocol,
    protocol,
    message,
  );

  const networkManager = new MfaNetworkManager({
    url: CENTRIFUGE_URL,
    websocket: WebSocket,
    randomBytes: {
      getRandomValues: (array: Uint8Array) => {
        const bytes = getRandomBytes(array.length);
        array.set(bytes);
        return array;
      },
    },
    // getToken: () => generateToken('test'),
  });

  // Step 1: Create client identity
  const clientSignerIdentity = await networkManager.createIdentity();

  // Step 2: Key creation via API
  const nonce = crypto.randomUUID();
  Logger.log('nonce', nonce);

  const withDKLS19Setup = true;
  const createKeyResp = await fetch(`${baseUrl}/create-key`, {
    method: 'POST',
    body: JSON.stringify({
      nonce,
      protocol: dkmProtocol.toString(),
      custodianId: clientSignerIdentity.partyId,
      withDKLS19Setup,
    }),
    headers: { 'Content-Type': 'application/json' },
  });

  Logger.log('createKeyResp', createKeyResp);

  if (createKeyResp.status !== 201) {
    const errorBody = await createKeyResp.text();
    throw new Error(
      `create-key failed: HTTP ${createKeyResp.status}: ${errorBody}`,
    );
  }

  const createKeyBody = (await createKeyResp.json()) as CreateKeyResponse;

  if (createKeyBody.status !== MPCStatus.RUNNING) {
    throw new Error(`Unexpected create-key status: ${createKeyBody.status}`);
  }

  const { serverCustodianId } = createKeyBody;
  const custodians = [clientSignerIdentity.partyId, serverCustodianId];
  const createKeySessionId = createScopedSessionId(custodians, nonce);

  // Step 3: Run client-side DKM
  const { clientKey, setupData } = await createSingleClientDKMCreatePromise({
    clientSignerIdentity,
    networkManager,
    custodians,
    threshold: DEFAULT_THRESHOLD,
    dkmProtocol,
    sessionNonce: nonce,
    withDKLS19Setup,
  });

  Logger.log('clientKey complete', clientKey);

  // Step 4: Wait for server to complete key creation
  const createKeyStatus = await waitForMPCStatus({
    fetchStatus: createFetchStatusFn(baseUrl, createKeySessionId),
    sessionId: createKeySessionId,
  });

  if (createKeyStatus.status !== MPCStatus.COMPLETED) {
    throw new Error(
      `Key creation failed: ${createKeyStatus.error || 'Unknown error'}`,
    );
  }

  Logger.log('Key created successfully. Public key:', clientKey.publicKey);

  Logger.log(
    'Key created successfully. Public key length:',
    clientKey.publicKey.length,
  );

  // Step 5: Sign via API
  const signNonce = crypto.randomUUID();
  const messageBytes = new TextEncoder().encode(message);
  const messageToSign =
    protocol === SupportedProtocols.FROST
      ? messageBytes
      : keccak_256(messageBytes);

  const signResp = await fetch(`${baseUrl}/sign`, {
    method: 'POST',
    body: JSON.stringify({
      protocol,
      nonce: signNonce,
      custodianId: clientSignerIdentity.partyId,
      keyId: createKeySessionId,
      message: uint8ArrayToBase64(messageToSign),
    }),
    headers: { 'Content-Type': 'application/json' },
  });

  if (signResp.status !== 201) {
    const errorBody = await signResp.text();
    throw new Error(`sign failed: HTTP ${signResp.status}: ${errorBody}`);
  }

  const signBody = (await signResp.json()) as SignResponse;

  if (signBody.status !== MPCStatus.RUNNING) {
    throw new Error(`Unexpected sign status: ${signBody.status}`);
  }

  const signServerCustodianId = signBody.serverCustodianId;
  const signCustodians = [clientSignerIdentity.partyId, signServerCustodianId];
  const signSessionId = createScopedSessionId(signCustodians, signNonce);

  // Step 6: Run client-side signing
  const clientSignResult = await createSingleClientSignPromise({
    key: clientKey,
    clientSignerIdentity,
    custodians: signCustodians,
    message: messageToSign,
    sessionNonce: signNonce,
    protocol,
    networkManager,
    setupData,
  });

  // Step 7: Wait for server to complete signing
  const signStatus = await waitForMPCStatus({
    fetchStatus: createFetchStatusFn(baseUrl, signSessionId),
    sessionId: signSessionId,
  });

  if (signStatus.status !== MPCStatus.COMPLETED) {
    throw new Error(`Signing failed: ${signStatus.error || 'Unknown error'}`);
  }

  // Verify client and server signatures match
  if (signStatus.signature) {
    const serverSignature = new Uint8Array(signStatus.signature);
    const clientSignature = clientSignResult.signature;
    if (
      clientSignature.length !== serverSignature.length ||
      !clientSignature.every((byte, idx) => byte === serverSignature[idx])
    ) {
      Logger.error(new Error('Signature mismatch between client and server'));
    }
  }

  Logger.log('Signing completed successfully', clientSignResult);
  return clientSignResult;
}
