///: BEGIN:ONLY_INCLUDE_IF(stellar)
import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
import { strings } from '../../../../locales/i18n';
import type { TokenI } from '../Tokens/types';
import { useAssetActivation } from '../TokenDetails/hooks/useAssetActivation';
import { AssetActivationErrorToast } from './AssetActivationErrorToast';

export const AssetActivateCardTestIds = {
  CONTAINER: 'asset-activate-card',
  BUTTON: 'asset-activate-button',
} as const;

export interface AssetActivateCardProps {
  token: TokenI;
  chainName: string;
}

export const AssetActivateCard = ({
  token,
  chainName,
}: AssetActivateCardProps) => {
  const { activateAsset, isActivating, errorMessage, dismissErrorMessage } =
    useAssetActivation({
      token,
    });

  return (
    <Box testID={AssetActivateCardTestIds.CONTAINER} twClassName="px-4 mt-3">
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Start}
        twClassName="rounded-xl bg-warning-muted p-4 gap-3"
      >
        <Icon
          name={IconName.Danger}
          size={IconSize.Lg}
          color={IconColor.WarningDefault}
        />
        <Box flexDirection={BoxFlexDirection.Column} twClassName="flex-1 gap-2">
          <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Regular}>
            {strings('asset_activation.activate_description', {
              symbol: token.symbol,
              chainName,
            })}
          </Text>
          <Button
            variant={ButtonVariants.Primary}
            size={ButtonSize.Sm}
            width={ButtonWidthTypes.Auto}
            label={strings('asset_activation.activate')}
            onPress={activateAsset}
            disabled={isActivating}
            testID={AssetActivateCardTestIds.BUTTON}
          />
        </Box>
      </Box>
      <AssetActivationErrorToast
        message={errorMessage}
        onClose={dismissErrorMessage}
      />
    </Box>
  );
};
///: END:ONLY_INCLUDE_IF
