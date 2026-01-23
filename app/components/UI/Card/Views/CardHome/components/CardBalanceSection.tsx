import React, { useMemo } from 'react';
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
import { Skeleton } from '../../../../../../component-library/components/Skeleton';
import CardAssetItem from '../../../components/CardAssetItem';
import { strings } from '../../../../../../../locales/i18n';
import { CardHomeSelectors } from '../CardHome.testIds';
import {
  TOKEN_BALANCE_LOADING,
  TOKEN_BALANCE_LOADING_UPPERCASE,
  TOKEN_RATE_UNDEFINED,
} from '../../../../Tokens/constants';
import type { CardAssetBalance } from '../CardHome.types';

interface CardBalanceSectionProps {
  /** Whether the balance is currently loading */
  isLoading: boolean;
  /** Whether setup is needed (hides the balance section) */
  needsSetup: boolean;
  /** Whether KYC is pending (hides the balance section) */
  isKYCPending: boolean;
  /** Whether privacy mode is enabled */
  privacyMode: boolean;
  /** Asset balance information */
  assetBalance: CardAssetBalance | null;
  /** Callback to toggle privacy mode */
  onTogglePrivacyMode: (value: boolean) => void;
}

/**
 * CardBalanceSection Component
 *
 * Displays the card balance with privacy controls and asset information.
 */
const CardBalanceSection = ({
  isLoading,
  needsSetup,
  isKYCPending,
  privacyMode,
  assetBalance,
  onTogglePrivacyMode,
}: CardBalanceSectionProps) => {
  const tw = useTailwind();

  const { asset, balanceFiat, balanceFormatted } = assetBalance ?? {};

  const balanceAmount = useMemo(() => {
    if (!balanceFiat || balanceFiat === TOKEN_RATE_UNDEFINED) {
      return balanceFormatted;
    }
    return balanceFiat;
  }, [balanceFiat, balanceFormatted]);

  const isBalanceLoading =
    isLoading ||
    balanceAmount === TOKEN_BALANCE_LOADING ||
    balanceAmount === TOKEN_BALANCE_LOADING_UPPERCASE;

  // Hide balance section for setup states (no card/delegation or KYC pending)
  const shouldHide = needsSetup || isKYCPending;

  return (
    <Box
      style={tw.style(
        'items-center justify-between flex-row w-full mt-4',
        shouldHide && 'hidden',
      )}
    >
      <Box twClassName="flex-col">
        <Box twClassName="flex-row items-center gap-2">
          <SensitiveText
            isHidden={privacyMode}
            length={SensitiveTextLength.Long}
            variant={ComponentTextVariant.HeadingMD}
          >
            {isBalanceLoading ? (
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
            onPress={() => onTogglePrivacyMode(!privacyMode)}
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
          asset={asset}
          privacyMode={privacyMode}
          balanceFormatted={balanceFormatted}
        />
      )}
    </Box>
  );
};

export default CardBalanceSection;
