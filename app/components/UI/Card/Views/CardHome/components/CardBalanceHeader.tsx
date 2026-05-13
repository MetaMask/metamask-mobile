import React from 'react';
import { TouchableOpacity } from 'react-native';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  BoxAlignItems,
} from '@metamask/design-system-react-native';
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
import { strings } from '../../../../../../../locales/i18n';
import {
  TOKEN_BALANCE_LOADING,
  TOKEN_BALANCE_LOADING_UPPERCASE,
} from '../../../../Tokens/constants';

interface CardBalanceHeaderProps {
  isLoading: boolean;
  balanceAmount: string | undefined;
  privacyMode: boolean;
  onTogglePrivacy: (next: boolean) => void;
}

const CardBalanceHeader = ({
  isLoading,
  balanceAmount,
  privacyMode,
  onTogglePrivacy,
}: CardBalanceHeaderProps) => {
  const tw = useTailwind();

  const isBalanceLoading =
    isLoading ||
    balanceAmount === TOKEN_BALANCE_LOADING ||
    balanceAmount === TOKEN_BALANCE_LOADING_UPPERCASE;

  return (
    <Box
      alignItems={BoxAlignItems.Start}
      twClassName="w-full pt-2 pb-4 px-4 gap-1"
    >
      <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
        {strings('card.card_home.available_balance')}
      </Text>
      <Box
        twClassName="flex-row items-center gap-2"
        alignItems={BoxAlignItems.Center}
      >
        {isBalanceLoading ? (
          <Skeleton height={44} width={180} style={tw.style('rounded-xl')} />
        ) : (
          <SensitiveText
            isHidden={privacyMode}
            length={SensitiveTextLength.Long}
            variant={ComponentTextVariant.DisplayLG}
          >
            {balanceAmount ?? '0'}
          </SensitiveText>
        )}
        {!isBalanceLoading && (
          <TouchableOpacity
            onPress={() => onTogglePrivacy(!privacyMode)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon
              name={privacyMode ? IconName.EyeSlash : IconName.Eye}
              size={IconSize.Md}
              color={IconColor.Alternative}
            />
          </TouchableOpacity>
        )}
      </Box>
    </Box>
  );
};

export default CardBalanceHeader;
