import React from 'react';
import {
  Box,
  BoxFlexDirection,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import TagBase from '../../../../../component-library/base-components/TagBase';
import {
  TagShape,
  TagSeverity,
} from '../../../../../component-library/base-components/TagBase/TagBase.types';
import { TextVariant as ComponentTextVariant } from '../../../../../component-library/components/Texts/Text/Text.types';
import AvatarGroup from '../../../../../component-library/components/Avatars/AvatarGroup';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar';
import { AvatarVariant } from '../../../../../component-library/components/Avatars/Avatar/Avatar.types';
import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';
import { buildTokenIconUrl } from '../../../Card/util/buildTokenIconUrl';
import ConvertTokenRow from '../../../Earn/components/Musd/ConvertTokenRow';
import { AssetType } from '../../../../Views/confirmations/types/token';
import { MoneyConvertStablecoinsTestIds } from './MoneyConvertStablecoins.testIds';
import { CaipChainId } from '@metamask/utils';

interface MoneyConvertStablecoinsProps {
  tokens: AssetType[];
  onMaxPress: (token: AssetType) => void;
  onEditPress: (token: AssetType) => void;
  onLearnMorePress: () => void;
}

const FEATURE_TAGS = [
  'money.convert_stablecoins.tag_dollar_backed',
  'money.convert_stablecoins.tag_no_lockups',
  'money.convert_stablecoins.tag_no_fee',
  'money.convert_stablecoins.tag_daily_bonus',
] as const;

const ETHEREUM_CAIP = 'eip155:1' as CaipChainId;
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const DAI_ADDRESS = '0x6B175474E89094C44Da98b954EedeAC495271d0F';

const STABLECOIN_AVATAR_PROPS = [
  {
    variant: AvatarVariant.Token as const,
    name: 'USDC',
    imageSource: { uri: buildTokenIconUrl(ETHEREUM_CAIP, USDC_ADDRESS) },
  },
  {
    variant: AvatarVariant.Token as const,
    name: 'USDT',
    imageSource: { uri: buildTokenIconUrl(ETHEREUM_CAIP, USDT_ADDRESS) },
  },
  {
    variant: AvatarVariant.Token as const,
    name: 'DAI',
    imageSource: { uri: buildTokenIconUrl(ETHEREUM_CAIP, DAI_ADDRESS) },
  },
];

const FeatureTags = () => {
  const { themeAppearance } = useTheme();
  const tagBackgroundColor =
    themeAppearance === 'dark'
      ? 'rgba(255, 255, 255, 0.04)'
      : 'rgba(0, 0, 0, 0.04)';

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      twClassName="flex-wrap gap-2 mt-4"
      testID={MoneyConvertStablecoinsTestIds.FEATURE_TAGS}
    >
      {FEATURE_TAGS.map((tag) => (
        <TagBase
          key={tag}
          style={{ backgroundColor: tagBackgroundColor }}
          shape={TagShape.Rectangle}
          severity={TagSeverity.Neutral}
          gap={4}
          startAccessory={
            <Icon
              name={IconName.CheckBold}
              size={IconSize.Sm}
              color={IconColor.SuccessDefault}
            />
          }
          textProps={{
            variant: ComponentTextVariant.BodySMMedium,
          }}
        >
          {strings(tag)}
        </TagBase>
      ))}
    </Box>
  );
};

const Description = () => (
  <Text
    variant={TextVariant.BodyMd}
    fontWeight={FontWeight.Regular}
    color={TextColor.TextAlternative}
    twClassName="mt-3"
    testID={MoneyConvertStablecoinsTestIds.DESCRIPTION}
  >
    {strings('money.convert_stablecoins.description_prefix')}
    <Text
      variant={TextVariant.BodyMd}
      fontWeight={FontWeight.Medium}
      color={TextColor.SuccessDefault}
    >
      {strings('money.convert_stablecoins.description_bonus')}
    </Text>
    {strings('money.convert_stablecoins.description_suffix')}
  </Text>
);

const MoneyConvertStablecoins = ({
  tokens,
  onMaxPress,
  onEditPress,
  onLearnMorePress,
}: MoneyConvertStablecoinsProps) => {
  const hasTokens = tokens.length > 0;

  return (
    <Box testID={MoneyConvertStablecoinsTestIds.CONTAINER}>
      <Box twClassName="px-4">
        {!hasTokens && (
          <Box
            twClassName="mb-4"
            testID={MoneyConvertStablecoinsTestIds.TOKEN_ICONS}
          >
            <AvatarGroup
              avatarPropsList={STABLECOIN_AVATAR_PROPS}
              size={AvatarSize.Md}
              includesBorder={false}
            />
          </Box>
        )}
        <Text variant={TextVariant.HeadingMd} fontWeight={FontWeight.Bold}>
          {strings('money.convert_stablecoins.title')}
        </Text>
        <Description />
        <FeatureTags />
      </Box>

      {hasTokens && (
        <Box twClassName="mt-3">
          {tokens.map((token) => (
            <Box key={`${token.address}-${token.chainId}`} twClassName="px-4">
              <ConvertTokenRow
                token={token}
                onMaxPress={onMaxPress}
                onEditPress={onEditPress}
              />
            </Box>
          ))}
        </Box>
      )}

      <Box twClassName="px-4 mt-3">
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={onLearnMorePress}
          testID={MoneyConvertStablecoinsTestIds.LEARN_MORE_CTA}
        >
          {strings('money.convert_stablecoins.learn_more')}
        </Button>
      </Box>
    </Box>
  );
};

export default MoneyConvertStablecoins;
