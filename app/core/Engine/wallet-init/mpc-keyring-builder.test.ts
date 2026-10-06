import ExtendedKeyringTypes from '../../../constants/keyringTypes';
import {
  buildMpcKeyringBuilder,
  type MpcKeyringBuilderMessenger,
} from './mpc-keyring-builder';

jest.mock('@metamask/eth-mpc-keyring', () => ({
  MPCKeyring: jest.fn(),
}));

jest.mock('@metamask/mpc-react-native', () => ({
  dkls23Lib: {},
}));

const { MPCKeyring } = jest.requireMock('@metamask/eth-mpc-keyring') as {
  MPCKeyring: jest.Mock;
};

describe('buildMpcKeyringBuilder', () => {
  it('is keyed by the MPC keyring type', () => {
    const builder = buildMpcKeyringBuilder({} as MpcKeyringBuilderMessenger);

    expect(builder.type).toBe(ExtendedKeyringTypes.mpc);
  });

  it('passes the WebSocket constructor into the keyring', () => {
    const builder = buildMpcKeyringBuilder({} as MpcKeyringBuilderMessenger);

    builder();

    expect(MPCKeyring).toHaveBeenCalledWith(
      expect.objectContaining({
        webSocket: globalThis.WebSocket,
        dkls23Lib: {},
      }),
    );
  });
});
