import Modal from 'react-native-modal';
import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';

import { strings } from '../../../../../../locales/i18n';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import ButtonIcon, {
  ButtonIconVariants,
} from '../../../../../component-library/components/Buttons/ButtonIcon';
import Device from '../../../../../util/device';
import Icon from '../../../../../component-library/components/Icons/Icon/Icon';
import {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import TagUrl from '../../../../../component-library/components/Tags/TagUrl';
import { removePermittedAccounts } from '../../../../../core/Permissions';
import { resetRejectionToRequestFromOrigin } from '../../../../../actions/requests';
import { selectSelectedAddress } from '../../../../../selectors/preferencesController';
import { useFavicon } from '../../../../../components/hooks/useFavicon';
import { useTheme } from '../../../../../util/theme';

import useRejectionToRequestFromOriginInfo from '../../hooks/useRejectionToRequestFromOriginInfo';

const createStyles = (colors: any) =>
  StyleSheet.create({
    successContainer: {
      backgroundColor: colors.background.default,
      paddingTop: 24,
      minHeight: '30%',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: Device.isIphoneX() ? 20 : 0,
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    container: {
      backgroundColor: colors.background.default,
      paddingTop: 24,
      minHeight: '60%',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: Device.isIphoneX() ? 20 : 0,
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    buttonContainer: {
      display: 'flex',
      flexDirection: 'row',
      paddingVertical: 24,
      paddingHorizontal: 24,
    },
    buttonDivider: {
      width: 8,
    },
    button: {
      flex: 1,
      marginHorizontal: 8,
    },
    bottomModal: {
      justifyContent: 'flex-end',
      margin: 0,
    },
    title: {
      fontWeight: '700',
      fontSize: 16,
      color: colors.text.default,
    },
    successTitle: {
      fontWeight: '700',
      fontSize: 16,
      color: colors.text.default,
      marginVertical: 24,
    },
    info: {
      fontWeight: '400',
      fontSize: 14,
      color: colors.text.default,
      textAlign: 'center',
      width: '90%',
    },
    tagUrl: {
      marginTop: 8,
      marginBottom: 8,
    },
    closeIcon: {
      position: 'absolute',
      right: 20,
      top: 20,
    },
  });

const DAPPDisconnectModal = () => {
  const { blockedOrigins } = useRejectionToRequestFromOriginInfo();
  const selectedAddress = useSelector(selectSelectedAddress);
  const dispatch = useDispatch();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const faviconSource = useFavicon(blockedOrigins?.[0]);
  const [siteDisconnected, setSiteDisconnected] = useState(false);

  const onCancel = useCallback(
    () => dispatch(resetRejectionToRequestFromOrigin(blockedOrigins[0])),
    [blockedOrigins, dispatch],
  );

  const onDisconnect = useCallback(() => {
    dispatch(resetRejectionToRequestFromOrigin(blockedOrigins[0]));
    removePermittedAccounts(blockedOrigins[0], [selectedAddress]);
    setSiteDisconnected(true);
  }, [blockedOrigins, dispatch, selectedAddress]);

  const onModalClose = useCallback(() => {
    if (siteDisconnected) {
      setSiteDisconnected(false);
    } else {
      onCancel();
    }
  }, [setSiteDisconnected, siteDisconnected, onCancel]);

  if (!blockedOrigins.length && !siteDisconnected) {
    return null;
  }

  return (
    <Modal
      isVisible
      animationIn="slideInUp"
      animationOut="slideOutDown"
      style={styles.bottomModal}
      backdropColor={colors.overlay.default}
      backdropOpacity={1}
      animationInTiming={600}
      animationOutTiming={600}
      onBackButtonPress={onModalClose}
      onSwipeComplete={onModalClose}
      swipeDirection={'down'}
      propagateSwipe
    >
      {siteDisconnected ? (
        <View style={styles.successContainer}>
          <Icon
            name={IconName.CheckBoxOn}
            color={IconColor.Success}
            size={IconSize.Xl}
          />
          <ButtonIcon
            variant={ButtonIconVariants.Secondary}
            style={styles.closeIcon}
            iconName={IconName.Close}
            onPress={() => setSiteDisconnected(false)}
          />
          <Text style={styles.successTitle}>
            {strings('disconnect_modal.success_title')}
          </Text>
          <Text style={styles.info}>
            {strings('disconnect_modal.success_info')}
          </Text>
          <View style={styles.buttonContainer}>
            <Button
              variant={ButtonVariants.Primary}
              onPress={() => setSiteDisconnected(false)}
              label={strings('disconnect_modal.got_it')}
              size={ButtonSize.Lg}
              style={styles.button}
            />
          </View>
        </View>
      ) : (
        <View style={styles.container}>
          <Icon
            name={IconName.Danger}
            color={IconColor.Warning}
            size={IconSize.Xl}
          />
          <Text style={styles.title}>{strings('disconnect_modal.title')}</Text>
          <TagUrl
            imageSource={faviconSource}
            label={blockedOrigins[0]}
            style={styles.tagUrl}
          />
          <Text style={styles.info}>{strings('disconnect_modal.info_1')}</Text>
          <Text style={styles.info}>{strings('disconnect_modal.info_2')}</Text>
          <View style={styles.buttonContainer}>
            <Button
              variant={ButtonVariants.Secondary}
              onPress={onCancel}
              label={strings('disconnect_modal.cancel_cta')}
              size={ButtonSize.Lg}
              style={styles.button}
            />
            <View style={styles.buttonDivider} />
            <Button
              variant={ButtonVariants.Primary}
              onPress={onDisconnect}
              label={strings('disconnect_modal.disconnect_cta')}
              size={ButtonSize.Lg}
              style={styles.button}
            />
          </View>
        </View>
      )}
    </Modal>
  );
};

export default DAPPDisconnectModal;
