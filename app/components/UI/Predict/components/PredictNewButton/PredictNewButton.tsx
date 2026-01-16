import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { Pressable } from 'react-native-gesture-handler';
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
import { PredictEventValues } from '../../constants/eventNames';

interface PredictNewButtonProps {}

const PredictNewButton: React.FC<PredictNewButtonProps> = () => {
  const navigation = useNavigation();
  const tw = useTailwind();

  const handlePress = () => {
    navigation.navigate(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_LIST,
      params: {
        entryPoint: PredictEventValues.ENTRY_POINT.HOMEPAGE_NEW_PREDICTION,
      },
    });
  };

  return (
    <Pressable
      testID="predict-new-button"
      style={({ pressed }) =>
        tw.style('mb-4 py-4 rounded-xl flex-row', pressed)
      }
      onPress={handlePress}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        twClassName="gap-4"
      >
        <Box twClassName="w-10 h-10 rounded-full bg-primary-muted items-center justify-center">
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
