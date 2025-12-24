import React, { useState, useEffect, useCallback } from 'react';
import { SafeAreaView, View, TextInput, TouchableOpacity } from 'react-native';
import AntDesignIcon from 'react-native-vector-icons/AntDesign';
import EthereumAddress from '../../../../../../UI/EthereumAddress';
import Engine from '../../../../../../../core/Engine';
import { MetaMetricsEvents } from '../../../../../../../core/Analytics';

import { connect, useSelector } from 'react-redux';
import StyledButton from '../../../../../../UI/StyledButton';
import Text from '../../../../../../../component-library/components/Texts/Text';
import InfoModal from '../../../../../../Base/InfoModal';
import Identicon from '../../../../../../UI/Identicon';
import Feather from 'react-native-vector-icons/Feather';
import { strings } from '../../../../../../../../locales/i18n';
import GlobalAlert from '../../../../../../UI/GlobalAlert';
import { showAlert } from '../../../../../../../actions/alert';
import ClipboardManager from '../../../../../../../core/ClipboardManager';
import Header from '../AddNickNameHeader';
import ShowBlockExplorer from '../ShowBlockExplorer';
import { useTheme } from '../../../../../../../util/theme';
import createStyles from './styles';
import { AddNicknameProps } from './types';
import {
  validateAddressOrENS,
  shouldShowBlockExplorer,
  toChecksumAddress,
} from '../../../../../../../util/address';
import ErrorMessage from '../../../SendFlow/ErrorMessage';
import {
  CONTACT_ALREADY_SAVED,
  SYMBOL_ERROR,
} from '../../../../../../../constants/error';
import { useMetrics } from '../../../../../../../components/hooks/useMetrics';
import { selectInternalAccounts } from '../../../../../../../selectors/accountsController';
import { RootState } from '../../../../../../../reducers';
import { selectAddressBook } from '../../../../../../../selectors/addressBookController';
import { selectIsEvmNetworkSelected } from '../../../../../../../selectors/multichainNetworkController';
import { NetworkType } from '@metamask/controller-utils';

const getAnalyticsParams = () => ({});

