import React, { useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { MoneyFooterTestIds } from './MoneyFooter.testIds';
import createStyles from './MoneyFooter.styles';

export type MoneyFooterVariant = 'add-money' | 'convert-musd';

interface MoneyFooterProps {
  variant?: MoneyFooterVariant;
  onAddMoneyPress?: () => void;
  onConvertPress?: () => void;
}

const MoneyFooter = ({
  variant = 'add-money',
  onAddMoneyPress = () => undefined,
  onConvertPress = () => undefined,
}: MoneyFooterProps) => {
  const { bottom } = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(bottom), [bottom]);

  return (
    <Box
      twClassName="px-4 pt-4 bg-default"
      style={styles.container}
      testID={MoneyFooterTestIds.CONTAINER}
    >
      {variant === 'convert-musd' ? (
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={onConvertPress}
          testID={MoneyFooterTestIds.CONVERT_TO_MUSD_BUTTON}
        >
          {strings('money.footer.convert_to_musd')}
        </Button>
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
