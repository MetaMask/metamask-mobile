import React, { useCallback } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import HeaderBase from '../../../component-library/components/HeaderBase';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../component-library/components/Buttons/ButtonIcon';
import { IconName } from '../../../component-library/components/Icons/Icon';
import { strings } from '../../../../locales/i18n';
import Tokens from '../../UI/Tokens';
import { AssetPollingProvider } from '../../hooks/AssetPolling/AssetPollingProvider';
import Engine from '../../../core/Engine';
import { DEFAULT_TOKEN_SORT_CONFIG } from '../../UI/Tokens/util/sortAssets';
import { selectHomepageSectionsV1Enabled } from '../../../selectors/featureFlagController/homepage';

const TokensFullView = () => {
  const navigation = useNavigation();
  const tw = useTailwind();
  const isHomepageSectionsV1Enabled = useSelector(
    selectHomepageSectionsV1Enabled,
  );

  useFocusEffect(
    useCallback(
      () => () => {
        if (isHomepageSectionsV1Enabled) {
          Engine.context.PreferencesController.setTokenSortConfig(
            DEFAULT_TOKEN_SORT_CONFIG,
          );
        }
      },
      [isHomepageSectionsV1Enabled],
    ),
  );

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <>
      <AssetPollingProvider />
      <SafeAreaView style={tw`flex-1 bg-default pb-4`}>
        <HeaderBase
          startAccessory={
            <ButtonIcon
              size={ButtonIconSizes.Md}
              onPress={handleBackPress}
              iconName={IconName.ArrowLeft}
              testID="back-button"
            />
          }
          style={tw`p-4`}
          twClassName="h-auto"
        >
          {strings('wallet.tokens')}
        </HeaderBase>
        <Tokens isFullView />
      </SafeAreaView>
    </>
  );
};

TokensFullView.displayName = 'TokensFullView';

export default TokensFullView;
