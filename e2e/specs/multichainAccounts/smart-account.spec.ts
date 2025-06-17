'use strict';
import { SmokeWalletPlatform } from '../../tags';
import {
  SimpleKeyPairAccount,
  goToAccountDetails,
  withMultichainAccountDetailsEnabled,
} from './common';
import AccountDetails from '../../pages/MultichainAccounts/AccountDetails';
import DeleteAccount from '../../pages/MultichainAccounts/DeleteAccount';
import Assertions from '../../utils/Assertions';
import Matchers from '../../utils/Matchers';
import WalletView from '../../pages/wallet/WalletView';
import SmartAccount from '../../pages/MultichainAccounts/SmartAccount';
import TestHelpers from '../../helpers';

const toggleSmartAccountSwitch = async () => {
  await AccountDetails.tapConvertToSmartAccount();
  await SmartAccount.tapSmartAccountSwitch();
};

describe(
  SmokeWalletPlatform('Multichain Accounts: Smart account functionality'),
  () => {
    it('converts an account to 7702 smart account', async () => {
      await withMultichainAccountDetailsEnabled(async () => {
        await goToAccountDetails(SimpleKeyPairAccount);
        await toggleSmartAccountSwitch();
      });
    });
  },
);
