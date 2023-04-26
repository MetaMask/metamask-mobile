import React from 'react';
import { Alert } from 'react-native';
import { AddressTo } from '../../../UI/AddressInputs';
import { useNavigation } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { createQRScannerNavDetails } from '../../QRScanner';
import { handleNetworkSwitch } from '../../../../util/networks';
import Routes from '../../../../constants/navigation/Routes';
import { selectNetwork } from '../../../../selectors/networkController';
import Engine from '../../../../core/Engine';
import { strings } from '../../../../../locales/i18n';
import { NetworkSwitchErrorType } from '../../../../constants/error';
import { showAlert } from '../../../../actions/alert';
import { STAddressToProps } from '../SendTo/types';

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
  onToSelectedAddressChange,
}: STAddressToProps) => {
  const navigation = useNavigation();
  const dispatch = useDispatch();

  const network = useSelector(selectNetwork);

  const frequentRpcList = useSelector(
    (state: any) =>
      state.engine.backgroundState.PreferencesController.frequentRpcList,
  );

  const showAlertAction = (config: any) => dispatch(showAlert(config));

  const handleNetworkSwitched = (chain_id: string) => {
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
            handleNetworkSwitched(meta.chain_id);
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

export default SendToAddressTo;
