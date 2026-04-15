import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import SensitiveText, {
  SensitiveTextLength,
} from '../../../../../../component-library/components/Texts/SensitiveText';
import { TextVariant as ComponentTextVariant } from '../../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../../component-library/components/Icons/Icon';
import { Skeleton } from '../../../../../../component-library/components-temp/Skeleton';
import CardAssetItem from '../../../components/CardAssetItem';
import { CardHomeSelectors } from '../CardHome.testIds';
import {
  TOKEN_BALANCE_LOADING,
  TOKEN_BALANCE_LOADING_UPPERCASE,
} from '../../../../Tokens/constants';
import type { TokenI } from '../../../../Tokens/types';
import { strings } from '../../../../../../../locales/i18n';

// Minimal structural type — satisfied by both AssetBalanceInfo and CardAssetWithBalance.
interface CardBalanceDisplayData {
  asset?: TokenI;
  balanceFormatted?: string;
}

interface CardBalanceDisplayProps {
  isLoading: boolean;
  balanceAmount: string | undefined;
  privacyMode: boolean;
  assetBalance: CardBalanceDisplayData | undefined;
  onTogglePrivacy: (value: boolean) => void;
}

const CardBalanceDisplay = ({
  isLoading,
  balanceAmount,
  privacyMode,
  assetBalance,
  onTogglePrivacy,
}: CardBalanceDisplayProps) => {
  const tw = useTailwind();

  return (
    <Box twClassName="items-center justify-between flex-row w-full mt-4">
      <Box twClassName="flex-col">
        <Box twClassName="flex-row items-center gap-2">
          <SensitiveText
            isHidden={privacyMode}
            length={SensitiveTextLength.Long}
            variant={ComponentTextVariant.HeadingMD}
          >
            {isLoading ||
            balanceAmount === TOKEN_BALANCE_LOADING ||
            balanceAmount === TOKEN_BALANCE_LOADING_UPPERCASE ? (
              <Skeleton
                height={28}
                width={100}
                style={tw.style('rounded-xl')}
                testID={CardHomeSelectors.BALANCE_SKELETON}
              />
            ) : (
              (balanceAmount ?? '0')
            )}
          </SensitiveText>
          <TouchableOpacity
            onPress={() => onTogglePrivacy(!privacyMode)}
            testID={CardHomeSelectors.PRIVACY_TOGGLE_BUTTON}
            style={tw.style(isLoading ? 'hidden' : '')}
          >
            <Icon
              name={privacyMode ? IconName.EyeSlash : IconName.Eye}
              size={IconSize.Md}
              color={IconColor.Default}
            />
          </TouchableOpacity>
        </Box>
        <Text
          variant={TextVariant.BodySm}
          twClassName={`text-text-alternative ${isLoading ? 'hidden' : ''}`}
        >
          {strings('card.card_home.available_balance')}
        </Text>
      </Box>
      {isLoading ? (
        <Skeleton
          height={40}
          width={40}
          style={tw.style('rounded-full')}
          testID={CardHomeSelectors.CARD_ASSET_ITEM_SKELETON}
        />
      ) : (
        <CardAssetItem
          asset={assetBalance?.asset}
          privacyMode={privacyMode}
          balanceFormatted={assetBalance?.balanceFormatted}
        />
      )}
    </Box>
  );
};

export default CardBalanceDisplay;
