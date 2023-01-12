import { When } from "@wdio/cucumber-framework";
import Web3 from "../helpers/Web3";
import WalletMainScreen from '../screen-objects/WalletMainScreen';
import SendScreen from '../screen-objects/SendScreen';
import AmountScreen from '../screen-objects/AmountScreen';
import NetworkApprovalModal from '../screen-objects/Modals/NetworkApprovalModal';
import NetworkEducationModal from '../screen-objects/Modals/NetworkEducationModal';
import ConfirmScreen from '../screen-objects/ConfirmScreen';

When(/^I tap on the Send button/, async () => { // should be in a commons-step file
  await driver.pause(2000);  
  await WalletMainScreen.tapNetworkNavBar();
  
  await NetworkApprovalModal.tapOnNetworkWithName('Goerli Test Network');
  await NetworkEducationModal.tapGotItButton();

  await WalletMainScreen.tapSendIcon();
  await SendScreen.typeAddressInSendAddressField('0xd3B9Cbea7856AECf4A6F7c3F4E8791F79cBeeD62');

  await SendScreen.tapNextButton();

  await driver.pause(2000);

  await AmountScreen.typeAmount('0.01');
  await AmountScreen.tapNextButton();

  await driver.pause(2000);

  await ConfirmScreen.tapSendButton();

  await driver.pause(100000);
});
