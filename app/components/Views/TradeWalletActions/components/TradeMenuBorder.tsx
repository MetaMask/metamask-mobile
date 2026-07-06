import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import BottomShape from './BottomShape';

export const TRADE_MENU_BORDER_TEST_ID =
  'wallet-actions-bottom-sheet-menu-border';

export interface TradeMenuBorderProps {
  bottomMaskHeight: number;
  bottomShapeWidth: number;
  peakHeight: number;
  peakBezierLength: number;
  baseBezierLength: number;
  stroke: string;
}

function TradeMenuBorder({
  bottomMaskHeight,
  bottomShapeWidth,
  peakHeight,
  peakBezierLength,
  baseBezierLength,
  stroke,
}: TradeMenuBorderProps) {
  const tw = useTailwind();

  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      testID={TRADE_MENU_BORDER_TEST_ID}
    >
      <View
        style={tw.style('flex-1 border-t border-x border-muted rounded-t-2xl')}
      />
      <View style={tw.style('flex-row mt-[-1px]', `h-[${bottomMaskHeight}px]`)}>
        <View
          style={tw.style(
            'flex-1 border-l border-b border-muted rounded-bl-2xl',
          )}
        />
        <BottomShape
          width={bottomShapeWidth}
          height={bottomMaskHeight}
          peakHeight={peakHeight}
          peakBezierLength={peakBezierLength}
          baseBezierLength={baseBezierLength}
          stroke={stroke}
          strokeWidth={1}
        />
        <View
          style={tw.style(
            'flex-1 border-r border-b border-muted rounded-br-2xl',
          )}
        />
      </View>
    </View>
  );
}

export default TradeMenuBorder;
