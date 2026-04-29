import React, { useCallback, useMemo } from 'react';
import BigNumber from 'bignumber.js';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonIcon,
  ButtonIconSize,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import TagBase from '../../../../../component-library/base-components/TagBase';
import {
  TagSeverity,
  TagShape,
} from '../../../../../component-library/base-components/TagBase/TagBase.types';
import { TextVariant as ComponentTextVariant } from '../../../../../component-library/components/Texts/Text/Text.types';
import { strings } from '../../../../../../locales/i18n';
import { LINEA_MUSD_ASSET_FOR_MERKL } from '../../../../Views/Homepage/Sections/Cash/CashGetMusdEmptyState.constants';
import { useMerklBonusClaim } from '../../../Earn/components/MerklRewards/hooks/useMerklBonusClaim';
import { useTrackClaimBonusClicked } from '../../../Earn/components/MerklRewards/hooks/useTrackClaimBonusClicked';
import { MUSD_EVENTS_CONSTANTS } from '../../../Earn/constants/events';
import { MUSD_CONVERSION_APY } from '../../../Earn/constants/musd';
import { useMusdBalance } from '../../../Earn/hooks/useMusdBalance';
import { YourBonusCardTestIds } from './YourBonusCard.testIds';

// mUSD is USD-pegged; show all amounts in USD to match the sheet and the
// on-chain unit (avoid translating into the user's preferred fiat currency).
const formatUsd = (value: string) => `$${value}`;

const YourBonusCard: React.FC = () => {
  const trackClaimBonusClicked = useTrackClaimBonusClicked();

  const {
    claimableReward,
    lifetimeBonusClaimed,
    hasPendingClaim,
    isClaiming,
    claimRewards,
  } = useMerklBonusClaim(
    LINEA_MUSD_ASSET_FOR_MERKL,
    MUSD_EVENTS_CONSTANTS.EVENT_LOCATIONS.MONEY_HUB,
  );

  const { fiatBalanceAggregated } = useMusdBalance();

  const estimatedAnnualBonus = useMemo(
    () =>
      fiatBalanceAggregated
        ? formatUsd(
            new BigNumber(fiatBalanceAggregated)
              .multipliedBy(MUSD_CONVERSION_APY)
              .dividedBy(100)
              .toFixed(2),
          )
        : null,
    [fiatBalanceAggregated],
  );

  const lifetimeFormatted = lifetimeBonusClaimed
    ? formatUsd(lifetimeBonusClaimed)
    : null;

  const hasLifetimeBonus =
    !!lifetimeBonusClaimed && new BigNumber(lifetimeBonusClaimed).gt(0);
  const hasClaimable = !!claimableReward;
  const isClaimDisabled = isClaiming || hasPendingClaim || !hasClaimable;

  const handleClaim = useCallback(() => {
    trackClaimBonusClicked(MUSD_EVENTS_CONSTANTS.EVENT_LOCATIONS.MONEY_HUB);
    claimRewards().catch(() => undefined);
  }, [trackClaimBonusClicked, claimRewards]);

  // useMerklRewards returns '0.00' for eligible users with no history, so
  // the guard checks > 0 rather than null.
  if (!hasLifetimeBonus && !hasClaimable) {
    return null;
  }

  const claimButtonLabel = hasClaimable
    ? strings('money.your_bonus.claim_amount', {
        amount: formatUsd(claimableReward as string),
      })
    : strings('money.your_bonus.accruing_next');

  let lifetimeDisplay: string;
  if (!lifetimeFormatted) {
    lifetimeDisplay = '—';
  } else if (hasLifetimeBonus) {
    lifetimeDisplay = `+${lifetimeFormatted}`;
  } else {
    lifetimeDisplay = lifetimeFormatted;
  }

  return (
    <>
      <Box twClassName="px-4 py-3" testID={YourBonusCardTestIds.CONTAINER}>
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
          twClassName="mb-2"
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="gap-1"
          >
            <Text variant={TextVariant.HeadingMd} fontWeight={FontWeight.Bold}>
              {strings('money.your_bonus.title')}
            </Text>
            <ButtonIcon
              iconName={IconName.Info}
              size={ButtonIconSize.Md}
              accessibilityLabel={strings('money.your_bonus.info_label')}
            />
          </Box>
          <TagBase
            shape={TagShape.Rectangle}
            severity={TagSeverity.Success}
            textProps={{ variant: ComponentTextVariant.BodySMMedium }}
          >
            {strings('earn.musd_conversion.percentage_bonus', {
              percentage: MUSD_CONVERSION_APY,
            })}
          </TagBase>
        </Box>

        <Box
          flexDirection={BoxFlexDirection.Row}
          justifyContent={BoxJustifyContent.Between}
          twClassName="py-2"
        >
          <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
            {strings('money.your_bonus.estimated_annual')}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextDefault}
            testID={YourBonusCardTestIds.ESTIMATED_ANNUAL}
          >
            {estimatedAnnualBonus ?? '—'}
          </Text>
        </Box>

        <Box
          flexDirection={BoxFlexDirection.Row}
          justifyContent={BoxJustifyContent.Between}
          twClassName="py-2"
        >
          <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
            {strings('money.your_bonus.lifetime_claimed')}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={
              hasLifetimeBonus
                ? TextColor.SuccessDefault
                : TextColor.TextDefault
            }
            testID={YourBonusCardTestIds.LIFETIME_CLAIMED}
          >
            {lifetimeDisplay}
          </Text>
        </Box>

        <Box twClassName="mt-4">
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Lg}
            isFullWidth
            isDisabled={isClaimDisabled}
            onPress={handleClaim}
            testID={YourBonusCardTestIds.CLAIM_BUTTON}
          >
            {claimButtonLabel}
          </Button>
        </Box>
      </Box>
      <Box twClassName="h-px bg-border-muted my-5" />
    </>
  );
};

export default YourBonusCard;
