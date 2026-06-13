import React, { useCallback } from 'react';
import {
  Box,
  BoxFlexDirection,
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
import MusdConversionAssetRow from '../../../Earn/components/Musd/MusdConversionAssetRow';
import { AssetType } from '../../../../Views/confirmations/types/token';
import { MoneyConvertStablecoinsTestIds } from './MoneyConvertStablecoins.testIds';
import { CaipChainId, Hex } from '@metamask/utils';
import { useSelector } from 'react-redux';
import {
  createTokenChainKey,
  selectHasInFlightMusdConversion,
  selectHasUnapprovedMusdConversion,
  selectMusdConversionStatuses,
} from '../../../Earn/selectors/musdConversionStatus';
import { useMusdConversionTokens } from '../../../Earn/hooks/useMusdConversionTokens';
import { useMusdConversion } from '../../../Earn/hooks/useMusdConversion';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { MUSD_EVENTS_CONSTANTS } from '../../../Earn/constants/events/musdEvents';
import { getNetworkName } from '../../../Earn/utils/network';
import Logger from '../../../../../util/Logger';

const { EVENT_LOCATIONS: MUSD_EVENT_LOCATIONS } = MUSD_EVENTS_CONSTANTS;

interface MoneyConvertStablecoinsProps {
  location: string;
}

const FEATURE_TAGS = [
  'money.convert_stablecoins.tag_dollar_backed',
  'money.convert_stablecoins.tag_no_lockups',
  'money.convert_stablecoins.tag_no_fee',
  'money.convert_stablecoins.tag_daily_bonus',
  'money.convert_stablecoins.tag_metamask_stablecoin',
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
  location,
}: MoneyConvertStablecoinsProps) => {
  const { tokens } = useMusdConversionTokens();
  const { initiateMaxConversion, initiateCustomConversion } =
    useMusdConversion();
  const { trackEvent, createEventBuilder } = useAnalytics();

  const hasTokens = tokens.length > 0;

  const handleMaxPress = useCallback(
    async (token: AssetType) => {
      try {
        trackEvent(
          createEventBuilder(
            MetaMetricsEvents.MONEY_HUB_TOKEN_ROW_CONVERT_CLICKED,
          )
            .addProperties({
              location,
              button_type: 'text_button',
              button_action: 'max',
              button_text: strings('earn.musd_conversion.max'),
              redirects_to:
                MUSD_EVENT_LOCATIONS.QUICK_CONVERT_MAX_BOTTOM_SHEET_CONFIRMATION_SCREEN,
              asset_symbol: token.symbol,
              network_chain_id: token.chainId,
              network_name: token.chainId
                ? getNetworkName(token.chainId as Hex)
                : 'unknown',
            })
            .build(),
        );
        await initiateMaxConversion(token);
      } catch (error) {
        Logger.error(error as Error, {
          message:
            '[MoneyConvertStablecoins] Failed to initiate max conversion',
        });
      }
    },
    [createEventBuilder, initiateMaxConversion, location, trackEvent],
  );

  const handleEditPress = useCallback(
    async (token: AssetType) => {
      try {
        trackEvent(
          createEventBuilder(
            MetaMetricsEvents.MONEY_HUB_TOKEN_ROW_CONVERT_CLICKED,
          )
            .addProperties({
              location,
              button_type: 'icon_button',
              icon: IconName.Edit,
              button_action: 'custom',
              redirects_to: MUSD_EVENT_LOCATIONS.CUSTOM_AMOUNT_SCREEN,
              asset_symbol: token.symbol,
              network_chain_id: token.chainId,
              network_name: token.chainId
                ? getNetworkName(token.chainId as Hex)
                : 'unknown',
            })
            .build(),
        );

        await initiateCustomConversion({
          preferredPaymentToken: {
            address: token.address as Hex,
            chainId: token.chainId as Hex,
          },
        });
      } catch (error) {
        Logger.error(error as Error, {
          message:
            '[MoneyConvertStablecoins] Failed to initiate custom conversion',
        });
      }
    },
    [createEventBuilder, initiateCustomConversion, location, trackEvent],
  );

  const hasUnapprovedMusdConversion = useSelector(
    selectHasUnapprovedMusdConversion,
  );
  const hasInFlightMusdConversion = useSelector(
    selectHasInFlightMusdConversion,
  );

  const conversionStatusesByTokenChainKey = useSelector(
    selectMusdConversionStatuses,
  );

  const isConversionPending = (token: AssetType) => {
    const tokenAddress = token.address;
    const tokenChainId = token.chainId;

    const tokenChainKey =
      tokenAddress && tokenChainId
        ? createTokenChainKey(tokenAddress, tokenChainId)
        : undefined;

    const txStatusInfo = tokenChainKey
      ? conversionStatusesByTokenChainKey[tokenChainKey]
      : undefined;

    return Boolean(txStatusInfo?.isPending);
  };

  return (
    <Box testID={MoneyConvertStablecoinsTestIds.CONTAINER}>
      <Box twClassName="px-4 pt-3">
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
              <MusdConversionAssetRow
                token={token}
                onMaxPress={handleMaxPress}
                onEditPress={handleEditPress}
                areActionsDisabled={
                  hasUnapprovedMusdConversion || hasInFlightMusdConversion
                }
                isConversionPending={isConversionPending(token)}
              />
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default MoneyConvertStablecoins;
