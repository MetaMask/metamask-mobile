import React from 'react';
import { Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';

import { useNavigation } from '@react-navigation/native';

import { strings } from '../../../../../locales/i18n';
import { showAlert } from '../../../../actions/alert';
import { NetworkSwitchErrorType } from '../../../../constants/error';
import Routes from '../../../../constants/navigation/Routes';
import Engine from '../../../../core/Engine';
import { selectNetwork } from '../../../../selectors/networkController';
import { selectFrequentRpcList } from '../../../../selectors/preferencesController';
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

  const network = useSelector(selectNetwork);

  const frequentRpcList = useSelector(selectFrequentRpcList);

  const showAlertAction = (config: any) => dispatch(showAlert(config));

  const onHandleNetworkSwitch = (chain_id: string) => {
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
