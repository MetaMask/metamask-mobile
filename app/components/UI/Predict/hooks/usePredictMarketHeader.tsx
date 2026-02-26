import React, { useCallback, useMemo } from 'react';
import {
  Box,
  Icon,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { TouchableOpacity } from 'react-native';
import type { NavbarOverrides } from '../../../Views/confirmations/components/UI/navbar/navbar';
import { PredictBuyPreviewHeaderTitle } from '../components/PredictBuyPreviewHeader/PredictBuyPreviewHeader';
import { PredictOutcomeToken } from '../types';

interface UsePredictMarketHeaderParams {
  marketTitle?: string;
  outcomeImage?: string;
  outcomeGroupTitle?: string;
  outcomeToken?: PredictOutcomeToken;
  backgroundColor: string;
}

export const usePredictMarketHeader = ({
  marketTitle,
  outcomeImage,
  outcomeGroupTitle,
  outcomeToken,
  backgroundColor,
}: UsePredictMarketHeaderParams): NavbarOverrides => {
  const tw = useTailwind();

  const renderHeaderTitle = useCallback(
    () =>
      outcomeToken ? (
        <Box twClassName="mt-8 -ml-5">
          <PredictBuyPreviewHeaderTitle
            title={marketTitle ?? ''}
            outcomeImage={outcomeImage}
            outcomeGroupTitle={outcomeGroupTitle ?? ''}
            outcomeToken={outcomeToken}
          />
        </Box>
      ) : (
        <Box twClassName="h-24" />
      ),
    [marketTitle, outcomeImage, outcomeGroupTitle, outcomeToken],
  );

  const renderHeaderLeft = useCallback(
    (onBackPress: () => void) => (
      <TouchableOpacity onPress={onBackPress} style={tw.style('mt-8 ml-4')}>
        <Icon name={IconName.ArrowLeft} size={IconSize.Md} />
      </TouchableOpacity>
    ),
    [tw],
  );

  return useMemo<NavbarOverrides>(
    () => ({
      headerTitleAlign: 'left',
      headerTitle: renderHeaderTitle,
      headerLeft: renderHeaderLeft,
      headerStyle: {
        backgroundColor,
      },
    }),
    [backgroundColor, renderHeaderLeft, renderHeaderTitle],
  );
};
