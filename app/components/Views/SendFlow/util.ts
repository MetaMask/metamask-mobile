import { toChecksumAddress } from 'ethereumjs-util';
import {useSelector} from 'react-redux';
import {
    selectNetwork,
    selectChainId
  } from '../../../selectors/networkController';

  import {
    validateAddressOrENS,
  } from '../../../util/address';

const identities = useSelector(
    (state: any) =>
      state.engine.backgroundState.PreferencesController.identities,
  );

  const addressBook = useSelector(
    (state: any) =>
    state.engine.backgroundState.AddressBookController.addressBook
    );

    const network = useSelector(selectNetwork);
    const chainId = useSelector(selectChainId);

const getAddressNameFromBookOrIdentities = (toAccount) => {
    if (!toAccount) return;

    const networkAddressBook = addressBook[network] || {};

    const checksummedAddress = toChecksumAddress(toAccount);

    return networkAddressBook[checksummedAddress]
      ? networkAddressBook[checksummedAddress].name
      : identities[checksummedAddress]
      ? identities[checksummedAddress].name
      : null;
  };

    /**
   * This set to the state all the information
   *  that come from validating an ENS or address
   * @param {*} toSelectedAddress - The address or the ens writted on the destination input
   */
  export const validateAddressOrENSFromInput = async ({toAccount}) => {
    console.log(toAccount, 'tosAccount');
    
    const {
      addressError,
      toEnsName,
      addressReady,
      toEnsAddress,
      addToAddressToAddressBook,
      toAddressName,
      errorContinue,
      isOnlyWarning,
      confusableCollection,
    } = await validateAddressOrENS({
      toAccount,
      network,
      addressBook,
      identities,
      chainId,
    });

    return null

    // return {addressError, toEnsName, toSelectedAddressReady: addressReady, toEnsAddressResolved: toEnsAddress, addToAddressToAddressBook, toSelectedAddressName: toAddressName, errorContinue, isOnlyWarning, confusableCollection}
  };

// export const onToSelectedAddressChange = ({toAccount, updateParentState}) => {

//     const addressName = getAddressNameFromBookOrIdentities(toAccount);
    
//     /**
//      * If the address is from addressBook or identities
//      * then validation is not necessary since it was already validated
//      */
//     if (addressName) {
//         updateParentState({toAccount, toSelectedAddressReady: true, isFromAddressBook: true, toSelectedAddressName: addressName})
//     } else {
//       validateAddressOrENSFromInput(toAccount);
//       /**
//        * Because validateAddressOrENSFromInput is an asynchronous function
//        * we are setting the state here synchronously, so it does not block the UI
//        * */
      
//       updateParentState({toAccount, isFromAddressBook: false, toSelectedAddressName: addressName, toSelectedAddressReady: false})
//     }
//   }; 