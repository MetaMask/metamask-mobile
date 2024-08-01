/* eslint-disable react/prop-types */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Linking } from 'react-native';
import { strings } from '../../../../locales/i18n';
import { CommonSelectorsIDs } from '../../../../e2e/selectors/Common.selectors';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';

import PickerNetwork from '../../../component-library/components/Pickers/PickerNetwork';
import Accordion from '../../../component-library/components/Accordions/Accordion';
import Banner, {
  BannerAlertSeverity,
  BannerVariant,
} from '../../../component-library/components/Banners/Banner';
import { useStyles } from '../../../component-library/hooks';
import styleSheet from './NetworkVerificationInfo.styles';
import { CustomNetworkInformation } from './NetworkVerificationInfo.types';
import { ScrollView } from 'react-native-gesture-handler';
import { ADD_CUSTOM_NETWORK_ARTCILE } from '../../../constants/urls';
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
import {
  getNetworkImageSource,
  toggleUseSafeChainsListValidation,
  isMutichainVersion1Enabled,
} from '../../../util/networks';
import { NetworkApprovalModalSelectorsIDs } from '../../../../e2e/selectors/Modals/NetworkApprovalModal.selectors';
import hideKeyFromUrl from '../../../util/hideKeyFromUrl';
import { convertHexToDecimal } from '@metamask/controller-utils';

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
}: {
  customNetworkInformation: CustomNetworkInformation;
  onReject: () => void;
  onConfirm: () => void;
  isCustomNetwork?: boolean;
}) => {
  const [networkInfoMaxHeight, setNetworkInfoMaxHeight] = useState<
    number | null
  >(null);
  const [networkDetailsExpanded, setNetworkDetailsExpanded] = useState(false);
  const { styles } = useStyles(styleSheet, {});
  const safeChainsListValidationEnabled = useSelector(
    selectUseSafeChainsListValidation,
  );
  const [showCheckNetwork, setShowCheckNetwork] = React.useState(false);
  const { alerts: alertsFromProps } = customNetworkInformation;
  const [alerts, setAlerts] = React.useState<Alert[]>([]);

  const showCheckNetworkModal = () => setShowCheckNetwork(!showCheckNetwork);

  useEffect(() => setAlerts(alertsFromProps), [alertsFromProps]);

  const networkImageSource = useMemo(
    () =>
      //@ts-expect-error - The utils/network file is still JS and this function expects a networkType, and should be optional
      getNetworkImageSource({
        chainId: customNetworkInformation.chainId,
      }),
    [customNetworkInformation],
  );

  const renderCurrencySymbol = () => (
    <>
      <Text
        variant={
          !isMutichainVersion1Enabled
            ? TextVariant.BodyMDBold
            : TextVariant.BodyMDMedium
        }
      >
        {strings('add_custom_network.currency_symbol')}
      </Text>
      <Text style={styles.textSection}>{customNetworkInformation.ticker}</Text>
    </>
  );

  const renderChainId = () => (
    <>
      <Text
        variant={
          !isMutichainVersion1Enabled
            ? TextVariant.BodyMDBold
            : TextVariant.BodyMDMedium
        }
      >
        {strings('add_custom_network.chain_id')}
      </Text>
      <Text style={styles.textSection}>
        {convertHexToDecimal(customNetworkInformation.chainId)}
      </Text>
    </>
  );

  const renderNetworkDisplayName = () => (
    <>
      <Text
        variant={
          !isMutichainVersion1Enabled
            ? TextVariant.BodyMDBold
            : TextVariant.BodyMDMedium
        }
      >
        {strings('add_custom_network.display_name')}
      </Text>
      <Text style={styles.textSection}>
        {customNetworkInformation.chainName}
      </Text>
    </>
  );

  const renderNetworkInfo = () => (
    <ScrollView
      nestedScrollEnabled
      style={[
        styles.accountCardWrapper,
        networkInfoMaxHeight ? { maxHeight: networkInfoMaxHeight } : undefined,
      ]}
      onLayout={(event) => {
        if (!networkInfoMaxHeight) {
          setNetworkInfoMaxHeight(event.nativeEvent.layout.height);
        }
      }}
      contentContainerStyle={
        networkDetailsExpanded ? styles.nestedScrollContent : undefined
      }
    >
      {!isMutichainVersion1Enabled && renderNetworkDisplayName()}

      {isMutichainVersion1Enabled && renderCurrencySymbol()}

      {!isMutichainVersion1Enabled && renderChainId()}

      <Text
        variant={
          !isMutichainVersion1Enabled
            ? TextVariant.BodyMDBold
            : TextVariant.BodyMDMedium
        }
      >
        {isMutichainVersion1Enabled
          ? strings('networks.network_rpc_url_label')
          : strings('add_custom_network.network_url')}
      </Text>
      <Text style={styles.textSection}>
        {hideKeyFromUrl(customNetworkInformation.rpcUrl)}
      </Text>

      <Accordion
        title={strings('spend_limit_edition.view_details')}
        onPress={() => setNetworkDetailsExpanded(!networkDetailsExpanded)}
      >
        {isMutichainVersion1Enabled && renderChainId()}

        {isMutichainVersion1Enabled && renderNetworkDisplayName()}

        {!isMutichainVersion1Enabled && renderCurrencySymbol()}

        <Text
          variant={
            !isMutichainVersion1Enabled
              ? TextVariant.BodyMDBold
              : TextVariant.BodyMDMedium
          }
        >
          {strings('add_custom_network.block_explorer_url')}
        </Text>
        <Text>{customNetworkInformation.blockExplorerUrl}</Text>
      </Accordion>
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

  return showCheckNetwork ? (
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
    <View testID={NetworkApprovalModalSelectorsIDs.CONTAINER}>
      <BottomSheetHeader>
        <Text variant={TextVariant.HeadingMD}>
          {isCustomNetwork
            ? strings('networks.add_custom_network')
            : isMutichainVersion1Enabled
            ? strings('networks.add_specific_network', {
                network_name: customNetworkInformation.chainName,
              })
            : strings('app_settings.network_add_network')}
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
        <Text style={styles.textCentred}>
          {isMutichainVersion1Enabled ? (
            <Text>
              {strings(
                'switch_custom_network.add_network_and_give_dapp_permission_warning',
                {
                  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                  // @ts-ignore
                  dapp_origin: new URL(customNetworkInformation.pageMeta.url)
                    ?.hostname,
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
        buttonPropsArray={[
          {
            onPress: onReject,
            label: strings('confirmation_modal.cancel_cta'),
            variant: ButtonVariants.Secondary,
            size: ButtonSize.Lg,
            testID: NetworkApprovalModalSelectorsIDs.CANCEL_BUTTON,
          },
          {
            onPress: onConfirm,
            label: strings('confirmation_modal.confirm_cta'),
            variant: ButtonVariants.Primary,
            size: ButtonSize.Lg,
            testID: NetworkApprovalModalSelectorsIDs.APPROVE_BUTTON,
          },
        ]}
        buttonsAlignment={ButtonsAlignment.Horizontal}
      />
    </View>
  );
};

export default NetworkVerificationInfo;
