import React, { useCallback } from 'react';
import { Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';
import DottedUnderline from '../../../DottedUnderline';
import { LimitOrderCostToleranceTooltipSelectorsIDs } from './testIds';
import type { LimitOrderCostToleranceTooltipProps } from './types';

export const LimitOrderCostToleranceTooltip: React.FC<
  LimitOrderCostToleranceTooltipProps
> = ({ testID = LimitOrderCostToleranceTooltipSelectorsIDs.BUTTON }) => {
  const navigation = useNavigation<AppNavigationProp>();
  const tw = useTailwind();
  const { colors } = useTheme();

  const handlePress = useCallback(() => {
    navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.LIMIT_ORDER_COST_TOLERANCE_INFO_MODAL,
    });
  }, [navigation]);

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={strings('bridge.cost_tolerance')}
      style={({ pressed }) => pressed && tw.style('opacity-50')}
      testID={testID}
    >
      <DottedUnderline color={colors.text.alternative}>
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings('bridge.cost_tolerance')}
        </Text>
      </DottedUnderline>
    </Pressable>
  );
};
