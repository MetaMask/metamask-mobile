import React, { useMemo } from 'react';
import { Linking } from 'react-native';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
  BoxAlignItems,
} from '@metamask/design-system-react-native';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../../component-library/components/Icons/Icon';
import AvatarToken from '../../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import { AvatarSize } from '../../../../../../component-library/components/Avatars/Avatar';
import ManageCardListItem from '../../../components/ManageCardListItem';
import { strings } from '../../../../../../../locales/i18n';
import { CARD_SUPPORT_EMAIL } from '../../../constants';
import { FundingAssetStatus } from '../../../../../../core/Engine/controllers/card-controller/provider-types';
import type { CardFundingTokenWithBalance } from '../../../types';

interface ManageCardOptionsSlimProps {
  primaryToken: CardFundingTokenWithBalance | null;
  fundingAssetStatus: FundingAssetStatus | undefined;
  onChangeAsset: () => void;
  onManageSpendingLimit: () => void;
}

const TrailingArrow = () => (
  <Icon name={IconName.ArrowRight} size={IconSize.Md} color={IconColor.Muted} />
);

const ManageCardOptionsSlim = ({
  primaryToken,
  fundingAssetStatus,
  onChangeAsset,
  onManageSpendingLimit,
}: ManageCardOptionsSlimProps) => {
  const asset = primaryToken?.asset;
  const tokenSymbol = primaryToken?.symbol ?? '';

  const limitValue = useMemo(() => {
    switch (fundingAssetStatus) {
      case FundingAssetStatus.Active:
        return strings('card.asset_selection.enabled');
      case FundingAssetStatus.Limited:
        return strings('card.asset_selection.limited');
      default:
        return strings('card.asset_selection.not_enabled');
    }
  }, [fundingAssetStatus]);

  const handleContactSupport = () => {
    Linking.openURL(`mailto:${CARD_SUPPORT_EMAIL}`);
  };

  const changeAssetRight = (
    <Box
      twClassName="flex-row items-center gap-2"
      alignItems={BoxAlignItems.Center}
    >
      {asset ? (
        <AvatarToken
          name={asset.symbol}
          imageSource={asset.image ? { uri: asset.image } : undefined}
          size={AvatarSize.Xs}
        />
      ) : null}
      <Text
        variant={TextVariant.BodySm}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextAlternative}
      >
        {tokenSymbol}
      </Text>
      <TrailingArrow />
    </Box>
  );

  const spendingLimitRight = (
    <Box
      twClassName="flex-row items-center gap-2"
      alignItems={BoxAlignItems.Center}
    >
      <Text
        variant={TextVariant.BodySm}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextAlternative}
      >
        {limitValue}
      </Text>
      <TrailingArrow />
    </Box>
  );

  return (
    <Box twClassName="mt-4">
      <Box twClassName="px-4 pb-2">
        <Text
          variant={TextVariant.HeadingMd}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextDefault}
        >
          {strings('card.card_home.manage_card_title')}
        </Text>
      </Box>

      <ManageCardListItem
        title={strings('card.card_home.manage_card_options.change_asset')}
        rightElement={changeAssetRight}
        onPress={onChangeAsset}
      />
      <ManageCardListItem
        title={strings(
          'card.card_home.manage_card_options.manage_spending_limit',
        )}
        rightElement={spendingLimitRight}
        onPress={onManageSpendingLimit}
      />
      <ManageCardListItem
        title={strings('card.card_home.contact_support')}
        rightElement={<TrailingArrow />}
        onPress={handleContactSupport}
      />
    </Box>
  );
};

export default ManageCardOptionsSlim;
