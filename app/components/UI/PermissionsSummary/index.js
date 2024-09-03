import React from 'react';
import PropTypes from 'prop-types';
import StyledButton from '../StyledButton';
import { StyleSheet, View } from 'react-native';
import { strings } from '../../../../locales/i18n';
import Device from '../../../util/device';
import Text from '../../Base/Text';
import { useTheme } from '../../../util/theme';
import { CommonSelectorsIDs } from '../../../../e2e/selectors/Common.selectors';
import Avatar, {
  AvatarSize,
  AvatarVariant,
} from '../../../component-library/components/Avatars/Avatar';
import { IconName } from '../../../component-library/components/Icons/Icon';
import TextComponent, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import AvatarGroup from '../../../component-library/components/Avatars/AvatarGroup';
import { SAMPLE_AVATARGROUP_PROPS } from '../../../component-library/components/Avatars/AvatarGroup/AvatarGroup.constants';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
import { getHost } from '../../../util/browser';
import WebsiteIcon from '../WebsiteIcon';

const createStyles = (colors) =>
  StyleSheet.create({
    mainContainer: {
      backgroundColor: colors.background.default,
      paddingTop: 24,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      minHeight: 200,
      paddingBottom: Device.isIphoneX() ? 20 : 0,
    },
    title: {
      fontSize: Device.isSmallDevice() ? 18 : 24,
      marginBottom: 16,
      marginTop: 16,
      marginRight: 24,
      marginLeft: 24,
    },
    actionButtonsContainer: {
      flex: 0,
      flexDirection: 'row',
      padding: 24,
    },
    buttonPositioning: {
      flex: 1,
    },
    cancelButton: {
      marginRight: 8,
    },
    confirmButton: {
      marginLeft: 8,
    },
    networkPermissionRequestInfoCard: {
      marginHorizontal: 24,
      marginTop: 8,
      marginBottom: 12,
      alignItems: 'center',
      flexDirection: 'row',
    },
    permissionsSummaryHeader: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    domainLogoContainer: {
      width: 32,
      height: 32,
      borderRadius: 16,
    },
    assetLogoContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 10,
    },
    networkPermissionRequestDetails: {
      flex: 1,
      marginLeft: 12,
    },
    permissionRequestNetworkInfo: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    avatarGroup: { marginLeft: 2 },
    accountPermissionRequestInfoCard: {
      marginHorizontal: 24,
      marginTop: 8,
      marginBottom: 12,
      alignItems: 'center',
      flexDirection: 'row',
    },
    accountPermissionRequestDetails: {
      flex: 1,
      marginLeft: 12,
    },
    permissionRequestAccountInfo: {
      flexDirection: 'row',
      alignItems: 'center',
    },
  });

