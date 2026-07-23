import React, { useCallback } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  Icon,
  IconName,
  ListItem,
  ListItemVariant,
  SectionDivider,
  SectionHeader,
} from '@metamask/design-system-react-native';
import Routes from '../../../../../constants/navigation/Routes';
import { METAMASK_SUPPORT_URL } from '../../../../../constants/urls';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { selectEvmChainId } from '../../../../../selectors/networkController';
import { ActionLocation } from '../../../../../util/analytics/actionButtonTracking';
import { getDecimalChainId } from '../../../../../util/networks';
import { strings } from '../../../../../../locales/i18n';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { useSupportConsent } from '../../../../hooks/useSupportConsent';
import { HomepageMoreSelectorsIDs } from '../../Homepage.testIds';

const MoreSection = () => {
  const navigation = useNavigation();
  const currentChainId = useSelector(selectEvmChainId);
  const { trackEvent, createEventBuilder } = useAnalytics();
  const { openSupportWithConsent } = useSupportConsent();

  const handleImportToken = useCallback(() => {
    navigation.navigate('AddAsset', { assetType: 'token' });
    trackEvent(
      createEventBuilder(MetaMetricsEvents.TOKEN_IMPORT_CLICKED)
        .addProperties({
          source: 'manual',
          chain_id: getDecimalChainId(currentChainId),
          location: ActionLocation.HOME,
        })
        .build(),
    );
  }, [createEventBuilder, currentChainId, navigation, trackEvent]);

  const handleImportNft = useCallback(() => {
    navigation.navigate('AddAsset', { assetType: 'collectible' });
    trackEvent(
      createEventBuilder(MetaMetricsEvents.WALLET_ADD_COLLECTIBLES)
        .addProperties({
          action: 'Wallet View',
          name: 'Add Collectibles',
          location: ActionLocation.HOME,
        })
        .build(),
    );
  }, [createEventBuilder, navigation, trackEvent]);

  const handleContactSupport = useCallback(() => {
    openSupportWithConsent(
      (url) => {
        navigation.navigate(Routes.WEBVIEW.MAIN, {
          screen: Routes.WEBVIEW.SIMPLE,
          params: {
            url,
            title: strings('app_settings.contact_support'),
          },
        });
      },
      METAMASK_SUPPORT_URL,
      // Defer tracking to when support actually opens (consent confirm/reject),
      // not the mere tap that only shows the consent sheet.
      () =>
        trackEvent(
          createEventBuilder(MetaMetricsEvents.NAVIGATION_TAPS_GET_HELP)
            .addProperties({
              action: 'Navigation Drawer',
              name: 'Get Help',
              location: ActionLocation.HOME,
            })
            .build(),
        ),
    );
  }, [createEventBuilder, navigation, trackEvent, openSupportWithConsent]);

  return (
    <View testID={HomepageMoreSelectorsIDs.HOMEPAGE_MORE_SECTION}>
      <SectionDivider />
      <SectionHeader title={strings('homepage.sections.more.title')} />
      <ListItem
        isInteractive
        variant={ListItemVariant.OneLine}
        title={strings('homepage.sections.more.import_token')}
        startAccessory={<Icon name={IconName.Add} />}
        accessoryGap={4}
        onPress={handleImportToken}
        testID={HomepageMoreSelectorsIDs.IMPORT_TOKEN_BUTTON}
      />
      <ListItem
        isInteractive
        variant={ListItemVariant.OneLine}
        title={strings('homepage.sections.more.import_nft')}
        startAccessory={<Icon name={IconName.Add} />}
        accessoryGap={4}
        onPress={handleImportNft}
        testID={HomepageMoreSelectorsIDs.IMPORT_NFT_BUTTON}
      />
      <ListItem
        isInteractive
        variant={ListItemVariant.OneLine}
        title={strings('homepage.sections.more.contact_support')}
        startAccessory={<Icon name={IconName.Sms} />}
        accessoryGap={4}
        onPress={handleContactSupport}
        testID={HomepageMoreSelectorsIDs.HOMEPAGE_MORE_CONTACT_SUPPORT_BUTTON}
      />
    </View>
  );
};

export default MoreSection;
