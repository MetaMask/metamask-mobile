import Engine from '../Engine';
import Logger from '../../util/Logger';
import { trustPasskey } from './trustPasskey';

jest.mock('../Engine', () => ({
  context: {
    MfaRecoveryController: { trustIdentifier: jest.fn() },
  },
}));

jest.mock('../../util/Logger', () => ({ error: jest.fn() }));

const trustIdentifier = jest.mocked(
  Engine.context.MfaRecoveryController.trustIdentifier,
);

describe('trustPasskey', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('records the passkey', async () => {
    trustIdentifier.mockResolvedValue(undefined);

    await trustPasskey('att');

    expect(trustIdentifier).toHaveBeenCalledWith({
      type: 'passkey',
      attestationObject: 'att',
    });
  });

  it('logs instead of failing the enrollment when recording fails', async () => {
    trustIdentifier.mockRejectedValue(new Error('offline'));

    await trustPasskey('att');

    expect(Logger.error).toHaveBeenCalledWith(new Error('offline'), {
      tags: { feature: 'mfa' },
    });
  });
});
