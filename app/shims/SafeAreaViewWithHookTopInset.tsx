import React, {
  forwardRef,
  useMemo,
  type ComponentProps,
  type ComponentRef,
} from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
// Use package `src/` so Metro runs RN codegen on specs (lib/module bypasses it → "Could not find component config").
import { SafeAreaView as NativeSafeAreaView } from 'react-native-safe-area-context/src/SafeAreaView';
import { useSafeAreaInsets } from 'react-native-safe-area-context/src/SafeAreaContext';

type Edge = 'top' | 'right' | 'bottom' | 'left';
type EdgeMode = 'off' | 'additive' | 'maximum';
type EdgeRecord = Partial<Record<Edge, EdgeMode>>;
type Edges = readonly Edge[] | Readonly<EdgeRecord>;

const defaultEdges: Record<Edge, EdgeMode> = {
  top: 'additive',
  left: 'additive',
  bottom: 'additive',
  right: 'additive',
};

type NativeSafeAreaViewProps = ComponentProps<typeof NativeSafeAreaView>;

/**
 * SafeAreaView that avoids native top inset (reduces post-mount header jump).
 * When the resolved top edge would apply an inset, top is applied via
 * useSafeAreaInsets + paddingTop instead; other edges stay on the native view.
 */
export const SafeAreaView = forwardRef<
  ComponentRef<typeof NativeSafeAreaView>,
  NativeSafeAreaViewProps
>(({ edges, style, ...props }, ref) => {
  const insets = useSafeAreaInsets();

  const { nativeEdges, applyHookTopPadding } = useMemo(() => {
    const nativeEdgesInternal: Record<Edge, EdgeMode> =
      edges == null
        ? { ...defaultEdges }
        : (() => {
          const edgesObj: EdgeRecord = Array.isArray(edges)
            ? (edges as readonly Edge[]).reduce<EdgeRecord>(
              (acc, edge: Edge) => {
                acc[edge] = 'additive';
                return acc;
              },
              {},
            )
            : (edges as EdgeRecord);

          return {
            top: edgesObj.top ?? 'off',
            right: edgesObj.right ?? 'off',
            bottom: edgesObj.bottom ?? 'off',
            left: edgesObj.left ?? 'off',
          };
        })();

    // Defers top inset to be applied via styles instead
    const topMode = nativeEdgesInternal.top;
    const apply = topMode !== 'off';

    if (apply) {
      return {
        nativeEdges: { ...nativeEdgesInternal, top: 'off' as const },
        applyHookTopPadding: true,
      };
    }

    return {
      nativeEdges: nativeEdgesInternal,
      applyHookTopPadding: false,
    };
  }, [edges]);

  // Apply top inset as padding style if needed
  const combinedStyle = useMemo((): StyleProp<ViewStyle> => {
    if (!applyHookTopPadding) {
      return style;
    }
    return [{ paddingTop: insets.top }, style];
  }, [applyHookTopPadding, insets.top, style]);

  return (
    <NativeSafeAreaView
      ref={ref}
      {...props}
      edges={nativeEdges as Edges}
      style={combinedStyle}
    />
  );
});

SafeAreaView.displayName = 'SafeAreaView';
