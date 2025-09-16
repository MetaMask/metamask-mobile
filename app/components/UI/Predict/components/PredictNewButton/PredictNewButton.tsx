import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { Pressable } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextVariant,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  FontWeight,
} from '@metamask/design-system-react-native';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';

interface PredictNewButtonProps {}

const PredictNewButton: React.FC<PredictNewButtonProps> = () => {
  const navigation = useNavigation();
  const tw = useTailwind();

  const handlePress = () => {
    navigation.navigate(Routes.WALLET.HOME, {
      screen: Routes.WALLET.TAB_STACK_FLOW,
      params: {
        screen: Routes.PREDICT.ROOT,
        params: {
          screen: Routes.PREDICT.MARKET_LIST,
        },
      },
    });
  };

  return (
    <Pressable
      style={({ pressed }) =>
        tw.style('mx-3 mb-4 py-4 rounded-xl flex-row', pressed)
      }
      onPress={handlePress}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        twClassName="gap-3"
      >
        <Box twClassName="w-10 h-10 rounded-full bg-primary-default items-center justify-center">
          <Icon
            name={IconName.Add}
            size={IconSize.Md}
            color={IconColor.Default}
          />
        </Box>
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          twClassName="text-primary"
        >
          {strings('predict.tab.new_prediction')}
        </Text>
      </Box>
    </Pressable>
  );
};

export default PredictNewButton;