const AddNickname = (props: AddNicknameProps) => {
  const {
    closeModal,
    address,
    showModalAlert,
    addressNickname,
    providerType,
    providerChainId,
    providerRpcTarget,
    addressBook,
    internalAccounts,
    networkConfigurations,
  } = props;

  const [newNickname, setNewNickname] = useState(addressNickname);
  const [addressErr, setAddressErr] = useState(null);
  const [addressHasError, setAddressHasError] = useState(false);
  const [errContinue, setErrContinue] = useState<boolean | undefined>(false);
  const [isBlockExplorerVisible, setIsBlockExplorerVisible] = useState(false);
  const [showFullAddress, setShowFullAddress] = useState(false);
  const [shouldDisableButton, setShouldDisableButton] = useState(true);
  const isEvmSelected = useSelector(selectIsEvmNetworkSelected);
  const { colors, themeAppearance } = useTheme();
  const { trackEvent, createEventBuilder } = useMetrics();
  const styles = createStyles(colors);

  const chooseToContinue = () => {
    setAddressHasError(true);
    return setAddressHasError(!addressHasError);
  };

  const validateAddressOrENSFromInput = useCallback(async () => {
    const { addressError, errorContinue } = await validateAddressOrENS(
      address,
      addressBook,
      internalAccounts,
      providerChainId,
    );

    setAddressErr(addressError);
    setErrContinue(errorContinue);
    setAddressHasError(addressError);
  }, [address, addressBook, internalAccounts, providerChainId]);

  useEffect(() => {
    validateAddressOrENSFromInput();
  }, [validateAddressOrENSFromInput]);

  const shouldButtonBeDisabled = useCallback(() => {
    if (!newNickname || addressHasError) {
      return setShouldDisableButton(true);
    }
    return setShouldDisableButton(false);
  }, [newNickname, addressHasError]);

  useEffect(() => {
    shouldButtonBeDisabled();
  }, [shouldButtonBeDisabled]);

  const copyAddress = async () => {
    await ClipboardManager.setString(address);
    showModalAlert({
      isVisible: true,
      autodismiss: 1500,
      content: 'clipboard-alert',
      data: { msg: strings('transactions.address_copied_to_clipboard') },
    });

    trackEvent(
      createEventBuilder(MetaMetricsEvents.CONTRACT_ADDRESS_COPIED)
        .addProperties(getAnalyticsParams())
        .build(),
    );
  };

  const saveTokenNickname = () => {
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { AddressBookController } = Engine.context as any;
    if (!newNickname || !address) return;
    AddressBookController.set(
      toChecksumAddress(address),
      newNickname,
      providerChainId,
    );
    closeModal();
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CONTRACT_ADDRESS_NICKNAME)
        .addProperties(getAnalyticsParams())
        .build(),
    );
  };

  const showFullAddressModal = () => {
    setShowFullAddress(!showFullAddress);
  };

  const toggleBlockExplorer = () => setIsBlockExplorerVisible(true);

  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderErrorMessage = (addressError: any) => {
    let errorMessage = addressError;

    if (addressError === CONTACT_ALREADY_SAVED) {
      errorMessage = strings('address_book.address_already_saved');
    }
    if (addressError === SYMBOL_ERROR) {
      errorMessage = `${
        strings('transaction.tokenContractAddressWarning_1') +
        strings('transaction.tokenContractAddressWarning_2') +
        strings('transaction.tokenContractAddressWarning_3')
      }`;
    }

    return errorMessage;
  };

  const hasBlockExplorer =
    !isEvmSelected || !providerRpcTarget
      ? false
      : shouldShowBlockExplorer(
          providerType as NetworkType,
          providerRpcTarget,
          networkConfigurations,
        );

  return (
    <SafeAreaView style={styles.container}>
      {isBlockExplorerVisible ? (
        <ShowBlockExplorer
          setIsBlockExplorerVisible={setIsBlockExplorerVisible}
          type={providerType}
          address={address}
          headerWrapperStyle={styles.headerWrapper}
          headerTextStyle={styles.headerText}
          iconStyle={styles.icon}
          providerRpcTarget={providerRpcTarget}
          networkConfigurations={{}}
        />
      ) : (
        <>
          <Header
            closeModal={closeModal}
            nicknameExists={!!addressNickname}
            headerWrapperStyle={styles.headerWrapper}
            headerTextStyle={styles.headerText}
            iconStyle={styles.icon}
          />
          <View style={styles.bodyWrapper}>
            {showFullAddress && (
              <InfoModal
                isVisible
                message={address}
                propagateSwipe={false}
                toggleModal={showFullAddressModal}
              />
            )}
            <View style={styles.addressIdenticon}>
              <Identicon address={address} diameter={25} />
            </View>
            <Text style={styles.label}>{strings('nickname.address')}</Text>
            <View style={styles.addressWrapperPrimary}>
              <TouchableOpacity
                style={styles.addressWrapper}
                onPress={copyAddress}
                onLongPress={showFullAddressModal}
              >
                <Feather name="copy" size={18} style={styles.actionIcon} />
                <EthereumAddress
                  address={address}
                  type="mid"
                  style={styles.address}
                />
              </TouchableOpacity>
              {hasBlockExplorer ? (
                <AntDesignIcon
                  style={styles.actionIcon}
                  name="export"
                  size={22}
                  onPress={toggleBlockExplorer}
                />
              ) : null}
            </View>
            <Text style={styles.label}>{strings('nickname.name')}</Text>
            <TextInput
              autoCapitalize={'none'}
              autoCorrect={false}
              onChangeText={setNewNickname}
              placeholder={strings('nickname.name_placeholder')}
              placeholderTextColor={colors.text.muted}
              spellCheck={false}
              numberOfLines={1}
              style={styles.input}
              value={newNickname}
              editable={!addressHasError}
              keyboardAppearance={themeAppearance}
            />
            {addressHasError && (
              <View style={styles.errorContinue}>
                <ErrorMessage
                  errorMessage={renderErrorMessage(addressErr)}
                  errorContinue={!!errContinue}
                  onContinue={chooseToContinue}
                />
              </View>
            )}
          </View>
          <View style={styles.updateButton}>
            <StyledButton
              type={'confirm'}
              disabled={shouldDisableButton}
              onPress={saveTokenNickname}
            >
              {strings('nickname.save_nickname')}
            </StyledButton>
          </View>
          <GlobalAlert />
        </>
      )}
    </SafeAreaView>
  );
};

const mapStateToProps = (state: RootState) => ({
  addressBook: selectAddressBook(state),
  internalAccounts: selectInternalAccounts(state),
});

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapDispatchToProps = (dispatch: any) => ({
  showModalAlert: (config: {
    isVisible: boolean;
    autodismiss: number;
    content: string;
    data: { msg: string };
  }) => dispatch(showAlert(config)),
});

export default connect(mapStateToProps, mapDispatchToProps)(AddNickname);