const PermissionsSummary = ({
  customNetworkInformation,
  currentPageInformation,
  onCancel,
  onConfirm,
  type,
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const confirm = () => {
    onConfirm && onConfirm();
  };

  const cancel = () => {
    onCancel && onCancel();
  };

  const renderTopIcon = () => {
    const { currentEnsName, icon } = currentPageInformation;
    const url = currentPageInformation.url;
    const iconTitle = getHost(currentEnsName || url);

    return (
      <WebsiteIcon
        style={styles.domainLogoContainer}
        viewStyle={styles.assetLogoContainer}
        title={iconTitle}
        url={currentEnsName || url}
        icon={typeof icon === 'string' ? icon : icon?.uri}
      />
    );
  };

  function renderAccountPermissionsRequestInfoCard() {
    return (
      <View style={styles.accountPermissionRequestInfoCard}>
        <Avatar
          variant={AvatarVariant.Icon}
          name={IconName.Wallet}
          size={AvatarSize.Md}
          backgroundColor={colors.shadow.default}
          iconColor={colors.icon.alternative}
        />
        <View style={styles.accountPermissionRequestDetails}>
          <TextComponent variant={TextVariant.BodyMD}>
            {strings('permissions.wants_to_see_your_accounts')}
          </TextComponent>
          <View style={styles.permissionRequestAccountInfo}>
            <TextComponent>
              <TextComponent variant={TextVariant.BodySM}>
                {strings('permissions.requesting_for')}
              </TextComponent>
              <TextComponent variant={TextVariant.BodySMMedium}>
                {customNetworkInformation.chainName}
              </TextComponent>
            </TextComponent>
            <View style={styles.avatarGroup}>
              <Avatar
                size={AvatarSize.Xs}
                variant={AvatarVariant.Account}
                accountAddress={'0x4514b1904FDe6031D50d507e46816Ba8b42A8034'}
              />
            </View>
          </View>
        </View>
        <View>
          <Button
            variant={ButtonVariants.Link}
            width={ButtonWidthTypes.Full}
            label={strings('permissions.edit')}
            size={ButtonSize.Lg}
          />
        </View>
      </View>
    );
  }

  function renderNetworkPermissionsRequestInfoCard() {
    return (
      <View style={styles.networkPermissionRequestInfoCard}>
        <Avatar
          variant={AvatarVariant.Icon}
          name={IconName.Data}
          size={AvatarSize.Md}
          backgroundColor={colors.shadow.default}
          iconColor={colors.icon.alternative}
        />
        <View style={styles.networkPermissionRequestDetails}>
          <TextComponent variant={TextVariant.BodyMD}>
            {strings('permissions.use_enabled_networks')}
          </TextComponent>
          <View style={styles.permissionRequestNetworkInfo}>
            <TextComponent>
              <TextComponent variant={TextVariant.BodySM}>
                {strings('permissions.requesting_for')}
              </TextComponent>
              <TextComponent variant={TextVariant.BodySMMedium}>
                {customNetworkInformation.chainName}
              </TextComponent>
            </TextComponent>
            <View style={styles.avatarGroup}>
              <AvatarGroup
                avatarPropsList={SAMPLE_AVATARGROUP_PROPS.avatarPropsList}
              />
            </View>
          </View>
        </View>
        <View>
          <Button
            variant={ButtonVariants.Link}
            width={ButtonWidthTypes.Full}
            label={strings('permissions.edit')}
            size={ButtonSize.Lg}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.mainContainer}>
      <View style={styles.permissionsSummaryHeader}>{renderTopIcon()}</View>
      <Text bold centered primary noMargin style={styles.title}>
        {strings('permissions.title_this_site_wants_to')}
      </Text>
      {renderAccountPermissionsRequestInfoCard()}
      {renderNetworkPermissionsRequestInfoCard()}
      <View style={styles.actionButtonsContainer}>
        <StyledButton
          type={'cancel'}
          onPress={cancel}
          containerStyle={[styles.buttonPositioning, styles.cancelButton]}
          testID={CommonSelectorsIDs.CANCEL_BUTTON}
        >
          {strings('permissions.cancel')}
        </StyledButton>
        <StyledButton
          type={'confirm'}
          onPress={confirm}
          containerStyle={[styles.buttonPositioning, styles.confirmButton]}
          testID={CommonSelectorsIDs.CONNECT_BUTTON}
        >
          {strings('confirmation_modal.confirm_cta')}
        </StyledButton>
      </View>
    </View>
  );
};

PermissionsSummary.propTypes = {
  /**
   * Object containing current page title, url, and icon href
   */
  currentPageInformation: PropTypes.object,
  /**
   * Callback triggered on account access approval
   */
  onConfirm: PropTypes.func,
  /**
   * Callback triggered on account access rejection
   */
  onCancel: PropTypes.func,
  /**
   * Object containing info of the network to add
   */
  customNetworkInformation: PropTypes.object,
  /**
   * String representing if it's an existing or a newly added network
   */
  type: PropTypes.string,
};

export default PermissionsSummary;
