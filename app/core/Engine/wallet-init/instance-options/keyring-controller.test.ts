import { getKeyringControllerInstanceOptions } from './keyring-controller';
import { Encryptor } from '../../../Encryptor';
import { getKeyringBuilders, getKeyringV2Builders } from '../keyrings';
import type { RootMessenger } from '../../types';

jest.mock('../../../Encryptor', () => ({
  Encryptor: jest.fn().mockImplementation(() => ({ name: 'mock-encryptor' })),
  DERIVATION_OPTIONS_MINIMUM_OWASP2023: {
    algorithm: 'pbkdf2-owasp-2023-minimum',
  },
}));

jest.mock('../keyrings', () => ({
  getKeyringBuilders: jest.fn(() => ['v1-builder']),
  getKeyringV2Builders: jest.fn(() => ['v2-builder']),
}));

describe('getKeyringControllerInstanceOptions', () => {
  const messenger = {} as RootMessenger;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('builds options with the encryptor and V1/V2 keyring builders', () => {
    const options = getKeyringControllerInstanceOptions(messenger, false);

    expect(Encryptor).toHaveBeenCalledWith({
      keyDerivationOptions: { algorithm: 'pbkdf2-owasp-2023-minimum' },
    });
    expect(getKeyringBuilders).toHaveBeenCalledWith(messenger, false);
    expect(getKeyringV2Builders).toHaveBeenCalled();
    expect(options).toEqual({
      encryptor: { name: 'mock-encryptor' },
      keyringBuilders: ['v1-builder'],
      keyringV2Builders: ['v2-builder'],
    });
  });
});
