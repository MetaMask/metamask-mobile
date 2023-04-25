import React from 'react';
import { Alert } from 'react-native';
import { AddressTo } from '../../../UI/AddressInputs';
import { useNavigation } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { createQRScannerNavDetails } from '../../QRScanner';
import { handleNetworkSwitch } from '../../../../util/networks';
import Routes from '../../../../constants/navigation/Routes';
import { toChecksumAddress } from 'ethereumjs-util';
import {
  selectNetwork,
  selectChainId,
} from '../../../../selectors/networkController';
import { validateAddressOrENS } from '../../../../util/address';
import Engine from '../../../../core/Engine';
import { strings } from '../../../../../locales/i18n';
import { NetworkSwitchErrorType } from '../../../../constants/error';
import { showAlert } from '../../../../actions/alert';

const SendToAddressTo = ({
  inputRef,
  highlighted,
  addressToReady,
  toSelectedAddress,
  toSelectedAddressName,
  onSubmit,
  inputWidth,
  confusableCollectionArray,
  isFromAddressBook,
  updateParentState,
}) => {
  const navigation = useNavigation();
  const dispatch = useDispatch();

  const identities = useSelector(
    (state) => state.engine.backgroundState.PreferencesController.identities,
  );

  const addressBook = useSelector(
    (state) => state.engine.backgroundState.AddressBookController.addressBook,
  );

  const network = useSelector(selectNetwork);
  const chainId = useSelector(selectChainId);

  const frequentRpcList = useSelector(
    (state) =>
      state.engine.backgroundState.PreferencesController.frequentRpcList,
  );

  const showAlertAction = (config) => dispatch(showAlert(config));

  const handleNetworkSwitched = (chain_id) => {
    try {
      const { NetworkController, CurrencyRateController } = Engine.context;
      const networkSwitch = handleNetworkSwitch(chain_id, frequentRpcList, {
        networkController: NetworkController,
        currencyRateController: CurrencyRateController,
      });

      if (!networkSwitch) return;

      showAlertAction({
        isVisible: true,
        autodismiss: 5000,
        content: 'clipboard-alert',
        data: { msg: strings('send.warn_network_change') + network },
      });
    } catch (e) {
      let alertMessage;
      switch (e.message) {
        case NetworkSwitchErrorType.missingNetworkId:
          alertMessage = strings('send.network_missing_id');
          break;
        default:
          alertMessage = strings('send.network_not_found_description', {
            chain_id,
          });
      }
      Alert.alert(strings('send.network_not_found_title'), alertMessage);
    }
  };

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

  const validateAddressOrENSFromInput = async (toAccount) => {
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

    return {
      addressError,
      toEnsName,
      toSelectedAddressReady: addressReady,
      toEnsAddressResolved: toEnsAddress,
      addToAddressToAddressBook,
      toSelectedAddressName: toAddressName,
      errorContinue,
      isOnlyWarning,
      confusableCollection,
    };
  };

  const onToSelectedAddressChange = async (toAccount) => {
    console.log('called');
    const addressName = getAddressNameFromBookOrIdentities(toAccount);

    /**
     * If the address is from addressBook or identities
     * then validation is not necessary since it was already validated
     */
    if (addressName) {
      updateParentState({
        toAccount,
        toSelectedAddressReady: true,
        isFromAddressBook: true,
        toSelectedAddressName: addressName,
      });
    } else {
      const validatedInput = await validateAddressOrENSFromInput(toAccount);
      /**
       * Because validateAddressOrENSFromInput is an asynchronous function
       * we are setting the state here synchronously, so it does not block the UI
       * */

      updateParentState({
        toAccount,
        isFromAddressBook: false,
        ...validatedInput,
      });
    }
  };
  const onScan = () => {
    navigation.navigate(
      ...createQRScannerNavDetails({
        onScanSuccess: (meta) => {
          if (meta.chain_id) {
            handleNetworkSwitched(meta.chain_id);
          }
          if (meta.target_address) {
            const somedata = onToSelectedAddressChange(meta.target_address, addressBook, network, identities, chainId)
            updateParentState({...somedata})
          }
        },
        origin: Routes.SEND_FLOW.SEND_TO,
      }),
    );
  };

  const onToInputFocus = () => {
    updateParentState({ highlighted: !highlighted });
  };
  const onClear = () => onToSelectedAddressChange();

  return (
    <AddressTo
      inputRef={inputRef}
      highlighted={highlighted}
      addressToReady={addressToReady}
      toSelectedAddress={toSelectedAddress}
      toAddressName={toSelectedAddressName}
      onToSelectedAddressChange={onToSelectedAddressChange}
      onScan={onScan}
      onClear={onClear}
      onInputFocus={onToInputFocus}
      onInputBlur={onToInputFocus}
      onSubmit={onSubmit}
      inputWidth={inputWidth}
      confusableCollection={confusableCollectionArray}
      isFromAddressBook={isFromAddressBook}
    />
  );
};

export default SendToAddressTo;
