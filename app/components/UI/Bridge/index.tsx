import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import ScreenView from '../../Base/ScreenView';
import { Numpad } from './Numpad';
import { TokenInputArea } from './TokenInputArea';
import Button, { ButtonVariants } from '../../../component-library/components/Buttons/Button';
import { useStyles } from '../../../component-library/hooks';
import { Theme } from '../../../util/theme/models';
import { Box } from '../Box/Box';
import { FlexDirection, JustifyContent, AlignItems } from '../Box/box.types';
import Text, { TextColor } from '../../../component-library/components/Texts/Text';
import ETHLogo from '../../../images/eth-logo-new.png';
import BTCLogo from '../../../images/bitcoin-logo.png';

interface BridgeState {
  sourceAmount: string;
  destinationAmount: string;
}

const createStyles = (_: { theme: Theme }) => StyleSheet.create({
    content: {
      flexGrow: 1,
    },
    inputsContainer: {
    },
    buttonContainer: {
      width: '100%',
      padding: 24,
    },
    button: {
      width: '100%',
    },
    arrow: {
      fontSize: 24,
      textAlign: 'center',
      marginVertical: 8,
    },
  });

const BridgeView = () => {
  const [state, setState] = useState<BridgeState>({
    sourceAmount: '0',
    destinationAmount: '0',
  });

  const { styles } = useStyles(createStyles, {});

  const handleNumberPress = (num: string) => {
    setState((prev) => ({
      ...prev,
      sourceAmount: prev.sourceAmount === '0' ? num : prev.sourceAmount + num,
      destinationAmount: prev.sourceAmount === '0' ? num : prev.sourceAmount + num,
    }));
  };

  const handleBackspacePress = () => {
    setState((prev) => ({
      ...prev,
      sourceAmount: prev.sourceAmount.slice(0, -1) || '0',
      destinationAmount: prev.sourceAmount.slice(0, -1) || '0',
    }));
  };

  const handleDecimalPress = () => {
    setState((prev) => {
      if (prev.sourceAmount.includes('.')) return prev;
      return {
        ...prev,
        sourceAmount: prev.sourceAmount + '.',
        destinationAmount: prev.sourceAmount + '.',
      };
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
        <Box style={styles.inputsContainer}>
          <TokenInputArea
            value={state.sourceAmount}
            tokenSymbol="ETH"
            tokenAddress="0x32...2939"
            tokenIconUrl={ETHLogo}
          />
          <Text style={styles.arrow}>↓</Text>
          <TokenInputArea
            value={state.destinationAmount}
            tokenSymbol="BTC"
            tokenAddress="0x32...2939"
            tokenIconUrl={BTCLogo}
          />
        </Box>
        <Box>
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
