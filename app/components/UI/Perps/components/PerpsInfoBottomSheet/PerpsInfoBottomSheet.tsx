import React, { useRef, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import { useTheme } from '../../../../../util/theme';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import { Theme } from '../../../../../util/theme/models';
import { DevLogger } from '../../../../../core/SDKConnect/utils/DevLogger';

export type InfoType = 'fees' | 'margin' | 'execution_time' | 'leverage';

interface InfoRouteParams {
  type: InfoType;
}

interface InfoContent {
  title: string;
  description: string;
  details?: string[];
}

const INFO_CONTENT: Record<InfoType, InfoContent> = {
  fees: {
    title: 'Trading Fees',
    description:
      'Fees are charged on every trade to cover the cost of execution and liquidity provision.',
    details: [
      'Market orders: 0.075% of position size',
      'Limit orders: 0.02% of position size',
      'Fees are deducted from your margin balance',
      'No funding fees for the first 8 hours',
    ],
  },
  margin: {
    title: 'Margin Requirements',
    description:
      'Margin is the collateral required to open and maintain a leveraged position.',
    details: [
      'Initial margin = Position size ÷ Leverage',
      'Maintenance margin = 0.625% of position size',
      'Available balance must exceed initial margin',
      'Margin is locked when position is open',
    ],
  },
  execution_time: {
    title: 'Execution Time',
    description:
      "Orders are executed nearly instantly on HyperLiquid's high-performance blockchain.",
    details: [
      'Market orders: < 1 second',
      'Limit orders: Execute when price is matched',
      'Network congestion may cause slight delays',
      'Failed orders are automatically retried',
    ],
  },
  leverage: {
    title: 'What is Leverage?',
    description:
      'Leverage allows you to control a larger position with less capital, amplifying both profits and losses.',
    details: [
      'Higher leverage = Higher risk & reward',
      'Maximum leverage varies by asset',
      'Liquidation occurs when losses exceed margin',
      "Start with lower leverage if you're new",
    ],
  },
};

const createStyles = (colors: Theme['colors']) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 16,
      paddingVertical: 24,
    },
    description: {
      marginBottom: 24,
      lineHeight: 22,
    },
    detailsContainer: {
      backgroundColor: colors.background.alternative,
      borderRadius: 8,
      padding: 16,
    },
    detailItem: {
      marginBottom: 12,
    },
    detailBullet: {
      fontSize: 14,
      lineHeight: 20,
    },
  });

const PerpsInfoBottomSheet: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{ params: InfoRouteParams }, 'params'>>();
  const { type } = route.params || { type: 'fees' };

  const { colors } = useTheme();
  const styles = createStyles(colors);
  const bottomSheetRef = useRef<BottomSheetRef>(null);

  const content = INFO_CONTENT[type];

  useEffect(() => {
    bottomSheetRef.current?.onOpenBottomSheet();
  }, []);

  const handleClose = () => {
    DevLogger.log('Closing info bottom sheet');
    navigation.goBack();
  };

  return (
    <BottomSheet ref={bottomSheetRef}>
      <BottomSheetHeader onClose={handleClose}>
        <Text variant={TextVariant.HeadingMD}>{content.title}</Text>
      </BottomSheetHeader>

      <View style={styles.container}>
        <Text variant={TextVariant.BodyLGMedium} style={styles.description}>
          {content.description}
        </Text>

        {content.details && (
          <View style={styles.detailsContainer}>
            {content.details.map((detail, index) => (
              <View key={index} style={styles.detailItem}>
                <Text
                  variant={TextVariant.BodyMD}
                  color={TextColor.Default}
                  style={styles.detailBullet}
                >
                  • {detail}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </BottomSheet>
  );
};

PerpsInfoBottomSheet.displayName = 'PerpsInfoBottomSheet';

export default PerpsInfoBottomSheet;
