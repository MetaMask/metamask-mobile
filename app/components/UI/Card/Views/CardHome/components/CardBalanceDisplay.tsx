import React, { useCallback } from 'react';
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
import Engine from '../../../../../../core/Engine';
import type { AssetBalanceInfo } from '../../../hooks/useAssetBalances';
import { strings } from '../../../../../../../locales/i18n';

interface CardBalanceDisplayProps {
  isLoading: boolean;
  balanceAmount: string | undefined;
  privacyMode: boolean;
  assetBalance: AssetBalanceInfo | undefined;
}

const CardBalanceDisplay = ({
  isLoading,
  balanceAmount,
  privacyMode,
  assetBalance,
}: CardBalanceDisplayProps) => {
  const tw = useTailwind();
  const { PreferencesController } = Engine.context;

  const togglePrivacy = useCallback(
    (value: boolean) => {
      PreferencesController.setPrivacyMode(value);
    },
    [PreferencesController],
  );

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
            onPress={() => togglePrivacy(!privacyMode)}
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
