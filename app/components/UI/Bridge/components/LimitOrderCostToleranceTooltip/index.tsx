import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  ButtonIcon,
  ButtonIconSize,
  IconColor,
  IconName,
} from '@metamask/design-system-react-native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import { LimitOrderCostToleranceTooltipSelectorsIDs } from './testIds';
import type { LimitOrderCostToleranceTooltipProps } from './types';

export const LimitOrderCostToleranceTooltip: React.FC<
  LimitOrderCostToleranceTooltipProps
> = ({ testID = LimitOrderCostToleranceTooltipSelectorsIDs.BUTTON }) => {
  const navigation = useNavigation<AppNavigationProp>();

  const handlePress = useCallback(() => {
    navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.LIMIT_ORDER_COST_TOLERANCE_INFO_MODAL,
    });
  }, [navigation]);

  return (
    <ButtonIcon
      iconName={IconName.Info}
      iconProps={{ color: IconColor.IconAlternative }}
      size={ButtonIconSize.Sm}
      onPress={handlePress}
      testID={testID}
      accessibilityLabel={strings('bridge.cost_tolerance')}
      accessibilityRole="button"
    />
  );
};
