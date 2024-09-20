// Third party dependencies
import React, { useCallback, useLayoutEffect } from 'react';
import { ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';

// External dependencies
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import { strings } from '../../../../../locales/i18n';
import { useStyles } from '../../../../component-library/hooks';
import AutoDetectTokensSettings from '../../Settings/AutoDetectTokensSettings';
import DisplayNFTMediaSettings from '../../Settings/DisplayNFTMediaSettings';
import AutoDetectNFTSettings from '../../Settings/AutoDetectNFTSettings';
import IPFSGatewaySettings from '../../Settings/IPFSGatewaySettings';
import IncomingTransactionsSettings from '../../Settings/IncomingTransactionsSettings';
import BatchAccountBalanceSettings from '../../Settings/BatchAccountBalanceSettings';
import ButtonIcon from '../../../../component-library/components/Buttons/ButtonIcon';
import { ButtonIconSizes } from '../../../../component-library/components/Buttons/ButtonIcon/ButtonIcon.types';

// Internal dependencies
import styleSheet from './index.styles';

const AssetSettings = () => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();

  const renderBackButton = useCallback(
    () => (
      <ButtonIcon
        size={ButtonIconSizes.Lg}
        iconName={IconName.ArrowLeft}
        accessibilityRole="button"
        accessibilityLabel="back"
        onPress={() => navigation.goBack()}
        style={styles.backButtonContainer}
      />
    ),
    [navigation, styles.backButtonContainer],
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
