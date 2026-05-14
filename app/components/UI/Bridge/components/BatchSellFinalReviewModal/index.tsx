import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { useState } from 'react';
import { Pressable } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  AvatarToken,
  AvatarTokenSize,
  BottomSheet,
  BottomSheetHeader,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonIconSize,
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

import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { useParams } from '../../../../../util/navigation/navUtils';
import { BatchSellQuoteDetails } from '../BatchSellQuoteDetailsModal';
import { BatchSellFinalReviewModalSelectorsIDs } from './BatchSellFinalReviewModal.testIds';
import {
  BatchSellFinalReviewModalParams,
  BatchSellFinalReviewSourceTokenData,
} from './BatchSellFinalReviewModal.types';

const MAX_VISIBLE_SOURCE_TOKEN_AVATARS = 5;
const SOURCE_TOKEN_AVATAR_OVERLAP = 12;

function SourceTokenAvatarStack({
  sourceTokens,
}: {
  sourceTokens: BatchSellFinalReviewSourceTokenData[];
}) {
  const tw = useTailwind();

  return (
    <Box flexDirection={BoxFlexDirection.Row} alignItems={BoxAlignItems.Center}>
      {sourceTokens
        .slice(0, MAX_VISIBLE_SOURCE_TOKEN_AVATARS)
        .map((sourceToken, index) => (
          <Box
            key={sourceToken.key}
            style={
              index === 0
                ? undefined
                : tw.style({ marginLeft: -SOURCE_TOKEN_AVATAR_OVERLAP })
            }
          >
            <AvatarToken
              name={sourceToken.tokenSymbol}
              src={sourceToken.image ? { uri: sourceToken.image } : undefined}
              size={AvatarTokenSize.Sm}
              testID={`${BatchSellFinalReviewModalSelectorsIDs.SOURCE_TOKEN_AVATAR}-${sourceToken.key}`}
            />
          </Box>
        ))}
    </Box>
  );
}

function YouSellRow({
  sourceTokens,
  isTokenDetailsExpanded,
  onToggleTokenDetails,
}: {
  sourceTokens: BatchSellFinalReviewSourceTokenData[];
  isTokenDetailsExpanded: boolean;
  onToggleTokenDetails: () => void;
}) {
  const tw = useTailwind();

  return (
    <Box
      testID={BatchSellFinalReviewModalSelectorsIDs.YOU_SELL_ROW}
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      gap={1}
      paddingHorizontal={4}
      paddingVertical={3}
    >
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextAlternative}
      >
        {strings('bridge.batch_sell_you_sell')}
      </Text>
      <Pressable
        onPress={onToggleTokenDetails}
        accessibilityLabel={strings('bridge.batch_sell_toggle_you_sell')}
        accessibilityRole="button"
        testID={BatchSellFinalReviewModalSelectorsIDs.YOU_SELL_TOGGLE_BUTTON}
        style={({ pressed }) =>
          tw.style('flex-row items-center gap-2 bg-transparent p-0', {
            opacity: pressed ? 0.7 : 1,
          })
        }
      >
        <SourceTokenAvatarStack sourceTokens={sourceTokens} />
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextDefault}
        >
          {strings('bridge.batch_sell_token_count', {
            tokenCount: sourceTokens.length,
          })}
        </Text>
        <Icon
          name={isTokenDetailsExpanded ? IconName.ArrowUp : IconName.ArrowDown}
          size={IconSize.Sm}
          color={IconColor.IconAlternative}
        />
      </Pressable>
    </Box>
  );
}

function NetworkFeeRow({
  networkFee,
  networkFeeFiat,
}: {
  networkFee: string;
  networkFeeFiat: string;
}) {
  return (
    <Box
      testID={BatchSellFinalReviewModalSelectorsIDs.NETWORK_FEE_ROW}
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      paddingHorizontal={4}
      paddingVertical={3}
      twClassName="border-t border-muted"
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={1}
      >
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
        >
          {strings('bridge.network_fee')}
        </Text>
        <Icon
          name={IconName.Info}
          size={IconSize.Sm}
          color={IconColor.IconAlternative}
        />
      </Box>
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.End}
        gap={2}
        twClassName="min-w-0 flex-1"
      >
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
          numberOfLines={1}
        >
          {networkFee}
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextDefault}
          numberOfLines={1}
        >
          {networkFeeFiat}
        </Text>
      </Box>
    </Box>
  );
}

export function BatchSellFinalReviewModal() {
  const navigation =
    useNavigation<StackNavigationProp<Record<string, object | undefined>>>();
  const params = useParams<BatchSellFinalReviewModalParams>();
  const [isTokenDetailsExpanded, setIsTokenDetailsExpanded] = useState(true);

  const handleToggleTokenDetails = () => {
    setIsTokenDetailsExpanded((isExpanded) => !isExpanded);
  };

  const handleOpenMinimumReceivedInfo = () => {
    navigation.replace(
      Routes.BRIDGE.MODALS.BATCH_SELL_MINIMUM_RECEIVED_INFO_MODAL,
      {
        sourceModal: {
          screen: Routes.BRIDGE.MODALS.BATCH_SELL_FINAL_REVIEW_MODAL,
          params,
        },
      },
    );
  };

  return (
    <BottomSheet
      testID={BatchSellFinalReviewModalSelectorsIDs.SHEET}
      goBack={navigation.goBack}
    >
      <BottomSheetHeader
        onClose={navigation.goBack}
        closeButtonProps={{
          size: ButtonIconSize.Md,
          testID: BatchSellFinalReviewModalSelectorsIDs.CLOSE_BUTTON,
        }}
      >
        {strings('bridge.batch_sell_review')}
      </BottomSheetHeader>
      <YouSellRow
        sourceTokens={params.sourceTokens}
        isTokenDetailsExpanded={isTokenDetailsExpanded}
        onToggleTokenDetails={handleToggleTokenDetails}
      />
      <BatchSellQuoteDetails
        tokenData={params.tokenData}
        totalReceived={params.totalReceived}
        minimumReceived={params.minimumReceived}
        isLoading={params.isLoading}
        isTokenDetailsExpanded={isTokenDetailsExpanded}
        onMinimumReceivedInfoPress={handleOpenMinimumReceivedInfo}
      />
      <NetworkFeeRow
        networkFee={params.networkFee}
        networkFeeFiat={params.networkFeeFiat}
      />
      <Box paddingHorizontal={4} paddingTop={4} paddingBottom={4} gap={2}>
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          testID={BatchSellFinalReviewModalSelectorsIDs.SELL_ALL_BUTTON}
        >
          {strings('bridge.batch_sell_sell_all')}
        </Button>
        <Text
          variant={TextVariant.BodyXs}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
          twClassName="text-center"
          testID={BatchSellFinalReviewModalSelectorsIDs.METAMASK_FEE_DISCLOSURE}
        >
          {strings('bridge.batch_sell_includes_metamask_fee', {
            fee: params.metamaskFeePercent,
          })}
        </Text>
      </Box>
    </BottomSheet>
  );
}
