import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useMusdConversionEligibility } from './useMusdConversionEligibility';
import { selectIsMusdConversionFlowEnabledFlag } from '../selectors/featureFlags';
import { MUSD_CONVERSION_APY, isMusdToken } from '../constants/musd';
import { TextColor } from '../../../../component-library/components/Texts/Text';
import { strings } from '../../../../../locales/i18n';
import type { TokenI } from '../../Tokens/types';

export interface BonusSecondaryBalance {
  text: string;
  color: TextColor;
  onPress: undefined;
}

/**
 * Encapsulates the mUSD campaign bonus display state for a token list item.
 *
 * Covers the case where the user *already holds* mUSD and the campaign bonus
 * row should be shown beneath the token name (success-green APY text).
 *
 * Returns null for `bonusSecondaryBalance` when the bonus row does not apply,
 * signalling to the consumer to check other display sources.
 */
export const useMusdBonusTokenListItem = ({
  asset,
}: {
  asset: TokenI | undefined;
}) => {
  const isMusdConversionFlowEnabled = useSelector(
    selectIsMusdConversionFlowEnabledFlag,
  );
  const { isEligible: isMusdGeoEligible } = useMusdConversionEligibility();

  const isMusdAsset = !!asset && isMusdToken(asset.address);
  const showMusdBonusRow =
    isMusdAsset && isMusdConversionFlowEnabled && isMusdGeoEligible;

  const bonusSecondaryBalance = useMemo(
    (): BonusSecondaryBalance | null =>
      showMusdBonusRow
        ? {
            text: strings('earn.musd_conversion.percentage_bonus', {
              percentage: MUSD_CONVERSION_APY,
            }),
            color: TextColor.Success,
            onPress: undefined,
          }
        : null,
    [showMusdBonusRow],
  );

  return { isMusdAsset, bonusSecondaryBalance };
};
