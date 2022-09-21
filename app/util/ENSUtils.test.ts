import { isDefaultAccountName, getEnsProvider } from './ENSUtils';

describe('ENSUtils', () => {
  describe('isDefaultAccountName', () => {
    const accountNameDefaultOne = 'Account 1';
    it('should match RegEx if name "Account 1" has default pattern', () => {
      expect(isDefaultAccountName(accountNameDefaultOne)).toEqual(true);
    });
    const accountNameDefaultTwo = 'Account 99999';
    it('should match RegEx if name "Account 99999" has default pattern', () => {
      expect(isDefaultAccountName(accountNameDefaultTwo)).toEqual(true);
    });
    const accountNameEmpty = '';
    it('should not match RegEx if name is empty', () => {
      expect(isDefaultAccountName(accountNameEmpty)).toEqual(false);
    });
    const accountNameUndefined = undefined;
    it('should not match RegEx if name is undefined', () => {
      expect(isDefaultAccountName(accountNameUndefined)).toEqual(false);
    });
    const accountNameNotDefault = 'Johns Wallet';
    it('should not match RegEx if name does not has default pattern', () => {
      expect(isDefaultAccountName(accountNameNotDefault)).toEqual(false);
    });
  });

  describe('getEnsProvider', () => {
    let provider: any;

    beforeEach(async () => {
      provider = jest.fn();
    });

    it('should return ensProvider if exists', () => {
      const network = '1'; // mainnet
      const ensProvider = getEnsProvider(network, provider);
      const ENS_ADDRESS = '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e';
      expect(ensProvider?._network.name).toEqual('homestead');
      expect(ensProvider?._network.chainId).toEqual(1);
      expect(ensProvider?._network.ensAddress).toEqual(ENS_ADDRESS);
    });

    it('should not return ensProvider if not exist', () => {
      const network = '10'; // does not exist
      expect(!!getEnsProvider(network, provider)).toEqual(false);
    });
  });
});
