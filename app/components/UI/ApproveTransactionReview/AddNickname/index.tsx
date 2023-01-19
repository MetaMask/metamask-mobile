import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import AntDesignIcon from 'react-native-vector-icons/AntDesign';
import { fontStyles } from '../../../../styles/common';
import EthereumAddress from '../../EthereumAddress';
import Engine from '../../../../core/Engine';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import AnalyticsV2 from '../../../../util/analyticsV2';

import { toChecksumAddress } from 'ethereumjs-util';
import { connect } from 'react-redux';
import StyledButton from '../../StyledButton';
import Text from '../../../Base/Text';
import InfoModal from '../../Swaps/components/InfoModal';
import { showSimpleNotification } from '../../../../actions/notification';
import Identicon from '../../../UI/Identicon';
import Feather from 'react-native-vector-icons/Feather';
import { strings } from '../../../../../locales/i18n';
import GlobalAlert from '../../../UI/GlobalAlert';
import { showAlert } from '../../../../actions/alert';
import ClipboardManager from '../../../../core/ClipboardManager';
import Header from '../AddNickNameHeader';
import ShowBlockExplorer from '../ShowBlockExplorer';
import { useTheme } from '../../../../util/theme';

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    headerWrapper: {
      position: 'relative',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: 15,
      marginVertical: 5,
      paddingVertical: 10,
    },
    icon: {
      position: 'absolute',
      right: 0,
      padding: 10,
      color: colors.icon.default,
    },
    headerText: {
      color: colors.text.default,
      textAlign: 'center',
      fontSize: 15,
    },
    addressWrapperPrimary: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    addressWrapper: {
      backgroundColor: colors.primary.muted,
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 40,
      paddingVertical: 10,
      paddingHorizontal: 15,
      width: '90%',
    },
    address: {
      fontSize: 12,
      color: colors.text.default,
      letterSpacing: 0.8,
      marginLeft: 10,
    },
    label: {
      fontSize: 14,
      paddingVertical: 12,
      color: colors.text.default,
    },
    input: {
      ...fontStyles.normal,
      fontSize: 12,
      borderColor: colors.border.default,
      borderRadius: 5,
      borderWidth: 2,
      padding: 10,
      flexDirection: 'row',
      alignItems: 'center',
      color: colors.text.default,
    },
    bodyWrapper: {
      marginHorizontal: 20,
      marginBottom: 'auto',
    },
    updateButton: {
      marginHorizontal: 20,
    },
    addressIdenticon: {
      alignItems: 'center',
      marginVertical: 10,
    },
    actionIcon: {
      color: colors.primary.default,
    },
  });

interface AddNicknameProps {
  onUpdateContractNickname: () => void;
  contractAddress: string;
  network: number;
  nicknameExists: boolean;
  nickname: string;
  addressBook: [];
  showModalAlert: (config: any) => void;
  networkState: any;
  type: string;
}

const getAnalyticsParams = () => ({});

const AddNickname = (props: AddNicknameProps) => {
  const {
    onUpdateContractNickname,
    contractAddress,
    nicknameExists,
    nickname,
    showModalAlert,
    networkState: {
      network,
      provider: { type },
    },
  } = props;

  const [newNickname, setNewNickname] = useState(nickname);
  const [isBlockExplorerVisible, setIsBlockExplorerVisible] = useState(false);
  const [showFullAddress, setShowFullAddress] = useState(false);
  const { colors, themeAppearance } = useTheme();
  const styles = createStyles(colors);

  const copyContractAddress = async () => {
    await ClipboardManager.setString(contractAddress);
    showModalAlert({
      isVisible: true,
      autodismiss: 1500,
      content: 'clipboard-alert',
      data: { msg: strings('transactions.address_copied_to_clipboard') },
    });

    AnalyticsV2.trackEvent(
      MetaMetricsEvents.CONTRACT_ADDRESS_COPIED,
      getAnalyticsParams(),
    );
  };

  const saveTokenNickname = () => {
    const { AddressBookController } = Engine.context;
    if (!newNickname || !contractAddress) return;
    AddressBookController.set(
      toChecksumAddress(contractAddress),
      newNickname,
      network,
    );
    onUpdateContractNickname();
    AnalyticsV2.trackEvent(
      MetaMetricsEvents.CONTRACT_ADDRESS_NICKNAME,
      getAnalyticsParams(),
    );
  };

  const showFullAddressModal = () => {
    setShowFullAddress(!showFullAddress);
  };

  const toggleBlockExplorer = () => setIsBlockExplorerVisible(true);

  return (
    <SafeAreaView style={styles.container}>
      {isBlockExplorerVisible ? (
        <ShowBlockExplorer
          setIsBlockExplorerVisible={setIsBlockExplorerVisible}
          type={type}
          contractAddress={contractAddress}
          headerWrapperStyle={styles.headerWrapper}
          headerTextStyle={styles.headerText}
          iconStyle={styles.icon}
        />
      ) : (
        <>
          <Header
            onUpdateContractNickname={onUpdateContractNickname}
            nicknameExists={nicknameExists}
            headerWrapperStyle={styles.headerWrapper}
            headerTextStyle={styles.headerText}
            iconStyle={styles.icon}
          />
          <View style={styles.bodyWrapper} testID={'contract-nickname-view'}>
            {showFullAddress && (
              <InfoModal
                isVisible
                message={contractAddress}
                propagateSwipe={false}
                toggleModal={showFullAddressModal}
              />
            )}
            <View style={styles.addressIdenticon}>
              <Identicon address={contractAddress} diameter={25} />
            </View>
            <Text style={styles.label}>{strings('nickname.address')}</Text>
            <View style={styles.addressWrapperPrimary}>
              <TouchableOpacity
                style={styles.addressWrapper}
                onPress={copyContractAddress}
                onLongPress={showFullAddressModal}
              >
                <Feather name="copy" size={18} style={styles.actionIcon} />
                <EthereumAddress
                  address={contractAddress}
                  type="mid"
                  style={styles.address}
                />
              </TouchableOpacity>
              <AntDesignIcon
                style={styles.actionIcon}
                name="export"
                size={22}
                onPress={toggleBlockExplorer}
              />
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
              testID={'contract-name-input'}
              keyboardAppearance={themeAppearance}
            />
          </View>
          <View style={styles.updateButton}>
            <StyledButton
              type={'confirm'}
              disabled={!newNickname}
              onPress={saveTokenNickname}
              testID={'nickname.save_nickname'}
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

const mapStateToProps = (state: any) => ({
  addressBook: state.engine.backgroundState.AddressBookController.addressBook,
  networkState: state.engine.backgroundState.NetworkController,
});

const mapDispatchToProps = (dispatch: any) => ({
  showModalAlert: (config) => dispatch(showAlert(config)),
  showSimpleNotification: (notification: Notification) =>
    dispatch(showSimpleNotification(notification)),
});

export default connect(mapStateToProps, mapDispatchToProps)(AddNickname);
