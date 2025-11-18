import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import Modal from 'react-native-modal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  lockAsync,
  unlockAsync,
  OrientationLock,
} from 'expo-screen-orientation';
import { useStyles } from '../../../../../component-library/hooks';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../component-library/components/Buttons/ButtonIcon';
import {
  IconName,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import TradingViewChart, {
  type TradingViewChartRef,
  type TPSLLines,
  type OhlcData,
} from '../TradingViewChart';
import type { CandleData } from '../../types/perps-types';
import { CandlePeriod } from '../../constants/chartConfig';
import PerpsCandlestickChartIntervalSelector from '../PerpsCandlestickChartIntervalSelector/PerpsCandlestickChartIntervalSelector';
import { styleSheet } from './PerpsChartFullscreenModal.styles';
import PerpsOHLCVBar from '../PerpsOHLCVBar';

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
  const chartRef = React.useRef<TradingViewChartRef>(null);
  const [ohlcData, setOhlcData] = useState<OhlcData | null>(null);
  const [chartHeight, setChartHeight] = useState(600); // Dynamic height for chart

  // Auto-follow device orientation when modal is open
  useEffect(() => {
    if (isVisible) {
      // Unlock orientation to follow device
      unlockAsync();
    } else {
      // Lock back to portrait when closing
      lockAsync(OrientationLock.PORTRAIT_UP);
    }

    return () => {
      // Cleanup: ensure portrait lock on unmount
      lockAsync(OrientationLock.PORTRAIT_UP);
    };
  }, [isVisible]);

  const handleClose = useCallback(async () => {
    // Lock orientation back to portrait before closing
    await lockAsync(OrientationLock.PORTRAIT_UP);
    onClose();
  }, [onClose]);

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
      statusBarTranslucent
    >
      <View
        style={[
          styles.container,
          {
            paddingLeft: insets.left,
            paddingRight: insets.right,
          },
        ]}
      >
        {/* Header - Single Row with interval selector and close button */}
        <View style={[styles.header, { paddingTop: 12 + insets.top }]}>
          <View style={styles.headerTopRow}>
            <PerpsCandlestickChartIntervalSelector
              selectedInterval={selectedInterval}
              onIntervalChange={onIntervalChange}
              style={styles.intervalSelectorWrapper}
            />
            <ButtonIcon
              iconName={IconName.Close}
              iconColor={IconColor.Default}
              size={ButtonIconSizes.Md}
              onPress={handleClose}
              accessibilityLabel="Close"
            />
          </View>
        </View>

        {/* Chart - fills remaining space with bottom safe area padding */}
        <View
          style={[styles.chartContainer, { paddingBottom: insets.bottom }]}
          onLayout={(event) => {
            const { height } = event.nativeEvent.layout;
            // Subtract bottom inset from measured height for actual chart height
            setChartHeight(height - insets.bottom);
          }}
        >
          {/* OHLCV Bar - Shows above chart when interacting */}
          {ohlcData && (
            <View style={styles.ohlcvWrapper}>
              <PerpsOHLCVBar
                open={ohlcData.open}
                high={ohlcData.high}
                low={ohlcData.low}
                close={ohlcData.close}
                volume={ohlcData.volume}
                time={ohlcData.time}
                testID="fullscreen-chart-ohlcv-bar"
              />
            </View>
          )}

          <TradingViewChart
            ref={chartRef}
            candleData={candleData}
            height={chartHeight}
            tpslLines={tpslLines}
            visibleCandleCount={90} // Show more candles in landscape mode
            showVolume // Always show volume in fullscreen
            showOverlay={false}
            coloredVolume
            onOhlcDataChange={setOhlcData}
            testID="fullscreen-chart"
          />
        </View>
      </View>
    </Modal>
  );
};

export default PerpsChartFullscreenModal;
