import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  AvatarToken,
  AvatarTokenSize,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
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

import { strings } from '../../../../../../locales/i18n';
import { getHeaderCompactStandardNavbarOptions } from '../../../../../component-library/components-temp/HeaderCompactStandard';
import { Skeleton } from '../../../../../component-library/components-temp/Skeleton';
import {
  selectBatchSellDestStablecoinsByChain,
  selectBatchSellSourceTokens,
} from '../../../../../core/redux/slices/bridge';
import { BridgeToken } from '../../types';
import { getBatchSellDestinationToken } from '../BatchSellTokenSelect/BatchSellTokenSelect.utils';
import { BatchSellReviewSelectorsIDs } from './BatchSellReview.testIds';
import { BatchSellReviewTokenRow } from './BatchSellReviewTokenRow';

const DEFAULT_PERCENT = 100;
const UNKNOWN_DESTINATION_TOKEN_SYMBOL = 'UNKNOWN';
const HAS_QUOTES = false;

const getTokenKey = (token: BridgeToken) => `${token.chainId}:${token.address}`;

export function BatchSellReview() {
  const navigation = useNavigation();
  const tw = useTailwind();
  const selectedTokens = useSelector(selectBatchSellSourceTokens);
  const stablecoinsByChain = useSelector(selectBatchSellDestStablecoinsByChain);
  const destinationToken = useMemo(
    () =>
      selectedTokens[0]
        ? getBatchSellDestinationToken(
            selectedTokens[0].chainId,
            stablecoinsByChain,
          )
        : undefined,
    [selectedTokens, stablecoinsByChain],
  );
  const [percentsByTokenKey, setPercentsByTokenKey] = useState<
    Record<string, number>
  >({});

  useEffect(() => {
    navigation.setOptions(
      getHeaderCompactStandardNavbarOptions({
        title: '',
        onBack: () => navigation.goBack(),
        includesTopInset: true,
      }),
    );
  }, [navigation]);

  // Keep local percents aligned with selected tokens while defaulting new tokens to 100%.
  useEffect(() => {
    setPercentsByTokenKey((currentPercents) =>
      selectedTokens.reduce<Record<string, number>>((nextPercents, token) => {
        const tokenKey = getTokenKey(token);
        nextPercents[tokenKey] = currentPercents[tokenKey] ?? DEFAULT_PERCENT;
        return nextPercents;
      }, {}),
    );
  }, [selectedTokens]);

  const handlePercentChange = useCallback(
    (tokenKey: string, percent: number) => {
      setPercentsByTokenKey((currentPercents) => ({
        ...currentPercents,
        [tokenKey]: percent,
      }));
    },
    [],
  );

  return (
    <SafeAreaView style={tw.style('flex-1 bg-default')} edges={['bottom']}>
      <Box
        testID={BatchSellReviewSelectorsIDs.CONTAINER}
        twClassName="flex-1 bg-default"
      >
        <Box twClassName="px-4 pb-6">
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={1}
          >
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextDefault}
            >
              {strings('bridge.batch_sell_total_received')}
            </Text>
            <Icon
              name={IconName.Info}
              size={IconSize.Sm}
              color={IconColor.IconDefault}
            />
          </Box>
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Between}
            twClassName="mt-2"
          >
            <Skeleton
              width={195}
              height={50}
              style={tw.style('rounded-lg')}
              testID={BatchSellReviewSelectorsIDs.TOTAL_RECEIVED_SKELETON}
            />
            <Box
              testID={BatchSellReviewSelectorsIDs.DESTINATION_TOKEN_PILL}
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              gap={2}
              twClassName="rounded-xl bg-muted px-3 py-3"
            >
              <AvatarToken
                name={
                  destinationToken?.symbol ?? UNKNOWN_DESTINATION_TOKEN_SYMBOL
                }
                src={
                  destinationToken?.image
                    ? { uri: destinationToken.image }
                    : undefined
                }
                size={AvatarTokenSize.Sm}
              />
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextDefault}
              >
                {destinationToken?.symbol ?? UNKNOWN_DESTINATION_TOKEN_SYMBOL}
              </Text>
            </Box>
          </Box>
        </Box>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={tw.style('pb-4')}
        >
          {selectedTokens.map((token) => {
            const tokenKey = getTokenKey(token);

            return (
              <BatchSellReviewTokenRow
                key={tokenKey}
                token={token}
                tokenKey={tokenKey}
                percent={percentsByTokenKey[tokenKey] ?? DEFAULT_PERCENT}
                onPercentChange={handlePercentChange}
              />
            );
          })}
        </ScrollView>
        <Box twClassName="border-t border-muted px-4 pb-4 pt-3">
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            isDisabled={!HAS_QUOTES}
            testID={BatchSellReviewSelectorsIDs.REVIEW_BUTTON}
          >
            {strings('bridge.batch_sell_review')}
          </Button>
        </Box>
      </Box>
    </SafeAreaView>
  );
}
