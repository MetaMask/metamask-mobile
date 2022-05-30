import Engine from '../../core/Engine';
import {
  isENS,
  renderSlightlyLongAddress,
  formatAddress,
  isHardwareAccount,
} from '.';

jest.mock('../../core/Engine');
const ENGINE_MOCK = Engine as jest.MockedClass<any>;

ENGINE_MOCK.context = {
  KeyringController: {
    state: {
      keyrings: [
        {
          type: 'Ledger',
          accounts: ['0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272'],
        },
        {
          type: 'QR Hardware Wallet Device',
          accounts: ['0xB4955C0d639D99699Bfd7Ec54d9FaFEe40e4D275'],
        },
      ],
    },
  },
};

describe('isENS', () => {
  it('should return false by default', () => {
    expect(isENS()).toBe(false);
  });
  it('should return true for normal domain', () => {
    expect(isENS('ricky.codes')).toBe(true);
  });
  it('should return true for ens', () => {
    expect(isENS('rickycodes.eth')).toBe(true);
  });
  it('should return true for eth ens', () => {
    expect(isENS('ricky.eth.eth')).toBe(true);
  });
  it('should return true for metamask ens', () => {
    expect(isENS('ricky.metamask.eth')).toBe(true);
  });
});

describe('renderSlightlyLongAddress', () => {
  const mockAddress = '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272';
  it('should return the address when the address do not exist', () => {
    expect(renderSlightlyLongAddress(null)).toBeNull();
  });
  it('should return 5 characters before ellipsis and 4 final characters of the address after the ellipsis', () => {
    expect(renderSlightlyLongAddress(mockAddress).split('.')[0].length).toBe(
      24,
    );
    expect(renderSlightlyLongAddress(mockAddress).split('.')[3].length).toBe(4);
  });
  it('should return 0xC4955 before ellipsis and 4D272 after the ellipsis', () => {
    expect(renderSlightlyLongAddress(mockAddress, 5, 2).split('.')[0]).toBe(
      '0xC4955',
    );
    expect(renderSlightlyLongAddress(mockAddress, 5, 0).split('.')[3]).toBe(
      '4D272',
    );
  });
});

describe('formatAddress', () => {
  const mockAddress = '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272';
  it('should return address formatted for short type', () => {
    const expectedValue = '0xC495...D272';
    expect(formatAddress(mockAddress, 'short')).toBe(expectedValue);
  });
  it('should return address formatted for mid type', () => {
    const expectedValue = '0xC4955C0d639D99699Bfd7E...D272';
    expect(formatAddress(mockAddress, 'mid')).toBe(expectedValue);
  });
});

// eslint-disable-next-line jest/no-disabled-tests
xdescribe('isHardwareAccount,', () => {
  const ledgerMockAddress = '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272';
  const qrHardwareMockAddress = '0xB4955C0d639D99699Bfd7Ec54d9FaFEe40e4D275';

  it('should return true if account is a Ledger keyring', () => {
    expect(isHardwareAccount(ledgerMockAddress)).toBe(true);
  });

  it('should return true if account is a QR keyring', () => {
    expect(isHardwareAccount(qrHardwareMockAddress)).toBe(true);
  });

  it('should return false if account is not a hardware keyring', () => {
    expect(
      isHardwareAccount('0xD5955C0d639D99699Bfd7Ec54d9FaFEe40e4D278'),
    ).toBe(false);
  });
});
