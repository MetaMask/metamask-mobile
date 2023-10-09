import React from 'react';
import { Alert } from 'react-native';
import { useDispatch } from 'react-redux';

import { useNavigation } from '@react-navigation/native';

import { strings } from '../../../../../locales/i18n';
import { showAlert } from '../../../../actions/alert';
import { NetworkSwitchErrorType } from '../../../../constants/error';
import Routes from '../../../../constants/navigation/Routes';
import { handleNetworkSwitch } from '../../../../util/networks';
import { AddressTo } from '../../../UI/AddressInputs';
import { createQRScannerNavDetails } from '../../QRScanner';
import { SFAddressToProps } from './AddressTo.types';

const SendFlowAddressTo = ({
  addressToReady,
  confusableCollectionArray,
  highlighted,
  inputRef,
  inputWidth,
  isFromAddressBook,
  onSubmit,
  onToSelectedAddressChange,
  toSelectedAddress,
  toSelectedAddressName,
  updateParentState,
}: SFAddressToProps) => {
  const navigation = useNavigation();
  const dispatch = useDispatch();

  const showAlertAction = (config: any) => dispatch(showAlert(config));

  const onHandleNetworkSwitch = (chain_id: string) => {
    try {
      const networkName = handleNetworkSwitch(chain_id);

      if (!networkName) return;

      showAlertAction({
        isVisible: true,
        autodismiss: 5000,
        content: 'clipboard-alert',
        data: { msg: strings('send.warn_network_change') + networkName },
      });
    } catch (e: any) {
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

  const onScan = () => {
    navigation.navigate(
      ...createQRScannerNavDetails({
        onScanSuccess: (meta) => {
          if (meta.chain_id) {
            onHandleNetworkSwitch(meta.chain_id);
          }
          if (meta.target_address) {
            onToSelectedAddressChange(meta.target_address);
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

export default SendFlowAddressTo;
