/* eslint-disable react/prop-types */
import React, { useCallback, useEffect, useMemo } from 'react';
import { View, Linking, TouchableOpacity } from 'react-native';
import { strings } from '../../../../locales/i18n';
import { CommonSelectorsIDs } from '../../../util/Common.testIds';
import Text, {
  TextVariant,
  TextColor,
} from '../../../component-library/components/Texts/Text';
import TagColored from '../../../component-library/components-temp/TagColored/TagColored';
import { TagColor } from '../../../component-library/components-temp/TagColored/TagColored.types';
import PickerNetwork from '../../../component-library/components/Pickers/PickerNetwork';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../component-library/components/Icons/Icon';
import Banner, {
  BannerAlertSeverity,
  BannerVariant,
} from '../../../component-library/components/Banners/Banner';
import { useStyles } from '../../../component-library/hooks';
import styleSheet from './NetworkVerificationInfo.styles';
import { CustomNetworkInformation } from './NetworkVerificationInfo.types';
import { ScrollView } from 'react-native-gesture-handler';
import { useSelector } from 'react-redux';
import { selectUseSafeChainsListValidation } from '../../../selectors/preferencesController';
import {
  ButtonSize,
  ButtonVariants,
} from '../../../component-library/components/Buttons/Button';
import BottomSheetFooter, {
  ButtonsAlignment,
} from '../../../component-library/components/BottomSheets/BottomSheetFooter';
import BottomSheetHeader from '../../../component-library/components/BottomSheets/BottomSheetHeader';
import { getNetworkImageSource } from '../../../util/networks';
import { toggleUseSafeChainsListValidation } from '../../../util/networks/engineNetworkUtils';
import { NetworkApprovalBottomSheetSelectorsIDs } from '../NetworkModal/NetworkApprovalBottomSheet.testIds';
import hideKeyFromUrl from '../../../util/hideKeyFromUrl';
import { convertHexToDecimal } from '@metamask/controller-utils';
import { isValidASCIIURL, toPunycodeURL } from '../../../util/url';
import { PopularList } from '../../../util/networks/customNetworks';
import { MISSMATCH_RPC_URL_TEST_ID } from './NetworkVerificationInfo.constants';
import { ADD_CUSTOM_NETWORK_ARTCILE } from '../../../constants/urls';

interface Alert {
  alertError: string;
  alertSeverity: BannerAlertSeverity;
  alertOrigin: string;
}

/**
 * NetworkVerificationInfo component
 */
