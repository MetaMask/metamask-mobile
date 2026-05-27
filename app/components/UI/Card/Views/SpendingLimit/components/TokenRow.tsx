import React from 'react';
import { Image, TouchableOpacity } from 'react-native';
import {
  Box,
  Text,
  TextVariant,
  Icon,
  IconName,
  IconSize,
  IconColor,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../../locales/i18n';
import AvatarToken from '../../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import { AvatarSize } from '../../../../../../component-library/components/Avatars/Avatar';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../../component-library/components/Badges/BadgeWrapper';
import Badge, {
  BadgeVariant,
} from '../../../../../../component-library/components/Badges/Badge';
import { NetworkBadgeSource } from '../../../../AssetOverview/Balance/Balance';
import { CardFundingToken } from '../../../types';
import { safeFormatChainIdToHex } from '../../../util/safeFormatChainIdToHex';
import { LINEA_CAIP_CHAIN_ID } from '../../../util/buildTokenList';
import musdAssetIcon from '../../../../../../images/musd-icon-2x.png';
import { SpendingLimitSelectors } from '../SpendingLimit.testIds';

export interface TokenRowProps {
  isMoneyAccountLocked: boolean;
  isMoneyAccountSource: boolean;
  selectedToken: CardFundingToken | null;
  tokenIconUrl: string | null;
  tokenLabel: string;
  moneyAccountTokenDisplayLabel: string;
  onPress: () => void;
}

const RowLabel = () => (
  <Text variant={TextVariant.BodyMd} twClassName="flex-1 text-text-alternative">
    {strings('card.card_spending_limit.token_label')}
  </Text>
);

const Chevron = () => {
  const tw = useTailwind();
  return (
    <Icon
      name={IconName.ArrowDown}
      size={IconSize.Md}
      color={IconColor.IconDefault}
      style={tw.style('self-center shrink-0')}
    />
  );
};

const MoneyAccountTokenChip = ({
  label,
  showChevron,
}: {
  label: string;
  showChevron: boolean;
}) => {
  const tw = useTailwind();
  return (
    <Box twClassName="flex-row items-center gap-2 shrink min-w-0">
      <Image
        source={musdAssetIcon}
        style={tw.style('w-6 h-6 rounded-full')}
        resizeMode="contain"
      />
      <Text
        variant={TextVariant.BodyMd}
        twClassName="text-text-default font-medium self-center shrink"
        numberOfLines={1}
      >
        {label}
      </Text>
      {showChevron && <Chevron />}
    </Box>
  );
};

const RegularTokenChip = ({
  selectedToken,
  tokenIconUrl,
  tokenLabel,
}: Pick<TokenRowProps, 'selectedToken' | 'tokenIconUrl' | 'tokenLabel'>) => {
  const tw = useTailwind();
  return (
    <Box twClassName="flex-row items-center gap-2 shrink min-w-0">
      {selectedToken && tokenIconUrl && (
        <BadgeWrapper
          badgePosition={BadgePosition.BottomRight}
          style={tw.style('self-center')}
          badgeElement={
            <Badge
              variant={BadgeVariant.Network}
              imageSource={NetworkBadgeSource(
                safeFormatChainIdToHex(
                  selectedToken.caipChainId ?? LINEA_CAIP_CHAIN_ID,
                ) as `0x${string}`,
              )}
            />
          }
        >
          <AvatarToken
            name={selectedToken.symbol ?? ''}
            imageSource={{ uri: tokenIconUrl }}
            size={AvatarSize.Xs}
          />
        </BadgeWrapper>
      )}
      <Text
        variant={TextVariant.BodyMd}
        twClassName="text-text-default font-medium self-center shrink"
        numberOfLines={1}
      >
        {tokenLabel}
      </Text>
      <Chevron />
    </Box>
  );
};

const TokenRow: React.FC<TokenRowProps> = ({
  isMoneyAccountLocked,
  isMoneyAccountSource,
  selectedToken,
  tokenIconUrl,
  tokenLabel,
  moneyAccountTokenDisplayLabel,
  onPress,
}) => {
  if (isMoneyAccountLocked) {
    return (
      <Box
        twClassName="flex-row items-center p-4"
        testID={SpendingLimitSelectors.TOKEN_ROW_LOCKED}
      >
        <RowLabel />
        <MoneyAccountTokenChip
          label={moneyAccountTokenDisplayLabel}
          showChevron={false}
        />
      </Box>
    );
  }
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      testID={SpendingLimitSelectors.TOKEN_ROW}
    >
      <Box twClassName="flex-row items-center p-4">
        <RowLabel />
        {isMoneyAccountSource ? (
          <MoneyAccountTokenChip
            label={moneyAccountTokenDisplayLabel}
            showChevron={false}
          />
        ) : (
          <RegularTokenChip
            selectedToken={selectedToken}
            tokenIconUrl={tokenIconUrl}
            tokenLabel={tokenLabel}
          />
        )}
      </Box>
    </TouchableOpacity>
  );
};

export default TokenRow;
