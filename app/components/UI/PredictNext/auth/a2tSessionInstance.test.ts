import { HandlerType } from '@metamask/snaps-utils';

import Engine from '../../../../core/Engine';
import { handleSnapRequest } from '../../../../core/Snaps/utils';
import {
  deleteKalshiDeviceKey,
  ensureKalshiDeviceKey,
  getKalshiDeviceKey,
  signWithKalshiDeviceKey,
  type KalshiDevicePublicMaterial,
} from './kalshiDeviceKey';
import { a2tSession, deleteKalshiTradingSession } from './a2tSessionInstance';

jest.mock('react-native-device-info', () => ({
  isEmulatorSync: () => true,
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    AuthenticationController: {
      getBearerToken: jest.fn(async () => 'mm-token'),
    },
  },
  controllerMessenger: {},
}));

jest.mock('../../../../core/Snaps/utils', () => ({
  handleSnapRequest: jest.fn(),
}));

jest.mock('../../../../selectors/identity', () => ({
  selectCanonicalProfileId: jest.fn(() => 'profile-1'),
}));

jest.mock('../../../../selectors/keyringController', () => ({
  selectIsUnlocked: jest.fn(() => true),
}));

jest.mock('../../../../store', () => ({
  store: { getState: jest.fn(() => ({})) },
}));

jest.mock('../selectors/predictConfig', () => ({
  selectPredictConfig: jest.fn(() => ({})),
}));

jest.mock('./a2tIssuerUrl', () => ({
  resolveA2tIssuerUrl: jest.fn(() => 'https://issuer.example'),
}));

jest.mock('./kalshiDeviceKey', () => ({
  ensureKalshiDeviceKey: jest.fn(),
  getKalshiDeviceKey: jest.fn(),
  signWithKalshiDeviceKey: jest.fn(),
  deleteKalshiDeviceKey: jest.fn(),
  kalshiDeviceKeyCommitment: () => 'device-nonce',
}));

const SRP_IDENTIFIER = '0xabc';
const CHALLENGE_ID = '11111111-1111-4111-8111-111111111111';
const device: KalshiDevicePublicMaterial = {
  publicRaw: Uint8Array.from([0x04]),
  publicKey: 'device-public-key',
  saltRaw: Uint8Array.from([1]),
  salt: 'device-salt',
};

const jwtPart = (value: unknown): string =>
  Buffer.from(JSON.stringify(value))
    .toString('base64')
    .replace(/\+/gu, '-')
    .replace(/\//gu, '_')
    .replace(/[=]+$/u, '');

const ISSUED_AT = 1_700_000_000;
const EXPIRES_AT = ISSUED_AT + 900;
const issuedToken = `${jwtPart({ alg: 'ES256', typ: 'JWT' })}.${jwtPart({
  sub: 'profile-1',
  iat: ISSUED_AT,
  exp: EXPIRES_AT,
  nonce: 'device-nonce',
})}.sig`;

const jsonResponse = (body: unknown): Response =>
  ({
    ok: true,
    status: 200,
    json: jest.fn().mockResolvedValue(body),
  }) as unknown as Response;

describe('a2tSession', () => {
  const handleSnapRequestMock = handleSnapRequest as jest.MockedFunction<
    typeof handleSnapRequest
  >;

  beforeEach(() => {
    (ensureKalshiDeviceKey as jest.Mock).mockResolvedValue(device);
    (getKalshiDeviceKey as jest.Mock).mockReturnValue(device);
    (signWithKalshiDeviceKey as jest.Mock).mockReturnValue(
      Uint8Array.from({ length: 64 }, () => 7),
    );
    handleSnapRequestMock.mockImplementation(async (_messenger, args) => {
      if (args.request.method === 'getPublicKey') {
        return SRP_IDENTIFIER;
      }
      if (args.request.method === 'signMessage') {
        return '0xsignature';
      }
      throw new Error(`Unexpected snap method ${args.request.method}`);
    });
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          challengeId: CHALLENGE_ID,
          srpMessage: `metamask:nonce-1:${SRP_IDENTIFIER}`,
          expiresIn: 120,
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          a2t: issuedToken,
          exp: EXPIRES_AT,
          profileId: 'profile-1',
        }),
      ) as unknown as typeof fetch;
  });

  afterEach(() => {
    a2tSession.clear();
    jest.clearAllMocks();
  });

  it('asks the message-signing snap for the SRP key and signature through onRpcRequest', async () => {
    const a2t = await a2tSession.ensureA2T();

    expect(a2t).toBe(issuedToken);
    expect(handleSnapRequestMock).toHaveBeenNthCalledWith(
      1,
      Engine.controllerMessenger,
      {
        snapId: 'npm:@metamask/message-signing-snap',
        origin: 'metamask',
        handler: HandlerType.OnRpcRequest,
        request: { method: 'getPublicKey' },
      },
    );
    expect(handleSnapRequestMock).toHaveBeenNthCalledWith(
      2,
      Engine.controllerMessenger,
      {
        snapId: 'npm:@metamask/message-signing-snap',
        origin: 'metamask',
        handler: HandlerType.OnRpcRequest,
        request: {
          method: 'signMessage',
          params: { message: `metamask:nonce-1:${SRP_IDENTIFIER}` },
        },
      },
    );
  });

  it('drops the cached A2T before deleting the device key', async () => {
    const clearSpy = jest.spyOn(a2tSession, 'clear');

    await deleteKalshiTradingSession();

    expect(clearSpy).toHaveBeenCalledTimes(1);
    expect(deleteKalshiDeviceKey).toHaveBeenCalledTimes(1);
    expect(clearSpy.mock.invocationCallOrder[0]).toBeLessThan(
      jest.mocked(deleteKalshiDeviceKey).mock.invocationCallOrder[0],
    );
  });
});
