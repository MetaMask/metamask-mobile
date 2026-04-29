import React, { useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Box,
  BoxFlexDirection,
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { MoneyFooterTestIds } from './MoneyFooter.testIds';
import createStyles from './MoneyFooter.styles';

export type MoneyFooterVariant = 'add-money' | 'swap-buy';

interface MoneyFooterProps {
  variant?: MoneyFooterVariant;
  onAddMoneyPress?: () => void;
  onSwapPress?: () => void;
  onBuyPress?: () => void;
}

const MoneyFooter = ({
  variant = 'add-money',
  onAddMoneyPress = () => undefined,
  onSwapPress = () => undefined,
  onBuyPress = () => undefined,
}: MoneyFooterProps) => {
  const { bottom } = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(bottom), [bottom]);

  return (
    <Box
      twClassName="px-4 pt-4 bg-default"
      style={styles.container}
      testID={MoneyFooterTestIds.CONTAINER}
    >
      {variant === 'swap-buy' ? (
        <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-3">
          <Box twClassName="flex-1">
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Lg}
              isFullWidth
              onPress={onSwapPress}
              testID={MoneyFooterTestIds.SWAP_BUTTON}
            >
              {strings('money.footer.swap')}
            </Button>
          </Box>
          <Box twClassName="flex-1">
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Lg}
              isFullWidth
              onPress={onBuyPress}
              testID={MoneyFooterTestIds.BUY_BUTTON}
            >
              {strings('money.footer.buy')}
            </Button>
          </Box>
        </Box>
      ) : (
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={onAddMoneyPress}
          testID={MoneyFooterTestIds.ADD_MONEY_BUTTON}
        >
          {strings('money.footer.add_money')}
        </Button>
      )}
    </Box>
  );
};

export default MoneyFooter;
