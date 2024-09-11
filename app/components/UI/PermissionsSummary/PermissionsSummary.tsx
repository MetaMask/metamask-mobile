import React from 'react';
import StyledButton from '../StyledButton';
import { View } from 'react-native';
import { strings } from '../../../../locales/i18n';
import Text from '../../Base/Text';
import { useTheme } from '../../../util/theme';
import { CommonSelectorsIDs } from '../../../../e2e/selectors/Common.selectors';
import Avatar, {
  AvatarSize,
  AvatarVariant,
} from '../../../component-library/components/Avatars/Avatar';
import {
  IconColor,
  IconName,
} from '../../../component-library/components/Icons/Icon';
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
import useSelectedAccount from '../Tabs/TabThumbnail/useSelectedAccount';
import styleSheet from './PermissionsSummary.styles';
import { useStyles } from '../../../component-library/hooks';
import { PermissionsSummaryProps } from './PermissionsSummary.types';
import { useSelector } from 'react-redux';
import { selectNetworkName } from '../../../selectors/networkInfos';
import { USER_INTENT } from '../../../constants/permissions';
import ButtonIcon from '../../../component-library/components/Buttons/ButtonIcon';

const PermissionsSummary = ({
  currentPageInformation,
  onEdit,
  onBack,
  onUserAction,
  showActionButtons = true,
  isInitialDappConnection = true,
}: PermissionsSummaryProps) => {
  const { colors } = useTheme();
  const { styles } = useStyles(styleSheet, {});
  const selectedAccount = useSelectedAccount();
  const networkName = useSelector(selectNetworkName);

  const confirm = () => {
    onUserAction?.(USER_INTENT.Confirm);
  };

  const cancel = () => {
    onUserAction?.(USER_INTENT.Cancel);
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

  const handleEditButtonPress = () => {
    onEdit?.();
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
            <View style={styles.permissionRequestAccountName}>
              <TextComponent numberOfLines={1} ellipsizeMode="tail">
                <TextComponent variant={TextVariant.BodySM}>
                  {strings('permissions.requesting_for')}
                </TextComponent>
                <TextComponent variant={TextVariant.BodySMMedium}>
                  {`${
                    selectedAccount?.name ??
                    strings('browser.undefined_account')
                  }`}
                </TextComponent>
              </TextComponent>
            </View>
            {selectedAccount?.address && (
              <View style={styles.avatarGroup}>
                <Avatar
                  size={AvatarSize.Xs}
                  variant={AvatarVariant.Account}
                  accountAddress={selectedAccount?.address}
                />
              </View>
            )}
          </View>
        </View>
        <View>
          <Button
            onPress={handleEditButtonPress}
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
            <View style={styles.permissionRequestNetworkName}>
              <TextComponent numberOfLines={1} ellipsizeMode="tail">
                <TextComponent variant={TextVariant.BodySM}>
                  {strings('permissions.requesting_for')}
                </TextComponent>
                <TextComponent variant={TextVariant.BodySMMedium}>
                  {networkName}
                </TextComponent>
              </TextComponent>
            </View>
            <View style={styles.avatarGroup}>
              <AvatarGroup
                avatarPropsList={SAMPLE_AVATARGROUP_PROPS.avatarPropsList}
              />
            </View>
          </View>
        </View>
        <View>
          <Button
            onPress={handleEditButtonPress}
            variant={ButtonVariants.Link}
            width={ButtonWidthTypes.Full}
            label={strings('permissions.edit')}
            size={ButtonSize.Lg}
          />
        </View>
      </View>
    );
  }

  function renderHeader() {
    return (
      <View style={styles.header}>
        <View style={styles.startAccessory}>
          {onBack && (
            <ButtonIcon
              iconColor={IconColor.Default}
              onPress={onBack}
              iconName={IconName.ArrowLeft}
            />
          )}
        </View>

        <View style={styles.logoContainer}>{renderTopIcon()}</View>
        <View style={styles.endAccessory}></View>
      </View>
    );
  }

  return (
    <View style={styles.mainContainer}>
      {renderHeader()}
      <Text bold centered primary noMargin style={styles.title}>
        {isInitialDappConnection
          ? strings('permissions.title_dapp_url_wants_to', {
              dappUrl: new URL(currentPageInformation.url).hostname,
            })
          : strings('permissions.title_dapp_url_has_approval_to', {
              dappUrl: new URL(currentPageInformation.url).hostname,
            })}
      </Text>
      {renderAccountPermissionsRequestInfoCard()}
      {renderNetworkPermissionsRequestInfoCard()}
      {showActionButtons && (
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
      )}
    </View>
  );
};

export default PermissionsSummary;
