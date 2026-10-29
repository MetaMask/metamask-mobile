import React, { useCallback } from 'react';
import { Pressable, View, type LayoutChangeEvent } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { BottomSheet } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useComposerSheetSnap } from './useComposerSheetSnap';
import { HIDDEN_HANDLE_SLOT, SHEET_EDGE_STRIP_WIDTH } from './sheetSnap';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type SnapGesture = ReturnType<
  typeof useComposerSheetSnap
>['leadingEdgeGesture'];

export interface ComposerSheetSnapProps {
  sheetTestID: string;
  onDismiss: () => void;
  /** Natural resting height. Zero until the caller has measured it. */
  defaultHeight: number;
  header: React.ReactNode;
  children: React.ReactNode;
  onHeaderLayout?: (height: number) => void;
  backdropTestID?: string;
}

const EdgeStrip = ({
  gesture,
  side,
}: {
  gesture: SnapGesture;
  side: 'left' | 'right';
}) => {
  const tw = useTailwind();
  return (
    <GestureDetector gesture={gesture}>
      <View
        collapsable={false}
        accessible={false}
        style={[
          tw.style(
            side === 'left'
              ? 'absolute bottom-0 left-0 top-0 z-10'
              : 'absolute bottom-0 right-0 top-0 z-10',
          ),
          { width: SHEET_EDGE_STRIP_WIDTH },
        ]}
      />
    </GestureDetector>
  );
};

export const ComposerSheetSnap = ({
  sheetTestID,
  onDismiss,
  defaultHeight,
  header,
  children,
  onHeaderLayout,
  backdropTestID,
}: ComposerSheetSnapProps) => {
  const tw = useTailwind();
  const snap = useComposerSheetSnap(defaultHeight, onDismiss);

  const handleHeaderLayout = useCallback(
    (event: LayoutChangeEvent) => {
      onHeaderLayout?.(event.nativeEvent.layout.height);
    },
    [onHeaderLayout],
  );

  return (
    <>
      <BottomSheet
        isInteractable={false}
        onClose={onDismiss}
        testID={sheetTestID}
      >
        <Animated.View style={[tw.style('w-full'), snap.sheetStyle]}>
          <GestureDetector gesture={snap.handleGesture}>
            <View
              collapsable={false}
              accessible={false}
              style={[
                tw.style('items-center py-1'),
                { marginTop: -HIDDEN_HANDLE_SLOT },
              ]}
            >
              <View
                accessible={false}
                style={tw.style('h-1 w-10 rounded-sm bg-border-muted')}
              />
            </View>
          </GestureDetector>
          <GestureDetector gesture={snap.headerGesture}>
            <View
              collapsable={false}
              accessible={false}
              onLayout={handleHeaderLayout}
            >
              {header}
            </View>
          </GestureDetector>
          <View accessible={false} style={tw.style('min-h-0 w-full flex-1')}>
            {children}
            <EdgeStrip gesture={snap.leadingEdgeGesture} side="left" />
            <EdgeStrip gesture={snap.trailingEdgeGesture} side="right" />
          </View>
        </Animated.View>
      </BottomSheet>
      <AnimatedPressable
        accessibilityRole="button"
        testID={backdropTestID}
        onPress={onDismiss}
        style={[tw.style('absolute inset-x-0 top-0 z-10'), snap.backdropStyle]}
      />
    </>
  );
};
