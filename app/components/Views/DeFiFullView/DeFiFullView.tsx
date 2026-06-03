import React, { useCallback } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import HeaderBase from '../../../component-library/components/HeaderBase';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../component-library/components/Buttons/ButtonIcon';
import { IconName } from '../../../component-library/components/Icons/Icon';
import { strings } from '../../../../locales/i18n';
import { Box } from '@metamask/design-system-react-native';
import DeFiPositionsList from '../../UI/DeFiPositions/DeFiPositionsList';
import Engine from '../../../core/Engine';
import { DEFAULT_TOKEN_SORT_CONFIG } from '../../UI/Tokens/util/sortAssets';

const DeFiFullView = () => {
  const navigation = useNavigation();
  const tw = useTailwind();

  useFocusEffect(
    useCallback(
      () => () => {
        Engine.context.PreferencesController.setTokenSortConfig(
          DEFAULT_TOKEN_SORT_CONFIG,
        );
      },
      [],
    ),
  );

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <SafeAreaView style={tw`flex-1 bg-default pb-4`}>
      <HeaderBase
        startAccessory={
          <ButtonIcon
            size={ButtonIconSizes.Lg}
            onPress={handleBackPress}
            iconName={IconName.ArrowLeft}
            testID="back-button"
          />
        }
        style={tw`p-4`}
        twClassName="h-auto"
      >
        {strings('homepage.sections.defi')}
      </HeaderBase>
      <Box twClassName="flex-1 px-4">
        <DeFiPositionsList
          tabLabel={strings('homepage.sections.defi')}
          isFullView
        />
      </Box>
    </SafeAreaView>
  );
};

export default DeFiFullView;
