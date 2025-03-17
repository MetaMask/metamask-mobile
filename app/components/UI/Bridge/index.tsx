import React, { useEffect, useMemo } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import ScreenView from '../../Base/ScreenView';
import Keypad from '../../Base/Keypad';
import { TokenInputArea } from './TokenInputArea';
import Button, { ButtonVariants } from '../../../component-library/components/Buttons/Button';
import { useStyles } from '../../../component-library/hooks';
import { Theme } from '../../../util/theme/models';
import { Box } from '../Box/Box';
import { FlexDirection, JustifyContent, AlignItems } from '../Box/box.types';
import Text, { TextColor } from '../../../component-library/components/Texts/Text';
import Icon, { IconName, IconSize } from '../../../component-library/components/Icons/Icon';
import { getNetworkImageSource } from '../../../util/networks';
import { useLatestBalance } from './useLatestBalance';
import {
  selectSourceAmount,
  selectDestAmount,
  selectSourceChainId,
  selectDestChainId,
  selectSourceToken,
  selectDestToken,
  setSourceAmount,
  resetBridgeState,
  switchTokens,
} from '../../../core/redux/slices/bridge';
import { ethers } from 'ethers';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getBridgeNavbar } from '../Navbar';
import { useTheme } from '../../../util/theme';
import { strings } from '../../../../locales/i18n';
import useSubmitBridgeTx from '../../../util/bridge/hooks/useSubmitBridgeTx';
import { QuoteResponse } from './types';

const createStyles = (params: { theme: Theme }) => {
  const { theme } = params;
  return StyleSheet.create({
    content: {
      flexGrow: 1,
    },
    screen: {
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
      alignItems: 'center',
      justifyContent: 'center',
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

// We get here through handleBridgeNavigation in AssetOverview and WalletActions
const BridgeView = () => {
  const { styles } = useStyles(createStyles, {});
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const route = useRoute();
  const { colors } = useTheme();
  const { submitBridgeTx } = useSubmitBridgeTx();

  // Bridge state from Redux
  const sourceToken = useSelector(selectSourceToken);
  const destToken = useSelector(selectDestToken);
  const sourceAmount = useSelector(selectSourceAmount);
  const destAmount = useSelector(selectDestAmount);
  const sourceChainId = useSelector(selectSourceChainId);
  const destChainId = useSelector(selectDestChainId);

  const sourceBalance = useLatestBalance({
    address: sourceToken?.address,
    decimals: sourceToken?.decimals,
  }, sourceChainId);

  const hasInsufficientBalance = useMemo(() => {
    if (!sourceAmount || !sourceBalance?.atomicBalance || !sourceToken?.decimals) {
      return false;
    }

    const sourceAmountAtomic = ethers.utils.parseUnits(sourceAmount, sourceToken.decimals);
    return sourceAmountAtomic.gt(sourceBalance.atomicBalance);
  }, [sourceAmount, sourceBalance?.atomicBalance, sourceToken?.decimals]);

  // Reset bridge state when component unmounts
  useEffect(() => () => {
      dispatch(resetBridgeState());
    }, [dispatch]);

  useEffect(() => {
    navigation.setOptions(getBridgeNavbar(navigation, route, colors));
  }, [navigation, route, colors]);

  const handleKeypadChange = ({ value }: { value: string; valueAsNumber: number; pressedKey: string }) => {
    dispatch(setSourceAmount(value || undefined));
  };

  const handleContinue = () => {
    // TODO: Implement bridge transaction with source and destination amounts
    // TESTING: Paste a quote from the Bridge API here to test the bridge flow
    const quoteResponse = undefined;
    if (quoteResponse) {
        submitBridgeTx({quoteResponse: quoteResponse as QuoteResponse});
    }
  };

  const handleTermsPress = () => {
    // TODO: Implement terms and conditions navigation
  };

  const handleArrowPress = () => {
    if (destChainId && destToken) {
      dispatch(switchTokens());
    }
  };

  const renderBottomContent = () => {
    if (!sourceAmount || (sourceToken?.decimals && ethers.utils.parseUnits(sourceAmount, sourceToken.decimals).isZero())) {
      return (
        <Text color={TextColor.Alternative}>
          Select amount
        </Text>
      );
    }

    if (hasInsufficientBalance) {
      return (
        <Text color={TextColor.Error}>
          Insufficient balance
        </Text>
      );
    }

    return (
      <>
        <Button
          variant={ButtonVariants.Primary}
          label={strings('bridge.continue')}
          onPress={handleContinue}
          style={styles.button}
        />
        <Button
          variant={ButtonVariants.Link}
          label={<Text color={TextColor.Alternative}>{strings('bridge.terms_and_conditions')}</Text>}
          onPress={handleTermsPress}
        />
      </>
    );
  };

  return (
    // Need this to be full height of screen
    // @ts-expect-error The type is incorrect, this will work
    <ScreenView contentContainerStyle={styles.screen}>
      <Box
        style={styles.content}
        flexDirection={FlexDirection.Column}
        justifyContent={JustifyContent.spaceBetween}
      >
        <Box style={styles.inputsContainer} gap={8}>
          <TokenInputArea
            value={sourceAmount}
            tokenSymbol={sourceToken?.symbol}
            tokenBalance={sourceBalance?.displayBalance}
            tokenIconUrl={sourceToken?.image}
            tokenAddress={sourceToken?.address}
            //@ts-expect-error - The utils/network file is still JS and this function expects a networkType, and should be optional
            networkImageSource={getNetworkImageSource({ chainId: sourceChainId })}
            autoFocus
            isReadonly
            testID="source-token-area"
          />
          <Box style={styles.arrowContainer}>
            <TouchableOpacity
              onPress={handleArrowPress}
              disabled={!destChainId || !destToken}
              style={styles.arrowCircle}
            >
              <Text style={styles.arrow}>↓</Text>
            </TouchableOpacity>
          </Box>
          <TokenInputArea
            value={destAmount}
            tokenSymbol={destToken?.symbol}
            tokenAddress={destToken?.address}
            tokenIconUrl={destToken?.image}
            //@ts-expect-error - The utils/network file is still JS and this function expects a networkType, and should be optional
            networkImageSource={destChainId ? getNetworkImageSource({ chainId: destChainId }) : undefined}
            isReadonly
            testID="dest-token-area"
          />
        </Box>
        <Box style={styles.bottomSection}>
          <Keypad
            value={sourceAmount}
            onChange={handleKeypadChange}
            currency={sourceToken?.symbol || 'ETH'}
            decimals={sourceToken?.decimals || 18}
            deleteIcon={<Icon name={IconName.ArrowLeft} size={IconSize.Lg} />}
          />
          <Box
            style={styles.buttonContainer}
            flexDirection={FlexDirection.Column}
            justifyContent={JustifyContent.center}
            alignItems={AlignItems.center}
            gap={12}
          >
            {renderBottomContent()}
          </Box>
        </Box>
      </Box>
    </ScreenView>
  );
};

export default BridgeView;
