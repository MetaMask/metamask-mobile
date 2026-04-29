import ExtendedKeyringTypes from '../../constants/keyringTypes';
import { accountSupports7702 } from './account-supports-7702';

const SAMPLE_ADDRESS = '0x0000000000000000000000000000000000000001';

function createMockKeyringController(keyring: unknown): {
  getKeyringForAccount: jest.Mock;
} {
  return {
    getKeyringForAccount: jest.fn().mockResolvedValue(keyring),
  };
}

describe('accountSupports7702', () => {
  it('returns true when address is undefined', async () => {
    const controller = createMockKeyringController({
      type: ExtendedKeyringTypes.ledger,
    });
    await expect(accountSupports7702(undefined, controller)).resolves.toBe(
      true,
    );
    expect(controller.getKeyringForAccount).not.toHaveBeenCalled();
  });

  it('returns true when address is empty', async () => {
    const controller = createMockKeyringController({
      type: ExtendedKeyringTypes.ledger,
    });
    await expect(accountSupports7702('', controller)).resolves.toBe(true);
    expect(controller.getKeyringForAccount).not.toHaveBeenCalled();
  });

  it('returns true for HD Key Tree keyring', async () => {
    const controller = createMockKeyringController({
      type: ExtendedKeyringTypes.hd,
    });
    await expect(accountSupports7702(SAMPLE_ADDRESS, controller)).resolves.toBe(
      true,
    );
    expect(controller.getKeyringForAccount).toHaveBeenCalledWith(
      SAMPLE_ADDRESS,
    );
  });

  it('returns true for Simple Key Pair keyring', async () => {
    const controller = createMockKeyringController({
      type: ExtendedKeyringTypes.simple,
    });
    await expect(accountSupports7702(SAMPLE_ADDRESS, controller)).resolves.toBe(
      true,
    );
  });

  it('returns false for Ledger hardware keyring', async () => {
    const controller = createMockKeyringController({
      type: ExtendedKeyringTypes.ledger,
    });
    await expect(accountSupports7702(SAMPLE_ADDRESS, controller)).resolves.toBe(
      false,
    );
  });

  it('returns false for QR hardware keyring', async () => {
    const controller = createMockKeyringController({
      type: ExtendedKeyringTypes.qr,
    });
    await expect(accountSupports7702(SAMPLE_ADDRESS, controller)).resolves.toBe(
      false,
    );
  });

  it('returns false when keyring type is not in the allowlist', async () => {
    const controller = createMockKeyringController({
      type: 'Snap Keyring',
    });
    await expect(accountSupports7702(SAMPLE_ADDRESS, controller)).resolves.toBe(
      false,
    );
  });

  it('returns false when keyring has no string type', async () => {
    const controller = createMockKeyringController({ type: 123 });
    await expect(accountSupports7702(SAMPLE_ADDRESS, controller)).resolves.toBe(
      false,
    );
  });

  it('returns false when keyring is null', async () => {
    const controller = createMockKeyringController(null);
    await expect(accountSupports7702(SAMPLE_ADDRESS, controller)).resolves.toBe(
      false,
    );
  });

  it('returns true when getKeyringForAccount throws', async () => {
    const controller = {
      getKeyringForAccount: jest.fn().mockRejectedValue(new Error('not found')),
    };
    await expect(accountSupports7702(SAMPLE_ADDRESS, controller)).resolves.toBe(
      true,
    );
  });

  it('resolves the controller from a getter when a function is passed', async () => {
    const controller = createMockKeyringController({
      type: ExtendedKeyringTypes.hd,
    });
    await expect(
      accountSupports7702(SAMPLE_ADDRESS, () => controller),
    ).resolves.toBe(true);
    expect(controller.getKeyringForAccount).toHaveBeenCalledWith(
      SAMPLE_ADDRESS,
    );
  });
});
