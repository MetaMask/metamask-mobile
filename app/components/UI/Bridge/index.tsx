import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import { selectChainId } from '../../../selectors/networkController';
import ScreenView from '../../Base/ScreenView';
import { Numpad } from './Numpad';
import { TokenInputArea } from './TokenInputArea';
import { ReceiveAddress } from './ReceiveAddress';
import Button, { ButtonVariants } from '../../../component-library/components/Buttons/Button';
import { useStyles } from '../../../component-library/hooks';
import { Theme } from '../../../util/theme/models';
import { Box } from '../Box/Box';
import { FlexDirection, JustifyContent, AlignItems } from '../Box/box.types';
import Text, { TextColor } from '../../../component-library/components/Texts/Text';
import ETHLogo from '../../../images/eth-logo-new.png';
import BTCLogo from '../../../images/bitcoin-logo.png';
import images from '../../../images/image-icons';
import { SupportedCaipChainId } from '@metamask/multichain-network-controller';
import { Hex } from '@metamask/utils';
import { isTestNet, getTestNetImageByChainId, isMainnetByChainId, isLineaMainnetByChainId } from '../../../util/networks';
import { PopularList, UnpopularNetworkList, CustomNetworkImgMapping } from '../../../util/networks/customNetworks';
import { ZERO_ADDRESS } from '@metamask/assets-controllers/dist/token-prices-service/codefi-v2.cjs';

const getNetworkImage = (chainId: SupportedCaipChainId | Hex) => {
  if (isTestNet(chainId)) return getTestNetImageByChainId(chainId);
  if (isMainnetByChainId(chainId)) return images.ETHEREUM;
  if (isLineaMainnetByChainId(chainId)) return images['LINEA-MAINNET'];

  if (CustomNetworkImgMapping[chainId as Hex]) {
    return CustomNetworkImgMapping[chainId as Hex];
  }

  const unpopularNetwork = UnpopularNetworkList.find(
    (networkConfig) => networkConfig.chainId === chainId,
  );

  const popularNetwork = PopularList.find(
    (networkConfig) => networkConfig.chainId === chainId,
  );

  const network = unpopularNetwork || popularNetwork;
  if (network) {
    return network.rpcPrefs.imageSource;
  }

  return undefined;
};

const createStyles = (params: { theme: Theme }) => {
  const { theme } = params;
  return StyleSheet.create({
    content: {
      flexGrow: 1,
    },
    inputsContainer: {
      paddingVertical: 12,
    },
    buttonContainer: {
      width: '100%',
    },
    button: {
      width: '100%',
    },
    bottomSection: {
      padding: 24,
    },
    arrowContainer: {
      position: 'relative',
      alignItems: 'center',
      height: 1,
      backgroundColor: theme.colors.border.muted,
    },
    arrowCircle: {
      position: 'absolute',
      top: -16,
      backgroundColor: theme.colors.background.alternative,
      width: 32,
      height: 32,
      borderRadius: 16,
      display: 'flex',
    },
    arrow: {
      fontSize: 20,
      color: theme.colors.text.default,
      lineHeight: 20,
      height: 20,
      includeFontPadding: false,
      textAlignVertical: 'center',
      paddingTop: 1,
    },
  });
};

const BridgeView = () => {
  const { styles } = useStyles(createStyles, {});

  const currentChainId = useSelector(selectChainId);

  const [sourceAmount, setSourceAmount] = useState<string>();
  const [destAmount] = useState<string>();
  const [sourceTokenAddress] = useState<string>(ZERO_ADDRESS);
  const [destTokenAddress] = useState<string>();
  const [sourceChainId] = useState<SupportedCaipChainId | Hex>(currentChainId);
  const [destChainId] = useState<SupportedCaipChainId | Hex>();

  const handleNumberPress = (num: string) => {
    setSourceAmount((prev) => {
      if (!prev || prev === '0') return num;
      return prev + num;
    });
  };

  const handleBackspacePress = () => {
    setSourceAmount((prev) => {
      if (!prev) return undefined;
      const newAmount = prev.slice(0, -1);
      return newAmount || undefined;
    });
  };

  const handleDecimalPress = () => {
    setSourceAmount((prev) => {
      if (!prev) return '0.';
      if (prev.includes('.')) return prev;
      return prev + '.';
    });
  };

  const handleContinue = () => {
    // TODO: Implement bridge transaction with source and destination amounts
  };

  const handleTermsPress = () => {
    // TODO: Implement terms and conditions navigation
  };

  return (
    <ScreenView>
      <Box
        style={styles.content}
        flexDirection={FlexDirection.Column}
        justifyContent={JustifyContent.spaceBetween}
      >
        <Box style={styles.inputsContainer} gap={8}>
          <TokenInputArea
            value={sourceAmount}
            tokenSymbol="ETH"
            tokenBalance="0.5"
            tokenIconUrl={ETHLogo}
            tokenAddress={sourceTokenAddress}
            networkImageSource={getNetworkImage(sourceChainId)}
            autoFocus
          />
          <Box style={styles.arrowContainer}>
            <Box
              style={styles.arrowCircle}
              alignItems={AlignItems.center}
              justifyContent={JustifyContent.center}
            >
              <Text style={styles.arrow}>↓</Text>
            </Box>
          </Box>
          <TokenInputArea
            value={destAmount}
            tokenSymbol="BTC"
            tokenAddress={destTokenAddress}
            tokenIconUrl={BTCLogo}
            networkImageSource={destChainId ? getNetworkImage(destChainId) : undefined}
            isReadonly
          />
        </Box>
        <Box style={styles.bottomSection}>
          {/* TODO Just a placeholder for now */}
          {false && <ReceiveAddress address={undefined} />}

          <Numpad
            onNumberPress={handleNumberPress}
            onBackspacePress={handleBackspacePress}
            onDecimalPress={handleDecimalPress}
          />
          <Box
            style={styles.buttonContainer}
            flexDirection={FlexDirection.Column}
            justifyContent={JustifyContent.center}
            alignItems={AlignItems.center}
            gap={12}
          >
            <Button
              variant={ButtonVariants.Primary}
              label="Continue"
              onPress={handleContinue}
              style={styles.button}
            />
            <Button
              variant={ButtonVariants.Link}
              label={<Text color={TextColor.Alternative}>Terms & Conditions</Text>}
              onPress={handleTermsPress}
            />
          </Box>
        </Box>
      </Box>
    </ScreenView>
  );
};

export default BridgeView;
