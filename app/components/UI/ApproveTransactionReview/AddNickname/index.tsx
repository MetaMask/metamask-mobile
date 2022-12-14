import React, { useState } from 'react';
import { SafeAreaView, View, TextInput, TouchableOpacity } from 'react-native';
import AntDesignIcon from 'react-native-vector-icons/AntDesign';
import EthereumAddress from '../../EthereumAddress';
import Engine from '../../../../core/Engine';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { trackEvent } from '../../../../util/analyticsV2';
import { toChecksumAddress } from 'ethereumjs-util';
import { connect } from 'react-redux';
import StyledButton from '../../StyledButton';
import Text from '../../../../component-library/components/Texts/Text';
import InfoModal from '../../Swaps/components/InfoModal';
import Identicon from '../../../UI/Identicon';
import Feather from 'react-native-vector-icons/Feather';
import { strings } from '../../../../../locales/i18n';
import GlobalAlert from '../../../UI/GlobalAlert';
import { showAlert } from '../../../../actions/alert';
import ClipboardManager from '../../../../core/ClipboardManager';
import Header from '../AddNickNameHeader';
import ShowBlockExplorer from '../ShowBlockExplorer';
import { useTheme } from '../../../../util/theme';
import createStyles from './styles';
import { AddNicknameProps } from './types';

const getAnalyticsParams = () => ({});

const AddNickname = (props: AddNicknameProps) => {
  const {
    closeModal,
    address,
    showModalAlert,
    addressNickname,
    networkState: {
      network,
      providerConfig: { type },
    },
  } = props;

  const [newNickname, setNewNickname] = useState(addressNickname);
  const [isBlockExplorerVisible, setIsBlockExplorerVisible] = useState(false);
  const [showFullAddress, setShowFullAddress] = useState(false);
  const { colors, themeAppearance } = useTheme();
  const styles = createStyles(colors);

  const copyaddress = async () => {
    await ClipboardManager.setString(address);
    showModalAlert({
      isVisible: true,
      autodismiss: 1500,
      content: 'clipboard-alert',
      data: { msg: strings('transactions.address_copied_to_clipboard') },
    });

    trackEvent(MetaMetricsEvents.CONTRACT_ADDRESS_COPIED, getAnalyticsParams());
  };

  const saveTokenNickname = () => {
    const { AddressBookController } = Engine.context as any;
    if (!newNickname || !address) return;
    AddressBookController.set(toChecksumAddress(address), newNickname, network);
    closeModal();
    trackEvent(      MetaMetricsEvents.CONTRACT_ADDRESS_NICKNAME,
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
          address={address}
          headerWrapperStyle={styles.headerWrapper}
          headerTextStyle={styles.headerText}
          iconStyle={styles.icon}
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
          <View style={styles.bodyWrapper} testID={'contract-nickname-view'}>
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
                onPress={copyaddress}
                onLongPress={showFullAddressModal}
              >
                <Feather name="copy" size={18} style={styles.actionIcon} />
                <EthereumAddress
                  address={address}
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
  networkState: state.engine.backgroundState.NetworkController,
});

const mapDispatchToProps = (dispatch: any) => ({
  showModalAlert: (config: {
    isVisible: boolean;
    autodismiss: number;
    content: string;
    data: { msg: string };
  }) => dispatch(showAlert(config)),
});

export default connect(mapStateToProps, mapDispatchToProps)(AddNickname);
