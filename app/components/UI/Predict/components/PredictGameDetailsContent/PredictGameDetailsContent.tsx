import React from 'react';
import { RefreshControl } from 'react-native';
import { Pressable } from 'react-native-gesture-handler';
import { ScrollView } from 'react-native-gesture-handler';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  Text,
  TextVariant,
  TextColor,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import { useTheme } from '../../../../../util/theme';
import { strings } from '../../../../../../locales/i18n';
import PredictShareButton from '../PredictShareButton/PredictShareButton';
import { PredictGameDetailsContentProps } from './PredictGameDetailsContent.types';

const PredictGameDetailsContent: React.FC<PredictGameDetailsContentProps> = ({
  market,
  onBack,
  onRefresh,
  refreshing,
}) => {
  const tw = useTailwind();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView
      style={tw.style('flex-1 bg-default')}
      edges={['left', 'right', 'bottom']}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        twClassName="px-4 py-3"
        style={{ paddingTop: insets.top + 12 }}
      >
        <Pressable
          onPress={onBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel={strings('predict.buttons.back')}
        >
          <Icon
            name={IconName.ArrowLeft}
            size={IconSize.Lg}
            color={colors.icon.default}
          />
        </Pressable>

        <Box twClassName="flex-1 mx-4">
          <Text
            variant={TextVariant.HeadingMd}
            color={TextColor.TextDefault}
            style={tw.style('text-center')}
            numberOfLines={1}
          >
            {market.title}
          </Text>
        </Box>

        <PredictShareButton marketId={market.id} />
      </Box>

      <ScrollView
        style={tw.style('flex-1')}
        contentContainerStyle={tw.style('flex-1')}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary.default}
            colors={[colors.primary.default]}
          />
        }
      >
        <Box twClassName="flex-1" />
      </ScrollView>
    </SafeAreaView>
  );
};

export default PredictGameDetailsContent;
