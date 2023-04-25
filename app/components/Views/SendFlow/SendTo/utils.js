import { toChecksumAddress } from 'ethereumjs-util';
import {
    validateAddressOrENS,
  } from '../../../../util/address';

    /**
   * This returns the address name from the address book or user accounts if the selectedAddress exist there
   * @param {String} toAccount - Address input
   * @returns {String | null} - Address or null if toAccount is not in the addressBook or identities array
   */
 const getAddressNameFromBookOrIdentities = (toAccount, addressBook, network, identities) => {
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
  const validateAddressOrENSFromInput = async (toAccount, network, identities, addressBook, chainId) => {
    // const { network, addressBook, identities, chainId } = this.props;
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
    })

    return {
        addressError,
        toEnsName,
        addressReady,
        toEnsAddress,
        addToAddressToAddressBook,
        toAddressName,
        errorContinue,
        isOnlyWarning,
        confusableCollection,
    }
  };

export const onToSelectedAddressChange = async (toAccount, addressBook, network, identities, chainId) => {
    if(!toAccount) return;
    const addressName = getAddressNameFromBookOrIdentities(toAccount, addressBook, network, identities);
    /**
     * If the address is from addressBook or identities
     * then validation is not necessary since it was already validated
     */
    if (addressName) {
        return {
            toAccount,
            toSelectedAddressReady: true,
            isFromAddressBook: true,
            toSelectedAddressName: addressName,
        }
    } else {
      const validateInput = await validateAddressOrENSFromInput(toAccount, addressBook, network, identities, chainId);
      /**
       * Because validateAddressOrENSFromInput is an asynchronous function
       * we are setting the state here synchronously, so it does not block the UI
       * */
        return {
            toAccount,
            isFromAddressBook: false,
            ...validateInput,
        }
    }
    };