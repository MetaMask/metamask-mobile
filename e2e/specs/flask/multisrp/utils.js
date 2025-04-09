import ImportSrpView from '../../../pages/importSrp/ImportSrpView';
import AccountListBottomSheet from '../../../pages/wallet/AccountListBottomSheet';
import AddAccountBottomSheet from '../../../pages/wallet/AddAccountBottomSheet';
import WalletView from '../../../pages/wallet/WalletView';
import Assertions from '../../../utils/Assertions';

export const goToImportSrp = async () => {
  await WalletView.tapIdenticon();
  await Assertions.checkIfVisible(AccountListBottomSheet.accountList);
  await AccountListBottomSheet.tapAddAccountButton();
  await AddAccountBottomSheet.tapImportSrp();
  await Assertions.checkIfVisible(ImportSrpView.container);
};

export const inputSrp = async (mnemonic) => {
  const mnemonicArray = mnemonic.split(' ');
  const numberOfWords = mnemonicArray.length;

  if (numberOfWords === 24) {
    await ImportSrpView.selectNWordSrp(numberOfWords);
  }

  for (const [index, word] of mnemonicArray.entries()) {
    await ImportSrpView.enterSrpWord(index + 1, word);
  }
};
