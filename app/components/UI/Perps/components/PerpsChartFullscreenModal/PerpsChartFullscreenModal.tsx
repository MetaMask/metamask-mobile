import React, { useCallback, useEffect, useState } from 'react';
import { View, Dimensions } from 'react-native';
import Modal from 'react-native-modal';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
  lockAsync,
  unlockAsync,
  OrientationLock,
} from 'expo-screen-orientation';
import { useStyles } from '../../../../../component-library/hooks';
import Button, {
  ButtonVariants,
  ButtonSize,
} from '../../../../../component-library/components/Buttons/Button';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../component-library/components/Buttons/ButtonIcon';
import {
  IconName,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import TradingViewChart, {
  TradingViewChartRef,
  TPSLLines,
} from '../TradingViewChart/TradingViewChart';
import type { CandleData } from '../../types/perps-types';
import { CandlePeriod } from '../../constants/chartConfig';
import PerpsCandlestickChartIntervalSelector from '../PerpsCandlestickChartIntervalSelector/PerpsCandlestickChartIntervalSelector';
import { styleSheet } from './PerpsChartFullscreenModal.styles';

export interface PerpsChartFullscreenModalProps {
  isVisible: boolean;
  candleData?: CandleData | null;
  tpslLines?: TPSLLines;
  selectedInterval: CandlePeriod;
  onClose: () => void;
  onIntervalChange: (interval: CandlePeriod) => void;
}

const PerpsChartFullscreenModal: React.FC<PerpsChartFullscreenModalProps> = ({
  isVisible,
  candleData,
  tpslLines,
  selectedInterval,
  onClose,
  onIntervalChange,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const insets = useSafeAreaInsets();
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  const chartRef = React.useRef<TradingViewChartRef>(null);
  const [currentOrientation, setCurrentOrientation] = useState<
    'portrait' | 'landscape-left' | 'landscape-right'
  >('portrait');
  const [showVolume, setShowVolume] = useState(true);

  // Handle screen dimension changes
  useEffect(() => {
    const subscription = Dimensions.addEventListener(
      'change',
      ({ window: windowDimensions }) => {
        setDimensions(windowDimensions);
      },
    );

    return () => subscription?.remove();
  }, []);

  // Unlock orientation when modal closes
  useEffect(() => {
    if (!isVisible) {
      unlockAsync();
    }
  }, [isVisible]);

  const handleClose = useCallback(async () => {
    // Unlock orientation before closing
    await unlockAsync();
    onClose();
  }, [onClose]);

  const handleToggleOrientation = useCallback(async () => {
    try {
      // Cycle through orientations: portrait → landscape-left → landscape-right → portrait
      let nextOrientation: 'portrait' | 'landscape-left' | 'landscape-right';
      let lockMode: OrientationLock;

      switch (currentOrientation) {
        case 'portrait':
          nextOrientation = 'landscape-left';
          lockMode = OrientationLock.LANDSCAPE_LEFT;
          break;
        case 'landscape-left':
          nextOrientation = 'landscape-right';
          lockMode = OrientationLock.LANDSCAPE_RIGHT;
          break;
        case 'landscape-right':
          nextOrientation = 'portrait';
          lockMode = OrientationLock.PORTRAIT_UP;
          break;
      }

      setCurrentOrientation(nextOrientation);
      await lockAsync(lockMode);
    } catch (error) {
      console.error('Orientation lock error:', error);
    }
  }, [currentOrientation]);

  const handleToggleVolume = useCallback(() => {
    const newShowVolume = !showVolume;
    setShowVolume(newShowVolume);
    chartRef.current?.toggleVolumeVisibility(newShowVolume);
  }, [showVolume]);

  // Calculate chart height (full screen minus header)
  const chartHeight = dimensions.height - 120; // 120px for two-row header

  return (
    <Modal
      isVisible={isVisible}
      style={styles.modal}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      animationInTiming={300}
      animationOutTiming={300}
      backdropOpacity={0.3}
      useNativeDriver
      hideModalContentWhileAnimating
      coverScreen
    >
      <SafeAreaView style={styles.container} edges={['left', 'right']}>
        {/* Header - Two Rows with manual top safe area handling */}
        <View style={[styles.header, { paddingTop: 12 + insets.top }]}>
          {/* Top Row: Orientation and Volume on left, Close on right */}
          <View style={styles.headerTopRow}>
            <View style={styles.leftButtons}>
              <Button
                variant={ButtonVariants.Secondary}
                size={ButtonSize.Sm}
                label="Orientation"
                onPress={handleToggleOrientation}
                startIconName={IconName.ProgrammingArrows}
              />
              <Button
                variant={ButtonVariants.Secondary}
                size={ButtonSize.Sm}
                label="Volume"
                onPress={handleToggleVolume}
                startIconName={showVolume ? IconName.Eye : IconName.EyeSlash}
              />
            </View>
            <ButtonIcon
              iconName={IconName.Close}
              iconColor={IconColor.Default}
              size={ButtonIconSizes.Md}
              onPress={handleClose}
              accessibilityLabel="Close"
            />
          </View>

          {/* Bottom Row: Interval Selector Only */}
          <View style={styles.headerBottomRow}>
            <PerpsCandlestickChartIntervalSelector
              selectedInterval={selectedInterval}
              onIntervalChange={onIntervalChange}
              style={styles.intervalSelectorWrapper}
            />
          </View>
        </View>

        {/* Chart */}
        <View style={styles.chartContainer}>
          <TradingViewChart
            ref={chartRef}
            candleData={candleData}
            height={chartHeight}
            tpslLines={tpslLines}
            visibleCandleCount={90} // Show more candles in landscape mode
            showVolume={showVolume}
            testID="fullscreen-chart"
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
};

export default PerpsChartFullscreenModal;
