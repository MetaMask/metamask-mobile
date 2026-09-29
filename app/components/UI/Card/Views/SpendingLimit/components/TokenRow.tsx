import React from 'react';
import { TouchableOpacity } from 'react-native';
import {
  Box,
  Text,
  TextVariant,
  Icon,
  IconName,
  IconSize,
  IconColor,
  BadgeWrapper,
  BadgeWrapperPosition,
  BadgeNetwork,
  AvatarToken,
  AvatarBaseSize,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../../locales/i18n';
import { CardFundingToken } from '../../../types';
import { safeFormatChainIdToHex } from '../../../util/safeFormatChainIdToHex';
import { SpendingLimitSelectors } from '../SpendingLimit.testIds';
import { getNetworkImageSource } from '../../../../../../util/networks';

export interface TokenRowProps {
  isMoneyAccountLocked: boolean;
  isMoneyAccountSource: boolean;
  selectedToken: CardFundingToken | null;
  tokenIconUrl: string | null;
  tokenLabel: string;
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

const RegularTokenChip = ({
  selectedToken,
  tokenIconUrl,
  tokenLabel,
}: Pick<TokenRowProps, 'selectedToken' | 'tokenIconUrl' | 'tokenLabel'>) => {
  const networkImage = selectedToken?.caipChainId
    ? getNetworkImageSource({
        chainId: safeFormatChainIdToHex(selectedToken.caipChainId),
      })
    : undefined;

  return (
    <Box twClassName="flex-row items-center gap-2 shrink min-w-0">
      {selectedToken && tokenIconUrl && (
        <BadgeWrapper
          position={BadgeWrapperPosition.BottomRight}
          badge={networkImage ? <BadgeNetwork src={networkImage} /> : null}
        >
          <AvatarToken
            name={selectedToken.symbol ?? ''}
            src={{ uri: tokenIconUrl }}
            size={AvatarBaseSize.Sm}
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
  onPress,
}) => {
  if (isMoneyAccountLocked || isMoneyAccountSource) {
    return null;
  }
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      testID={SpendingLimitSelectors.TOKEN_ROW}
    >
      <Box twClassName="flex-row items-center p-4">
        <RowLabel />
        <RegularTokenChip
          selectedToken={selectedToken}
          tokenIconUrl={tokenIconUrl}
          tokenLabel={tokenLabel}
        />
      </Box>
    </TouchableOpacity>
  );
};

export default TokenRow;
