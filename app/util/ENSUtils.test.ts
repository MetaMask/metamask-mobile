import {
  isDefaultAccountName,
  doENSReverseLookup
} from './ENSUtils';
import sinon from 'sinon';
import Engine from '../core/Engine';

describe('ENSUtils', () => {
  beforeEach(function () {
    // currentChainId = '0x3';
    // getCurrentChainId = () => currentChainId;
    // onNetworkDidChange = sinon.spy();
    // sinon.replace(Engine.context.NetworkController, "provider", sinon.fake());

  });
  afterEach(function () {
    sinon.restore();
  });
  
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
  describe('doENSReverseLookup', () => {
    const accountNameDefaultOne = 'Account 1';
    it.only('runs', () => {
      const network = '1'
      const address = ''
      console.log('***1')
      doENSReverseLookup(address, network)
      expect(1).toEqual(2);
    });
  });
  describe('doENSLookup', () => {
    const accountNameDefaultOne = 'Account 1';
    it('', () => {
      expect(isDefaultAccountName(accountNameDefaultOne)).toEqual(true);
    });
  });
})