const NetworkVerificationInfo = ({
  customNetworkInformation,
  onReject,
  onConfirm,
  isCustomNetwork = false,
  isNetworkRpcUpdate = false,
}: {
  customNetworkInformation: CustomNetworkInformation;
  onReject: () => void;
  onConfirm: () => void;
  isCustomNetwork?: boolean;
  isNetworkRpcUpdate?: boolean;
}) => {
  const { styles } = useStyles(styleSheet, {});
  const safeChainsListValidationEnabled = useSelector(
    selectUseSafeChainsListValidation,
  );
  const [showCheckNetwork, setShowCheckNetwork] = React.useState(false);
  const [showReviewDefaultRpcUrlChanges, setShowReviewDefaultRpcUrlChanges] =
    React.useState(false);
  const { alerts: alertsFromProps } = customNetworkInformation;
  const [alerts, setAlerts] = React.useState<Alert[]>([]);
  const showCheckNetworkModal = () => setShowCheckNetwork(!showCheckNetwork);
  const showReviewDefaultRpcUrlChangesModal = () =>
    setShowReviewDefaultRpcUrlChanges(!showReviewDefaultRpcUrlChanges);

  const customRpcUrl = customNetworkInformation.rpcUrl;

  const isDappRequest = useMemo(
    // @ts-expect-error - The CustomNetworkInformation type is missing the pageMeta property
    () => Boolean(customNetworkInformation.pageMeta?.url),
    [customNetworkInformation],
  );

  const matchingPopularNetwork = useMemo(() => {
    if (!isDappRequest) return null;
    return PopularList.find(
      (network) => network.chainId === customNetworkInformation.chainId,
    );
  }, [isDappRequest, customNetworkInformation.chainId]);

  const hasRpcMismatch = useMemo(() => {
    if (!matchingPopularNetwork) return false;
    return matchingPopularNetwork.rpcUrl !== customNetworkInformation.rpcUrl;
  }, [matchingPopularNetwork, customNetworkInformation.rpcUrl]);

  const goToLearnMore = () => {
    Linking.openURL(
      'https://support.metamask.io/networks-and-sidechains/managing-networks/verifying-custom-network-information/',
    );
  };

  useEffect(() => setAlerts(alertsFromProps), [alertsFromProps]);

  const networkImageSource = useMemo(
    () =>
      getNetworkImageSource({
        chainId: customNetworkInformation.chainId,
      }),
    [customNetworkInformation],
  );

  const dappOrigin = useMemo(() => {
    // @ts-expect-error - The CustomNetworkInformation type is missing the pageMeta property
    const customNetworkUrl = customNetworkInformation.pageMeta?.url;
    const url = customNetworkUrl ? new URL(customNetworkUrl) : null;
    if (url) {
      try {
        return url.hostname;
      } catch (error) {
        console.error('Invalid URL:', error);
      }
    }
    return undefined;
  }, [customNetworkInformation]);

  const renderCurrencySymbol = () => (
    <>
      <Text variant={TextVariant.BodyMDMedium}>
        {strings('add_custom_network.currency_symbol')}
      </Text>
      <Text style={styles.textSection}>{customNetworkInformation.ticker}</Text>
    </>
  );

  const renderChainId = () => (
    <>
      <Text variant={TextVariant.BodyMDMedium}>
        {strings('add_custom_network.chain_id')}
      </Text>
      <Text style={styles.textSection}>
        {convertHexToDecimal(customNetworkInformation.chainId)}
      </Text>
    </>
  );

  const renderNetworkDisplayName = () => (
    <>
      <Text variant={TextVariant.BodyMDMedium}>
        {strings('add_custom_network.display_name')}
      </Text>
      <Text style={styles.textSection}>
        {customNetworkInformation.chainName}
      </Text>
    </>
  );

  const renderNetworkRpcUrlLabel = () => (
    <View style={styles.networkUrlLabelRow}>
      <Text
        color={hasRpcMismatch ? TextColor.Primary : TextColor.Default}
        variant={TextVariant.BodyMDMedium}
      >
        {strings('networks.network_rpc_url_label')}
      </Text>
      {hasRpcMismatch && (
        <TouchableOpacity
          onPress={() => {
            showReviewDefaultRpcUrlChangesModal();
          }}
        >
          <TagColored style={styles.tag} color={TagColor.Info}>
            <View style={styles.tagContent} testID={MISSMATCH_RPC_URL_TEST_ID}>
              <Icon
                size={IconSize.Sm}
                name={IconName.Info}
                color={IconColor.Primary}
              />
              <Text variant={TextVariant.BodySM} color={TextColor.Primary}>
                {strings('networks.review')}
              </Text>
              <Icon
                size={IconSize.Xs}
                name={IconName.ArrowRight}
                color={IconColor.Primary}
              />
            </View>
          </TagColored>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderNetworkInfo = () => (
    <ScrollView
      nestedScrollEnabled
      style={styles.accountCardWrapper}
      contentContainerStyle={styles.nestedScrollContent}
    >
      {renderCurrencySymbol()}
      {renderNetworkRpcUrlLabel()}
      <Text style={styles.textSection}>
        {hideKeyFromUrl(customNetworkInformation.rpcUrl)}
      </Text>
      {renderChainId()}
      {renderNetworkDisplayName()}
      <Text variant={TextVariant.BodyMDMedium}>
        {strings('add_custom_network.block_explorer_url')}
      </Text>
      <Text>{customNetworkInformation.blockExplorerUrl}</Text>
    </ScrollView>
  );

  const openHowToUseCustomNetworks = () => {
    Linking.openURL(ADD_CUSTOM_NETWORK_ARTCILE);
  };

  const renderBanner = () => {
    if (!safeChainsListValidationEnabled) {
      return (
        <View style={styles.alertBar}>
          <Banner
            variant={BannerVariant.Alert}
            description={
              strings('wallet.network_details_check') +
              ' ' +
              strings('wallet.network_check_validation_desc')
            }
            actionButtonProps={{
              variant: ButtonVariants.Link,
              label: strings('wallet.turn_on_network_check_cta'),
              onPress: showCheckNetworkModal,
            }}
          />
        </View>
      );
    }
    return null;
  };

  const renderBannerNetworkUrlNonAsciiDetected = () => {
    if (!customRpcUrl || isValidASCIIURL(customRpcUrl)) {
      return null;
    }
    const punycodeUrl = toPunycodeURL(customRpcUrl);

    return (
      <View style={styles.alertBar}>
        <Banner
          severity={BannerAlertSeverity.Warning}
          variant={BannerVariant.Alert}
          description={
            strings('networks.network_rpc_url_warning_punycode') +
            '\n' +
            punycodeUrl
          }
        />
      </View>
    );
  };

  const renderCustomNetworkBanner = () => (
    <View style={styles.alertBar}>
      <Banner
        severity={BannerAlertSeverity.Warning}
        variant={BannerVariant.Alert}
        description={strings('wallet.cant_verify_custom_network_warning')}
        actionButtonProps={{
          variant: ButtonVariants.Link,
          label: strings('wallet.learn_more'),
          onPress: goToLearnMore,
        }}
      />
    </View>
  );

  const renderReviewDefaultNetworkRpcUrlChange = () => (
    <View>
      <BottomSheetHeader
        style={styles.headerStyle}
        onBack={() => {
          showReviewDefaultRpcUrlChangesModal();
        }}
      >
        <Icon
          size={IconSize.Xl}
          name={IconName.Info}
          color={IconColor.Primary}
        />
      </BottomSheetHeader>

      <View style={styles.defautlUrlChangedContainer}>
        <View style={styles.titleDefaultUrl}>
          <Text variant={TextVariant.HeadingMD}>
            {strings('networks.new_default_network_url')}
          </Text>
        </View>
        <View style={styles.networkUrlMissmatchDetails}>
          <Text style={styles.textSection}>
            {strings('switch_custom_network.request_update_network_url', {
              dapp_origin: dappOrigin,
            })}
          </Text>
          <Text variant={TextVariant.BodyMDBold}>
            {strings('networks.current_label')}
          </Text>
          <Text style={styles.textSection}>
            {hideKeyFromUrl(matchingPopularNetwork?.rpcUrl)}
          </Text>
          <Text variant={TextVariant.BodyMDBold}>
            {strings('networks.new_label')}
          </Text>
          <Text style={styles.textSection}>{hideKeyFromUrl(customRpcUrl)}</Text>
        </View>
      </View>
    </View>
  );

  const renderAlerts = useCallback(() => {
    if (!safeChainsListValidationEnabled) return null;
    if (!alerts.length) return null;

    return alerts.map(
      (
        networkAlert: {
          alertError: string;
          alertSeverity: BannerAlertSeverity;
          alertOrigin: string;
        },
        index,
      ) => (
        <Banner
          variant={BannerVariant.Alert}
          severity={networkAlert.alertSeverity}
          description={networkAlert.alertError}
          testID={CommonSelectorsIDs.ERROR_MESSAGE}
          style={styles.textSection}
          key={networkAlert.alertOrigin}
          onClose={() => {
            const newAlerts = [...alerts];
            newAlerts.splice(index, 1);
            setAlerts(newAlerts);
          }}
        />
      ),
    );
  }, [alerts, styles.textSection, safeChainsListValidationEnabled]);

  return showReviewDefaultRpcUrlChanges ? (
    renderReviewDefaultNetworkRpcUrlChange()
  ) : showCheckNetwork ? (
    <View>
      <View style={styles.textContainer}>
        <Text style={styles.title}>
          {strings('wallet.network_details_check')}
        </Text>
        <Text style={styles.bottomSpace}>
          {strings('app_settings.use_safe_chains_list_validation_desc_1')}{' '}
          chainid.network{' '}
          {strings('app_settings.use_safe_chains_list_validation_desc_2')}
        </Text>

        <Text>
          {strings('networks.network_select_confirm_use_safe_check')}{' '}
          <Text style={styles.boldText}>
            {strings('networks.network_settings_security_privacy')}
          </Text>
        </Text>
      </View>

      <BottomSheetFooter
        buttonPropsArray={[
          {
            onPress: showCheckNetworkModal,
            label: strings('confirmation_modal.cancel_cta'),
            variant: ButtonVariants.Secondary,
            size: ButtonSize.Lg,
            testID: CommonSelectorsIDs.CANCEL_BUTTON,
          },
          {
            onPress: () => {
              toggleUseSafeChainsListValidation(true);
              showCheckNetworkModal();
            },
            label: strings('confirmation_modal.confirm_cta'),
            variant: ButtonVariants.Primary,
            size: ButtonSize.Lg,
            testID: CommonSelectorsIDs.CONNECT_BUTTON,
          },
        ]}
        buttonsAlignment={ButtonsAlignment.Horizontal}
      />
    </View>
  ) : (
    <View testID={NetworkApprovalBottomSheetSelectorsIDs.CONTAINER}>
      <BottomSheetHeader>
        <Text variant={TextVariant.HeadingMD}>
          {isCustomNetwork
            ? strings('networks.add_custom_network')
            : strings(
                isNetworkRpcUpdate
                  ? 'networks.update_network'
                  : 'networks.add_specific_network',
                {
                  network_name: customNetworkInformation.chainName,
                },
              )}
        </Text>
      </BottomSheetHeader>
      <ScrollView style={styles.root}>
        <PickerNetwork
          imageSource={networkImageSource}
          label={customNetworkInformation.chainName}
          style={styles.networkSection}
          disabled
        />
        {renderAlerts()}
        {renderBanner()}
        {renderBannerNetworkUrlNonAsciiDetected()}
        {isCustomNetwork && renderCustomNetworkBanner()}
        <Text style={styles.textCentred}>
          {dappOrigin !== undefined ? (
            <Text>
              {strings(
                isNetworkRpcUpdate
                  ? 'switch_custom_network.update_network_and_give_dapp_permission_warning'
                  : 'switch_custom_network.add_network_and_give_dapp_permission_warning',
                {
                  dapp_origin: dappOrigin,
                },
              )}
            </Text>
          ) : (
            <>
              {strings('add_custom_network.warning_subtext_new.1')}{' '}
              <Text onPress={openHowToUseCustomNetworks}>
                {strings('add_custom_network.warning_subtext_new.2')}
              </Text>
            </>
          )}
        </Text>
        {renderNetworkInfo()}
      </ScrollView>
      <BottomSheetFooter
        style={styles.footerPadding}
        buttonPropsArray={[
          {
            onPress: onReject,
            label: strings('confirmation_modal.cancel_cta'),
            variant: ButtonVariants.Secondary,
            size: ButtonSize.Lg,
            testID: NetworkApprovalBottomSheetSelectorsIDs.CANCEL_BUTTON,
          },
          {
            onPress: onConfirm,
            label: strings('confirmation_modal.confirm_cta'),
            variant: ButtonVariants.Primary,
            size: ButtonSize.Lg,
            testID: NetworkApprovalBottomSheetSelectorsIDs.APPROVE_BUTTON,
          },
        ]}
        buttonsAlignment={ButtonsAlignment.Horizontal}
      />
    </View>
  );
};

export default NetworkVerificationInfo;
