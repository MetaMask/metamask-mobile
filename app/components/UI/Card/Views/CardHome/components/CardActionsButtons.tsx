import React from 'react';
import {
  Box,
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Skeleton } from '../../../../../../component-library/components-temp/Skeleton';
import { strings } from '../../../../../../../locales/i18n';
import { CardHomeSelectors } from '../CardHome.testIds';
import type { CardAction } from '../../../../../../core/Engine/controllers/card-controller/provider-types';

interface CardActionsButtonsProps {
  actions: CardAction[];
  isLoading: boolean;
  isSwapEnabled: boolean;
  onAddFunds: () => void;
  onChangeAsset: () => void;
  onEnableCard: () => void;
}

const CardActionsButtons = ({
  actions,
  isLoading,
  isSwapEnabled,
  onAddFunds,
  onChangeAsset,
  onEnableCard,
}: CardActionsButtonsProps) => {
  const tw = useTailwind();

  if (isLoading) {
    return (
      <Skeleton
        height={28}
        width={'100%'}
        style={tw.style('rounded-xl')}
        testID={CardHomeSelectors.ADD_FUNDS_BUTTON_SKELETON}
      />
    );
  }

  if (actions.length === 0) return null;

  const enableAction = actions.find((a) => a.type === 'enable_card');
  if (enableAction) {
    return (
      <Button
        variant={ButtonVariant.Primary}
        size={ButtonSize.Lg}
        onPress={onEnableCard}
        isFullWidth
        testID={CardHomeSelectors.ENABLE_CARD_BUTTON}
      >
        {strings('card.card_home.enable_card_button_label')}
      </Button>
    );
  }

  return (
    <Box twClassName="w-full gap-2 flex-row justify-between items-center">
      {actions.map((action) => {
        switch (action.type) {
          case 'add_funds':
            return (
              <Button
                key="add_funds"
                variant={ButtonVariant.Primary}
                style={tw.style('w-1/2', !isSwapEnabled && 'opacity-50')}
                size={ButtonSize.Lg}
                onPress={onAddFunds}
                isFullWidth
                isDisabled={!isSwapEnabled}
                testID={CardHomeSelectors.ADD_FUNDS_BUTTON}
              >
                {strings('card.card_home.add_funds')}
              </Button>
            );
          case 'change_asset':
            return (
              <Button
                key="change_asset"
                variant={ButtonVariant.Primary}
                style={tw.style('w-1/2')}
                size={ButtonSize.Lg}
                onPress={onChangeAsset}
                isFullWidth
                testID={CardHomeSelectors.CHANGE_ASSET_BUTTON}
              >
                {strings('card.card_home.change_asset')}
              </Button>
            );
          default:
            return null;
        }
      })}
    </Box>
  );
};

export default CardActionsButtons;
