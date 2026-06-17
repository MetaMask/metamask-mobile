///: BEGIN:ONLY_INCLUDE_IF(stellar)
import { errorCodes } from '@metamask/rpc-errors';
import React, { useCallback, useState } from 'react';
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
import type { InternalAccount } from '@metamask/keyring-internal-api';
import type { CaipAssetType, CaipChainId } from '@metamask/utils';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
import { strings } from '../../../../locales/i18n';
import Engine from '../../../core/Engine';
import { requestStellarChangeTrustOptAdd } from '../../../util/stellar/stellar-snap-client-requests';
import { StellarClassicTrustlineErrorBanner } from './StellarClassicTrustlineErrorBanner';

export const StellarClassicTrustlineActivateCardTestIds = {
  CONTAINER: 'stellar-classic-trustline-activate-card',
  BUTTON: 'stellar-classic-trustline-activate-button',
} as const;

export interface StellarClassicTrustlineActivateCardProps {
  visible: boolean;
  account: InternalAccount;
  chainId: CaipChainId;
  assetId: CaipAssetType;
  symbol: string;
}

export const StellarClassicTrustlineActivateCard = ({
  visible,
  account,
  chainId,
  assetId,
  symbol,
}: StellarClassicTrustlineActivateCardProps) => {
  const [isAddingTrustline, setIsAddingTrustline] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const dismissError = useCallback(() => {
    setErrorMessage(null);
  }, []);

  const handleActivateTrustline = useCallback(async () => {
    setErrorMessage(null);
    setIsAddingTrustline(true);
    try {
      const result = await requestStellarChangeTrustOptAdd({
        accountId: account.id,
        assetId,
        scope: chainId,
      });

      if (result.status === false) {
        return;
      }

      await Engine.context.MultichainBalancesController.updateBalance(
        account.id,
      );
    } catch (error: unknown) {
      const errorCode = (error as { code?: number })?.code;
      const isUserRejection =
        errorCode === errorCodes.provider.userRejectedRequest;
      if (!isUserRejection) {
        setErrorMessage(strings('stellarClassicTrustlineAddError'));
      }
    } finally {
      setIsAddingTrustline(false);
    }
  }, [account.id, assetId, chainId]);

  if (!visible) {
    return null;
  }

  return (
    <Box
      testID={StellarClassicTrustlineActivateCardTestIds.CONTAINER}
      twClassName="px-4 mt-3"
    >
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
          <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
            {strings('stellarClassicActivateOnStellarTitle', { symbol })}
          </Text>
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {strings('stellarClassicActivateOnStellarBody', { symbol })}
          </Text>
          <Button
            variant={ButtonVariants.Primary}
            size={ButtonSize.Sm}
            width={ButtonWidthTypes.Auto}
            label={strings('stellarClassicActivateOnStellarButton')}
            onPress={handleActivateTrustline}
            disabled={isAddingTrustline}
            testID={StellarClassicTrustlineActivateCardTestIds.BUTTON}
          />
        </Box>
      </Box>
      <StellarClassicTrustlineErrorBanner
        message={errorMessage}
        onDismiss={dismissError}
        testID="stellar-classic-trustline-add-error-banner"
      />
    </Box>
  );
};
///: END:ONLY_INCLUDE_IF
