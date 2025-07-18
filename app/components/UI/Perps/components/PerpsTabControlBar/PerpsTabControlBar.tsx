import React, { useCallback, useEffect, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useStyles } from '../../../../../component-library/hooks';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import { strings } from '../../../../../../locales/i18n';
import styleSheet from './PerpsTabControlBar.styles';
import { usePerpsTrading } from '../../hooks';
import Skeleton from '../../../../../component-library/components/Skeleton/Skeleton';
import { AccountState } from '../../controllers';
import DevLogger from '../../../../../core/SDKConnect/utils/DevLogger';
import { formatPerpsFiat } from '../../utils/formatUtils';

export const PerpsTabControlBar: React.FC = () => {
  const { styles } = useStyles(styleSheet, {});
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AccountState>({
    totalBalance: '',
    availableBalance: '',
    marginUsed: '',
    unrealizedPnl: '',
  });

  const { getAccountState } = usePerpsTrading();

  const getAccountBalance = useCallback(async () => {
    setIsLoading(true);

    try {
      const accountState = await getAccountState();
      setResult(accountState);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : strings('perps.errors.unknownError');
      const fullErrorMessage = strings('perps.errors.accountBalanceFailed', {
        error: errorMessage,
      });
      DevLogger.log(fullErrorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [getAccountState]);

  useEffect(() => {
    getAccountBalance();
  }, [getAccountBalance]);

  const handlePress = () => {
    getAccountBalance();
  };

  return (
    <TouchableOpacity style={styles.wrapper} onPress={handlePress}>
      <View style={styles.balanceContainer}>
        <Text
          variant={TextVariant.BodySM}
          color={TextColor.Alternative}
          style={styles.titleText}
        >
          {strings('perps.hyperliquid_usdc_balance')}
        </Text>
        {isLoading ? (
          <Skeleton height={24} width={80} />
        ) : (
          <Text variant={TextVariant.HeadingSM} color={TextColor.Default}>
            {formatPerpsFiat(result.totalBalance)}
          </Text>
        )}
      </View>
      <View style={styles.arrowContainer}>
        <Icon
          name={IconName.ArrowRight}
          size={IconSize.Md}
          color={IconColor.Alternative}
        />
      </View>
    </TouchableOpacity>
  );
};

export default PerpsTabControlBar;
