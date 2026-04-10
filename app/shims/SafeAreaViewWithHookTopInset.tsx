import React, {
  forwardRef,
  useMemo,
  type ComponentProps,
  type ComponentRef,
} from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
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

function numericInsetContribution(value: unknown): number {
  return typeof value === 'number' && !Number.isNaN(value) ? value : 0;
}

/**
 * SafeAreaView that avoids native top inset (reduces post-mount header jump).
 * When the resolved top edge would apply an inset, top is applied via
 * useSafeAreaInsets + paddingTop or marginTop (per `mode`) instead; other edges
 * stay on the native view. Top spacing uses existing numeric paddingTop /
 * marginTop with `insets.top`: **additive** → sum; **maximum** →
 * `Math.max(existing, insets.top)` (matches native edge modes).
 */
export const SafeAreaView = forwardRef<
  ComponentRef<typeof NativeSafeAreaView>,
  NativeSafeAreaViewProps
>(({ edges, style, mode, ...props }, ref) => {
  const insets = useSafeAreaInsets();

  const { nativeEdges, applyHookTopInset, hookTopEdgeMode } = useMemo(() => {
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
        applyHookTopInset: true,
        hookTopEdgeMode: topMode,
      };
    }

    return {
      nativeEdges: nativeEdgesInternal,
      applyHookTopInset: false,
      hookTopEdgeMode: undefined,
    };
  }, [edges]);

  // Match native SafeAreaView default (`mode` defaults to 'padding' on the native view).
  const resolvedMode = mode ?? 'padding';

  const combinedStyle = useMemo((): StyleProp<ViewStyle> => {
    if (!applyHookTopInset) {
      return style;
    }
    const edgeKey =
      resolvedMode === 'margin' ? 'marginTop' : 'paddingTop';
    const flat = StyleSheet.flatten(style) ?? {};
    const existing = numericInsetContribution(flat[edgeKey]);
    const combinedTop =
      hookTopEdgeMode === 'maximum'
        ? Math.max(existing, insets.top)
        : existing + insets.top;
    return [style, { [edgeKey]: combinedTop } as ViewStyle];
  }, [
    applyHookTopInset,
    hookTopEdgeMode,
    insets.top,
    resolvedMode,
    style,
  ]);

  return (
    <NativeSafeAreaView
      ref={ref}
      {...props}
      mode={mode}
      edges={nativeEdges as Edges}
      style={combinedStyle}
    />
  );
});

SafeAreaView.displayName = 'SafeAreaView';
