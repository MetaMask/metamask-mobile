import React, { useMemo } from 'react';
import {
  Box,
  Icon,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import { StyleSheet, TouchableOpacity } from 'react-native';
import type { NavbarOverrides } from '../../../Views/confirmations/components/UI/navbar/navbar';
import { PredictBuyPreviewHeaderTitle } from '../components/PredictBuyPreviewHeader/PredictBuyPreviewHeader';
import { PredictOutcomeToken } from '../types';

export interface PredictMarketHeaderParams {
  marketTitle?: string;
  outcomeImage?: string;
  outcomeGroupTitle?: string;
  outcomeToken?: PredictOutcomeToken;
  backgroundColor: string;
}

const styles = StyleSheet.create({
  headerTitleWrapper: {
    marginTop: 34,
    marginLeft: -20,
  },
  emptyHeaderTitle: {
    height: 96,
  },
  headerLeftButton: {
    marginTop: 34,
    marginLeft: 16,
  },
});

export const getPredictMarketHeader = ({
  marketTitle,
  outcomeImage,
  outcomeGroupTitle,
  outcomeToken,
  backgroundColor,
}: PredictMarketHeaderParams): NavbarOverrides => ({
  headerTitleAlign: 'left',
  headerTitle: () =>
    outcomeToken ? (
      <Box style={styles.headerTitleWrapper}>
        <PredictBuyPreviewHeaderTitle
          title={marketTitle ?? ''}
          outcomeImage={outcomeImage}
          outcomeGroupTitle={outcomeGroupTitle ?? ''}
          outcomeToken={outcomeToken}
        />
      </Box>
    ) : (
      <Box style={styles.emptyHeaderTitle} />
    ),
  headerLeft: (onBackPress: () => void) => (
    <TouchableOpacity onPress={onBackPress} style={styles.headerLeftButton}>
      <Icon name={IconName.ArrowLeft} size={IconSize.Md} />
    </TouchableOpacity>
  ),
  headerStyle: {
    backgroundColor,
  },
});

export const usePredictMarketHeader = (
  params: PredictMarketHeaderParams,
): NavbarOverrides => {
  const {
    backgroundColor,
    marketTitle,
    outcomeGroupTitle,
    outcomeImage,
    outcomeToken,
  } = params;

  return useMemo(
    () =>
      getPredictMarketHeader({
        backgroundColor,
        marketTitle,
        outcomeGroupTitle,
        outcomeImage,
        outcomeToken,
      }),
    [
      backgroundColor,
      marketTitle,
      outcomeGroupTitle,
      outcomeImage,
      outcomeToken,
    ],
  );
};
