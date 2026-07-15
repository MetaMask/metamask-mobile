///: BEGIN:ONLY_INCLUDE_IF(stellar)
import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
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
import type { CaipAssetType } from '@metamask/utils';
import Routes from '../../../constants/navigation/Routes';
import NotificationManager from '../../../core/NotificationManager';

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
  const navigation = useNavigation();
  const assetId = token.address as CaipAssetType | undefined;
  const { activateAsset, isActivating } = useAssetActivation({
    assetId,
    assetSymbol: token.symbol,
  });

  const handleActivate = useCallback(async () => {
    const { success, errorMessage } = await activateAsset();

    if (errorMessage) {
      NotificationManager.showSimpleNotification({
        status: 'error',
        duration: 5000,
        title: strings('transactions.activity_trustline_activation_failed'),
        description: errorMessage,
      });
      return;
    }

    if (success) {
      navigation.navigate(Routes.TRANSACTIONS_VIEW);
    }
  }, [activateAsset, navigation]);

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
            onPress={handleActivate}
            disabled={isActivating}
            testID={AssetActivateCardTestIds.BUTTON}
          />
        </Box>
      </Box>
    </Box>
  );
};
///: END:ONLY_INCLUDE_IF
