import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Box, HeaderStandard } from '@metamask/design-system-react-native';
import ScreenView from '../../../../Base/ScreenView';
import {
  TokenInputArea,
  TokenInputAreaType,
} from '../../components/TokenInputArea';
import { FLipQuoteButton } from '../../components/FlipQuoteButton/index.tsx';
import QuoteDetailsCardSkeleton from '../../components/QuoteDetailsCard/QuoteDetailsCardSkeleton';
import { useStyles } from '../../../../../component-library/hooks';
import { getNetworkImageSource } from '../../../../../util/networks';
import { BridgeToken, BridgeViewMode } from '../../types';
import { createStyles } from './BridgeView.styles';
import { BridgeViewSelectorsIDs } from './BridgeView.testIds';
import { getHeaderTitle } from './BridgeView.utils';

export const DeferredBridgeViewPlaceholder = ({
  bridgeViewMode,
  sourceToken,
  destToken,
  sourceAmount,
}: {
  bridgeViewMode?: BridgeViewMode;
  sourceToken?: BridgeToken;
  destToken?: BridgeToken;
  sourceAmount?: string;
}) => {
  const { styles } = useStyles(createStyles);
  const navigation = useNavigation();

  return (
    <SafeAreaView
      style={styles.screenWrapper}
      edges={['bottom', 'left', 'right']}
    >
      <HeaderStandard
        title={getHeaderTitle(bridgeViewMode)}
        onBack={() => navigation.goBack()}
        includesTopInset
      />
      <ScreenView safeAreaEdges={[]} contentContainerStyle={styles.screen}>
        <Box style={styles.content}>
          <ScrollView
            testID={BridgeViewSelectorsIDs.BRIDGE_VIEW_SCROLL}
            style={styles.scrollView}
            contentContainerStyle={styles.scrollViewContent}
            showsVerticalScrollIndicator={false}
          >
            <Box style={styles.inputsContainer}>
              <Box style={styles.inputCardsWrapper}>
                <Box style={styles.tokenCard}>
                  <TokenInputArea
                    amount={sourceAmount}
                    token={sourceToken}
                    networkImageSource={
                      sourceToken
                        ? getNetworkImageSource({ chainId: sourceToken.chainId })
                        : undefined
                    }
                    testID={BridgeViewSelectorsIDs.SOURCE_TOKEN_AREA}
                    tokenType={TokenInputAreaType.Source}
                    isSourceToken
                    shouldFetchExchangeRate={false}
                  />
                </Box>
                <FLipQuoteButton onPress={() => undefined} disabled />
                <Box style={styles.tokenCard}>
                  <TokenInputArea
                    token={destToken}
                    networkImageSource={
                      destToken
                        ? getNetworkImageSource({ chainId: destToken.chainId })
                        : undefined
                    }
                    testID={BridgeViewSelectorsIDs.DESTINATION_TOKEN_AREA}
                    tokenType={TokenInputAreaType.Destination}
                    isLoading
                    style={styles.destTokenArea}
                    shouldFetchExchangeRate={false}
                  />
                </Box>
              </Box>
            </Box>
            <Box style={styles.loadingContainer}>
              <QuoteDetailsCardSkeleton />
            </Box>
          </ScrollView>
        </Box>
      </ScreenView>
    </SafeAreaView>
  );
};
