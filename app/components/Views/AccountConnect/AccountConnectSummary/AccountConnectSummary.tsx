// Third party dependencies.
import React, { useCallback, useMemo } from 'react';
import { View, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import ScrollableTabView from 'react-native-scrollable-tab-view';
import DefaultTabBar from 'react-native-scrollable-tab-view/DefaultTabBar';

// External dependencies.
import StyledButton from '../../../UI/StyledButton';
import { strings } from '../../../../../locales/i18n';
import { getHost } from '../../../../util/browser';
import WebsiteIcon from '../../../UI/WebsiteIcon';
import { useStyles } from '../../../../component-library/hooks';
import { useTheme } from '../../../../util/theme';

// Internal dependencies.
import styleSheet from './AccountConnectSummary.styles';
import { AccountConnectSummaryProps } from './AccountConnectSummary.types';
import TextComponent, {
  TextVariant,
  TextColor,
} from '../../../../component-library/components/Texts/Text';
import { CommonSelectorsIDs } from '../../../../../e2e/selectors/Common.selectors';

// TODO: Mock components
const AccountsConnected = () => (
  <View>
    <TextComponent>Accounts Connected</TextComponent>
  </View>
);

// TODO: Mock components
const Permissions = () => (
  <View>
    <TextComponent>Permissions</TextComponent>
  </View>
);

const AccountConnectSummary = ({
  currentPageInformation,
  isNonDappNetworkSwitch,
  showActionButtons = true,
  isNetworkSwitch = true,
  accountAddresses = [],
}: AccountConnectSummaryProps) => {
  const { styles } = useStyles(styleSheet, {});
  const theme = useTheme();
  const { colors } = theme;
  const navigation = useNavigation();

  const hostname = useMemo(
    () => new URL(currentPageInformation.url).hostname,
    [currentPageInformation.url],
  );

  const renderTopIcon = useCallback(() => {
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
  }, [
    currentPageInformation,
    styles.assetLogoContainer,
    styles.domainLogoContainer,
  ]);

  const renderHeader = useCallback(
    () => (
      <View style={styles.header}>
        <View
          style={[
            styles.logoContainer,
            isNonDappNetworkSwitch && styles.logoContainerNonDapp,
          ]}
        >
          {renderTopIcon()}
        </View>
        <View style={styles.headerTitleContainer}>
          <TextComponent variant={TextVariant.HeadingSM}>
            {hostname}
          </TextComponent>
          <TextComponent
            style={styles.headerDescription}
            variant={TextVariant.BodyMD}
          >
            {strings('account_dapp_connections.account_summary_header')}
          </TextComponent>
        </View>
      </View>
    ),
    [
      hostname,
      isNonDappNetworkSwitch,
      renderTopIcon,
      styles.header,
      styles.headerTitleContainer,
      styles.logoContainer,
      styles.logoContainerNonDapp,
      styles.headerDescription,
    ],
  );

  const renderTabBar = useCallback(
    (props: Record<string, unknown>) => (
      <View style={styles.base}>
        <DefaultTabBar
          underlineStyle={styles.tabUnderlineStyle}
          activeTextColor={colors.primary.default}
          inactiveUnderlineStyle={styles.tabUnderlineStyleInactive}
          inactiveTextColor={colors.text.muted}
          backgroundColor={colors.background.default}
          tabStyle={styles.tabStyle}
          textStyle={styles.textStyle}
          tabPadding={16}
          style={styles.tabBar}
          {...props}
        />
      </View>
    ),
    [styles, colors],
  );

  const onChangeTab = useCallback((tabInfo: { i: number; ref: unknown }) => {
    console.log('tabInfo', tabInfo);
  }, []);

  const cancel = () => {
    console.log('cancel');
  };

  const confirm = () => {
    console.log('confirm');
  };

  const accountsConnectedTabProps = useMemo(
    () => ({
      key: 'account-connected-tab',
      tabLabel: 'Accounts',
      navigation,
    }),
    [navigation],
  );

  const permissionsTabProps = useMemo(
    () => ({
      key: 'permissions-tab',
      tabLabel: 'Permissions',
      navigation,
    }),
    [navigation],
  );

  const renderTabsContent = () => (
    <ScrollableTabView renderTabBar={renderTabBar} onChangeTab={onChangeTab}>
      <AccountsConnected {...accountsConnectedTabProps} />
      <Permissions {...permissionsTabProps} />
    </ScrollableTabView>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.mainContainer}>
        {renderHeader()}
        {renderTabsContent()}
        <View style={styles.editAccountsContainer}>
          <TextComponent
            color={TextColor.Primary}
            variant={TextVariant.BodyMDMedium}
          >
            {strings('accounts.edit_accounts_title')}
          </TextComponent>
        </View>
        {showActionButtons && !isNonDappNetworkSwitch && (
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
              disabled={accountAddresses.length === 0}
              containerStyle={[styles.buttonPositioning, styles.confirmButton]}
              testID={CommonSelectorsIDs.CONNECT_BUTTON}
            >
              {isNetworkSwitch
                ? strings('confirmation_modal.confirm_cta')
                : strings('accounts.connect')}
            </StyledButton>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

export default AccountConnectSummary;
