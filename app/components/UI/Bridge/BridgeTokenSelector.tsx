import React, { useCallback, useEffect } from 'react';
import { StyleSheet, FlatList, View, TouchableOpacity } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { Box } from '../Box/Box';
import Text, { TextVariant } from '../../../component-library/components/Texts/Text';
import { useStyles } from '../../../component-library/hooks';
import { Theme } from '../../../util/theme/models';
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

interface BridgeTokenSelectorProps {
  onClose?: () => void;
}

const createStyles = (params: { theme: Theme }) => {
  const { theme } = params;
  return StyleSheet.create({
    content: {
      padding: 24,
      backgroundColor: theme.colors.background.default,
      flex: 1,
    },
    ethLogo: {
      width: 40,
      height: 40,
    },
    balances: {
      flex: 1,
      marginLeft: 8,
    },
    assetName: {
      flexDirection: 'column',
    },
    tokenSymbol: {
      marginBottom: 4,
    },
    listContent: {
      paddingBottom: 24,
    },
    headerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '100%',
      position: 'relative',
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
    },
    closeIcon: {
      padding: 8,
      position: 'absolute',
      right: 0,
    },
  });
};

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
        styles={styles}
      />
    );
  }, [currentChainId, getNetworkBadgeDetails, handleTokenPress, styles]);

  const keyExtractor = useCallback((token: TokenI) => token.address, []);

  return (
    <BottomSheet isFullscreen>
      <Box style={styles.content}>
        <BottomSheetHeader>
          <View style={styles.headerContainer}>
            <Text variant={TextVariant.HeadingMD} style={styles.headerTitle}>
              {strings('bridge.select_token')}
            </Text>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeIcon} testID="bridge-token-selector-close-button">
              <Icon
                name={IconName.Close}
                size={IconSize.Sm}
                color={theme.colors.icon.default}
              />
            </TouchableOpacity>
          </View>
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
