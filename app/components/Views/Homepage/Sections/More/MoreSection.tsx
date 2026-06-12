import React, { useCallback } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import SectionHeader from '../../../../../component-library/components-temp/SectionHeader';
import SectionRow from '../../components/SectionRow';
import Routes from '../../../../../constants/navigation/Routes';
import { METAMASK_SUPPORT_URL } from '../../../../../constants/urls';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { selectEvmChainId } from '../../../../../selectors/networkController';
import { ActionLocation } from '../../../../../util/analytics/actionButtonTracking';
import { getDecimalChainId } from '../../../../../util/networks';
import { strings } from '../../../../../../locales/i18n';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { HomepageMoreSelectorsIDs } from '../../Homepage.testIds';
import styles from './MoreSection.styles';

interface MoreActionRowProps {
  label: string;
  startIconName: IconName;
  endIconName?: IconName;
  onPress: () => void;
  testID: string;
}

const MoreActionRow = ({
  label,
  startIconName,
  endIconName,
  onPress,
  testID,
}: MoreActionRowProps) => (
  <TouchableOpacity
    accessibilityRole="button"
    onPress={onPress}
    style={styles.row}
    testID={testID}
  >
    <Icon
      name={startIconName}
      size={IconSize.Md}
      color={IconColor.IconDefault}
      style={styles.startIcon}
    />
    <Text
      variant={TextVariant.BodyMd}
      fontWeight={FontWeight.Medium}
      color={TextColor.TextDefault}
      style={styles.label}
    >
      {label}
    </Text>
    {endIconName ? (
      <Icon
        name={endIconName}
        size={IconSize.Md}
        color={IconColor.IconAlternative}
      />
    ) : null}
  </TouchableOpacity>
);

const MoreSection = () => {
  const navigation = useNavigation();
  const currentChainId = useSelector(selectEvmChainId);
  const { trackEvent, createEventBuilder } = useAnalytics();

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
    navigation.navigate(Routes.WEBVIEW.MAIN, {
      screen: Routes.WEBVIEW.SIMPLE,
      params: {
        url: METAMASK_SUPPORT_URL,
        title: strings('app_settings.contact_support'),
      },
    });
    trackEvent(
      createEventBuilder(MetaMetricsEvents.NAVIGATION_TAPS_GET_HELP)
        .addProperties({
          action: 'Navigation Drawer',
          name: 'Get Help',
          location: ActionLocation.HOME,
        })
        .build(),
    );
  }, [createEventBuilder, navigation, trackEvent]);

  return (
    <View
      style={styles.sectionGap}
      testID={HomepageMoreSelectorsIDs.HOMEPAGE_MORE_SECTION}
    >
      <SectionHeader title={strings('homepage.sections.more.title')} />
      <SectionRow>
        <MoreActionRow
          label={strings('homepage.sections.more.import_token')}
          startIconName={IconName.Add}
          onPress={handleImportToken}
          testID={HomepageMoreSelectorsIDs.IMPORT_TOKEN_BUTTON}
        />
        <MoreActionRow
          label={strings('homepage.sections.more.import_nft')}
          startIconName={IconName.Add}
          onPress={handleImportNft}
          testID={HomepageMoreSelectorsIDs.IMPORT_NFT_BUTTON}
        />
        <MoreActionRow
          label={strings('homepage.sections.more.contact_support')}
          startIconName={IconName.MessageQuestion}
          endIconName={IconName.Export}
          onPress={handleContactSupport}
          testID={HomepageMoreSelectorsIDs.HOMEPAGE_MORE_CONTACT_SUPPORT_BUTTON}
        />
      </SectionRow>
    </View>
  );
};

export default MoreSection;
