// external dependencies
import React, { useCallback, useLayoutEffect } from 'react';
import { ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';

// internal dependencies
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import Icon, {
  IconSize,
  IconName,
} from '../../../../component-library/components/Icons/Icon';
import { strings } from '../../../../../locales/i18n';
import { useStyles } from '../../../../component-library/hooks';
import styleSheet from './index.styles';
import AutoDetectTokensSettings from '../../Settings/AutoDetectTokensSettings';
import DisplayNFTMediaSettings from '../../Settings/DisplayNFTMediaSettings';
import AutoDetectNFTSettings from '../../Settings/AutoDetectNFTSettings';
import IPFSGatewaySettings from '../../Settings/IPFSGatewaySettings';
import IncomingTransactionsSettings from '../../Settings/IncomingTransactionsSettings';
import BatchAccountBalanceSettings from '../../Settings/BatchAccountBalanceSettings';

const AssetSettings = () => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();

  const renderBackButton = useCallback(
    () => (
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.backButton}
      >
        <Icon name={IconName.ArrowLeft} size={IconSize.Lg} />
      </TouchableOpacity>
    ),
    [navigation, styles.backButton],
  );

  const renderTitle = useCallback(
    () => (
      <Text variant={TextVariant.HeadingMD}>
        {strings('default_settings.drawer_assets_title')}
      </Text>
    ),
    [],
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: renderBackButton,
      headerTitle: renderTitle,
    });
  }, [navigation, renderBackButton, renderTitle]);

  return (
    <ScrollView
      contentContainerStyle={styles.contentContainerStyle}
      style={styles.root}
    >
      <AutoDetectTokensSettings />
      <DisplayNFTMediaSettings />
      <AutoDetectNFTSettings />
      <IPFSGatewaySettings />
      <IncomingTransactionsSettings />
      <BatchAccountBalanceSettings />
    </ScrollView>
  );
};

export default AssetSettings;
