import React, { useCallback, useEffect } from 'react';
import { StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { Box } from '../Box/Box';
import Text, { TextVariant } from '../../../component-library/components/Texts/Text';
import { useStyles } from '../../../component-library/hooks';
import BottomSheetHeader from '../../../component-library/components/BottomSheets/BottomSheetHeader';
import BottomSheet from '../../../component-library/components/BottomSheets/BottomSheet';
import { TokenI } from '../Tokens/types';
import { Hex } from '@metamask/utils';
import { selectChainId, selectNetworkConfigurations } from '../../../selectors/networkController';
import { BridgeToken } from './types';
import { SupportedCaipChainId } from '@metamask/multichain-network-controller';
import { setSourceToken } from '../../../core/redux/slices/bridge';
import { getNetworkImageSource } from '../../../util/networks';
import Engine from '../../../core/Engine';
import Icon, { IconName } from '../../../component-library/components/Icons/Icon';
import { IconSize } from '../../../component-library/components/Icons/Icon/Icon.types';
import { TokenSelectorItem } from './TokenSelectorItem';
import { useSourceTokens } from './useSourceTokens';
import { strings } from '../../../../locales/i18n';
import { FlexDirection, AlignItems, JustifyContent } from '../Box/box.types';

interface BridgeTokenSelectorProps {
  onClose?: () => void;
}

const createStyles = () => StyleSheet.create({
    content: {
      flex: 1,
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
    },
    closeButton: {
      position: 'absolute',
      right: 0,
    },
    closeIconBox: {
      padding: 8,
    },
    listContent: {
      padding: 4,
    },
  });

export const BridgeTokenSelector: React.FC<BridgeTokenSelectorProps> = () => {
  const { styles, theme } = useStyles(createStyles, {});
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const currentChainId = useSelector(selectChainId) as Hex;
  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const tokensList = useSourceTokens();

  useEffect(() => {
    const { BridgeController } = Engine.context;
    BridgeController.setBridgeFeatureFlags();
  }, []);

  const handleTokenPress = useCallback((token: TokenI) => {
    const bridgeToken: BridgeToken = {
      address: token.address,
      symbol: token.symbol,
      image: token.image,
      decimals: token.decimals,
      chainId: token.chainId as SupportedCaipChainId,
    };

    dispatch(setSourceToken(bridgeToken));
    navigation.goBack();
  }, [dispatch, navigation]);

  const getNetworkBadgeDetails = useCallback((chainId: Hex) => {
    const network = networkConfigurations[chainId];
    return {
      name: network?.name || '',
      //@ts-expect-error - The utils/network file is still JS and this function expects a networkType, and should be optional
      imageSource: getNetworkImageSource({ chainId }),
    };
  }, [networkConfigurations]);

  const renderItem = useCallback(({ item: token }: { item: TokenI }) => {
    const networkDetails = getNetworkBadgeDetails(currentChainId);

    return (
      <TokenSelectorItem
        token={token}
        onPress={handleTokenPress}
        networkName={networkDetails.name}
        networkImageSource={networkDetails.imageSource}
      />
    );
  }, [currentChainId, getNetworkBadgeDetails, handleTokenPress]);

  const keyExtractor = useCallback((token: TokenI) => token.address, []);

  return (
    <BottomSheet isFullscreen>
      <Box style={styles.content} >
        <BottomSheetHeader>
          <Box
            flexDirection={FlexDirection.Row}
            alignItems={AlignItems.center}
            justifyContent={JustifyContent.center}
          >
            <Text variant={TextVariant.HeadingMD} style={styles.headerTitle}>
              {strings('bridge.select_token')}
            </Text>
            <Box style={[styles.closeButton, styles.closeIconBox]}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                testID="bridge-token-selector-close-button"
              >
                <Icon
                  name={IconName.Close}
                  size={IconSize.Sm}
                  color={theme.colors.icon.default}
                />
              </TouchableOpacity>
            </Box>
          </Box>
        </BottomSheetHeader>

        <FlatList
          data={tokensList}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          removeClippedSubviews
          maxToRenderPerBatch={10}
          windowSize={10}
          initialNumToRender={20}
        />
      </Box>
    </BottomSheet>
  );
};
