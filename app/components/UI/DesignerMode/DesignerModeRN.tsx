import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from 'react';
import {
  View,
  Text,
  Modal,
  TouchableWithoutFeedback,
  StyleSheet,
  TextInput,
  ScrollView,
  Pressable,
  Animated,
  PanResponder,
  Dimensions,
  Platform,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import type {
  RNComponentInfo,
  DesignerModeRNOptions,
  ChangesetEntry,
} from './types';
import { hitTestFromFiberTree } from './fiber';
import {
  buildAgentPrompt,
  sendToRelay,
  pollForResponse,
  checkRelayHealth,
} from './relay-client';

// `Menlo` only exists on iOS; Android falls back to its default monospace.
const MONO_FONT = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

/* ── Fixed dark inspector palette (matches the web Designer panel) ──
 * This dev-tooling overlay intentionally uses its own theme-independent dark
 * chrome rather than app design tokens. Colors are expressed as rgb()/rgba()
 * (not hex) and centralized here so styles never embed color literals. */
const C = {
  bg: 'rgb(44, 44, 44)',
  surface: 'rgb(56, 56, 56)',
  surfaceHover: 'rgb(64, 64, 64)',
  input: 'rgb(30, 30, 30)',
  text: 'rgb(255, 255, 255)',
  textSecondary: 'rgb(173, 173, 173)',
  textTertiary: 'rgb(119, 119, 119)',
  accent: 'rgb(13, 153, 255)',
  accentDim: 'rgba(13, 153, 255, 0.15)',
  success: 'rgb(48, 209, 88)',
  successDim: 'rgba(48, 209, 88, 0.15)',
  error: 'rgb(255, 69, 58)',
  errorDim: 'rgba(255, 69, 58, 0.12)',
  warning: 'rgb(255, 179, 71)',
  warningDim: 'rgba(255, 165, 0, 0.12)',
  divider: 'rgb(64, 64, 64)',
  chevron: 'rgb(136, 136, 136)',
  footerBg: 'rgb(26, 26, 26)',
  dark: 'rgb(26, 26, 26)',
  shadow: 'rgb(0, 0, 0)',
  backdrop: 'rgba(0, 0, 0, 0.4)',
  whiteA20: 'rgba(255, 255, 255, 0.2)',
  whiteA10: 'rgba(255, 255, 255, 0.1)',
  transparent: 'transparent',
};

// Stylesheet is built via a hoisted factory so `s` is defined before the
// components below use it, while the (large) style definitions stay at the
// bottom of the file for readability.
const s = createDesignerStyles();

interface Props extends DesignerModeRNOptions {
  active: boolean;
  onClose: () => void;
}

type RelayStatus = 'connected' | 'disconnected' | 'checking';
interface ChatMessage {
  type: 'sent' | 'agent';
  text: string;
}

function shortenPath(filePath: string): string {
  const parts = filePath.split('/');
  return parts.slice(-2).join('/');
}

/* ── Collapsible Section ── */
function Section({
  icon,
  title,
  defaultOpen = true,
  children,
}: {
  icon: string;
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View style={s.section}>
      <Pressable onPress={() => setOpen((o) => !o)} style={s.sectionHeader}>
        <Text style={s.sectionIcon}>{icon}</Text>
        <Text style={s.sectionTitle}>{title}</Text>
        <Text style={[s.chevron, open && s.chevronOpen]}>{'\u25B8'}</Text>
      </Pressable>
      {open && <View style={s.sectionBody}>{children}</View>}
    </View>
  );
}

/* ── Editable Property Row ── */
function PropRow({
  label,
  value,
  mono = true,
  half = false,
  onEdit,
  swatchColor,
}: {
  label: string;
  value: string;
  mono?: boolean;
  half?: boolean;
  onEdit?: (newValue: string) => void;
  swatchColor?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  if (editing && onEdit) {
    return (
      <View style={[s.propRow, half && s.propRowHalf]}>
        {label ? (
          <Text style={s.propLabel} numberOfLines={1}>
            {label}
          </Text>
        ) : null}
        <TextInput
          style={[s.propEditInput, mono && s.mono]}
          value={editValue}
          onChangeText={setEditValue}
          onBlur={() => {
            setEditing(false);
            if (editValue !== value) onEdit(editValue);
          }}
          onSubmitEditing={() => {
            setEditing(false);
            if (editValue !== value) onEdit(editValue);
          }}
          autoFocus
          selectTextOnFocus
        />
      </View>
    );
  }

  return (
    <Pressable
      style={[s.propRow, half && s.propRowHalf]}
      onPress={
        onEdit
          ? () => {
              setEditValue(value);
              setEditing(true);
            }
          : undefined
      }
      disabled={!onEdit}
    >
      {label ? (
        <Text style={s.propLabel} numberOfLines={1}>
          {label}
        </Text>
      ) : null}
      <View style={s.propValueRow}>
        {swatchColor && <ColorSwatch color={swatchColor} />}
        <Text
          style={[s.propValue, mono && s.mono, onEdit && s.propValueEditable]}
          numberOfLines={1}
        >
          {value}
        </Text>
      </View>
    </Pressable>
  );
}

/* ── Style Name Pill ── */
function StyleNamePill({
  name,
  onRemove,
}: {
  name: string;
  onRemove?: () => void;
}) {
  return (
    <View style={s.styleNamePill}>
      <Text style={s.styleNamePillText}>{name}</Text>
      {onRemove && (
        <Pressable onPress={onRemove} hitSlop={4}>
          <Text style={s.styleNamePillRemove}>{'\u00D7'}</Text>
        </Pressable>
      )}
    </View>
  );
}

/* ── Add Style Name Input ── */
function AddStyleNameInput({ onAdd }: { onAdd: (name: string) => void }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');

  if (!adding) {
    return (
      <Pressable onPress={() => setAdding(true)} style={s.addStyleNameBtn}>
        <Text style={s.addStyleNameBtnText}>+ Add</Text>
      </Pressable>
    );
  }

  return (
    <TextInput
      style={s.addStyleNameInput}
      value={name}
      onChangeText={setName}
      placeholder="styleName"
      placeholderTextColor={C.textTertiary}
      autoFocus
      onBlur={() => {
        setAdding(false);
        setName('');
      }}
      onSubmitEditing={() => {
        if (name.trim()) {
          onAdd(name.trim());
          setName('');
          setAdding(false);
        }
      }}
    />
  );
}

/* ── Color Swatch ── */
function ColorSwatch({ color }: { color: string }) {
  const swatchStyle = useMemo(() => ({ backgroundColor: color }), [color]);
  return <View style={[s.colorSwatch, swatchStyle]} />;
}

/* ── Pulse Orb ── */
function PulseOrb() {
  const anim = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0.4,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);
  const orbStyle = useMemo(() => ({ opacity: anim }), [anim]);
  return <Animated.View style={[s.pulseOrb, orbStyle]} />;
}

/* ── Style categorization helpers ── */
function categorizeStyles(style: Record<string, unknown>) {
  const layout: [string, string][] = [];
  const spacing: [string, string][] = [];
  const typography: [string, string][] = [];
  const fillStroke: [string, string][] = [];
  const other: [string, string][] = [];

  const layoutKeys = [
    'width',
    'height',
    'flex',
    'flexDirection',
    'flexWrap',
    'flexGrow',
    'flexShrink',
    'flexBasis',
    'alignItems',
    'alignSelf',
    'alignContent',
    'justifyContent',
    'position',
    'top',
    'right',
    'bottom',
    'left',
    'display',
    'overflow',
    'zIndex',
    'gap',
    'rowGap',
    'columnGap',
    'aspectRatio',
    'minWidth',
    'maxWidth',
    'minHeight',
    'maxHeight',
  ];
  const spacingKeys = [
    'margin',
    'marginTop',
    'marginRight',
    'marginBottom',
    'marginLeft',
    'marginHorizontal',
    'marginVertical',
    'padding',
    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',
    'paddingHorizontal',
    'paddingVertical',
  ];
  const typoKeys = [
    'fontSize',
    'fontWeight',
    'fontFamily',
    'fontStyle',
    'lineHeight',
    'letterSpacing',
    'textAlign',
    'textTransform',
    'textDecorationLine',
    'textDecorationStyle',
    'textShadowColor',
    'textShadowOffset',
    'textShadowRadius',
    'color',
  ];
  const fillKeys = [
    'backgroundColor',
    'opacity',
    'borderWidth',
    'borderColor',
    'borderStyle',
    'borderRadius',
    'borderTopWidth',
    'borderRightWidth',
    'borderBottomWidth',
    'borderLeftWidth',
    'borderTopLeftRadius',
    'borderTopRightRadius',
    'borderBottomLeftRadius',
    'borderBottomRightRadius',
    'shadowColor',
    'shadowOffset',
    'shadowOpacity',
    'shadowRadius',
    'elevation',
  ];

  for (const [key, value] of Object.entries(style)) {
    const val =
      typeof value === 'object' ? JSON.stringify(value) : String(value);
    if (layoutKeys.includes(key)) layout.push([key, val]);
    else if (spacingKeys.includes(key)) spacing.push([key, val]);
    else if (typoKeys.includes(key)) typography.push([key, val]);
    else if (fillKeys.includes(key)) fillStroke.push([key, val]);
    else other.push([key, val]);
  }
  return { layout, spacing, typography, fillStroke, other };
}

function isColorValue(value: string): boolean {
  if (
    value.startsWith('#') ||
    value.startsWith('rgb') ||
    value.startsWith('hsl')
  )
    return true;
  const named = [
    'red',
    'blue',
    'green',
    'black',
    'white',
    'gray',
    'grey',
    'transparent',
    'orange',
    'yellow',
    'purple',
    'pink',
    'cyan',
    'magenta',
  ];
  return named.includes(value.toLowerCase());
}

/* ── Main Component ── */
export function DesignerModeRN({
  active,
  onClose,
  relayUrl,
  pollInterval = 2000,
}: Props) {
  const [selected, setSelected] = useState<RNComponentInfo | null>(null);
  const [edits, setEdits] = useState<
    Record<string, { original: string; current: string }>
  >({});
  const [addedStyleNames, setAddedStyleNames] = useState<string[]>([]);
  const [removedStyleNames, setRemovedStyleNames] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [agentWorking, setAgentWorking] = useState(false);
  const [relayStatus, setRelayStatus] = useState<RelayStatus>('checking');
  const [showFullPath, setShowFullPath] = useState(false);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const prevRelayStatus = useRef<RelayStatus>('checking');
  const scrollRef = useRef<ScrollView>(null);

  // Bottom sheet drag
  const translateY = useRef(new Animated.Value(0)).current;
  const panelTransformStyle = useMemo(
    () => ({ transform: [{ translateY }] }),
    [translateY],
  );
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 5,
      onPanResponderMove: (_, gs) => {
        // Only allow dragging down
        if (gs.dy > 0) {
          translateY.setValue(gs.dy);
        }
      },
      onPanResponderRelease: (_, gs) => {
        const screenH = Dimensions.get('window').height;
        // If dragged more than 30% of screen or fast fling, dismiss
        if (gs.dy > screenH * 0.2 || gs.vy > 1.5) {
          Animated.timing(translateY, {
            toValue: screenH,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            setSelected(null);
            translateY.setValue(0);
          });
        } else {
          // Snap back
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 6,
          }).start();
        }
      },
    }),
  ).current;

  // Reset state when designer mode is activated
  useEffect(() => {
    if (active) {
      setSelected(null);
      setEdits({});
      setAddedStyleNames([]);
      setRemovedStyleNames([]);
      setChatMessages([]);
      setMessage('');
      setAgentWorking(false);
      setShowFullPath(false);
      translateY.setValue(0);
    }
  }, [active, translateY]);

  // Check relay health
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    async function check() {
      const ok = await checkRelayHealth(relayUrl);
      if (!cancelled) {
        const next = ok ? 'connected' : 'disconnected';
        if (next !== prevRelayStatus.current) {
          prevRelayStatus.current = next;
          setRelayStatus(next);
        }
      }
    }
    check();
    const interval = setInterval(check, 10000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [active, relayUrl]);

  const recordEdit = useCallback(
    (property: string, original: string, newValue: string) => {
      setEdits((prev) => {
        if (newValue === original) {
          const next = { ...prev };
          delete next[property];
          return next;
        }
        return { ...prev, [property]: { original, current: newValue } };
      });
    },
    [],
  );

  const changeset: ChangesetEntry[] = useMemo(
    () => [
      ...Object.entries(edits).map(([property, { original, current }]) => ({
        property,
        original,
        current,
      })),
      ...addedStyleNames.map((name) => ({
        property: `style:add(${name})`,
        original: '(none)',
        current: name,
      })),
      ...removedStyleNames.map((name) => ({
        property: `style:remove(${name})`,
        original: name,
        current: '(removed)',
      })),
    ],
    [edits, addedStyleNames, removedStyleNames],
  );

  const touchSeqRef = useRef(0);
  const [selectionId, setSelectionId] = useState(0);
  const handleTouch = useCallback(async (touchX: number, touchY: number) => {
    // Tag this tap; if a newer tap starts before this hit-test resolves, the
    // stale result is discarded so the most recent tap always wins.
    const seq = ++touchSeqRef.current;
    const info = await hitTestFromFiberTree(touchX, touchY);
    if (seq !== touchSeqRef.current) return;
    if (info) {
      setSelected(info);
      setSelectionId(seq);
      setEdits({});
      setAddedStyleNames([]);
      setRemovedStyleNames([]);
      setChatMessages([]);
      setShowFullPath(false);
    }
  }, []);

  const sendRequest = useCallback(async () => {
    if (!selected) return;
    const msg = message.trim();
    if (!msg && changeset.length === 0) return;

    const parts: string[] = [];
    if (changeset.length > 0) {
      parts.push(
        changeset
          .map((e) => `${e.property}: ${e.original} → ${e.current}`)
          .join('\n'),
      );
    }
    if (msg) parts.push(msg);
    setChatMessages((prev) => [
      ...prev,
      { type: 'sent', text: parts.join('\n\n') },
    ]);
    setEdits({});
    setAddedStyleNames([]);
    setRemovedStyleNames([]);
    setAgentWorking(true);
    setMessage('');

    // Tag this send so a superseded request (whose poll we abort below) can't
    // clear the working indicator or append its response while the newer
    // request is still in flight — that's what made the "Check your agent…"
    // hint vanish before the agent had fully responded.
    const myRequestId = ++requestIdRef.current;
    const isCurrent = () => myRequestId === requestIdRef.current;

    const prompt = buildAgentPrompt(selected, changeset, msg);
    try {
      // Abort any previous poll and flush stale responses
      abortRef.current?.abort();
      await fetch(`${relayUrl}/api/flush`, { method: 'POST' }).catch(() => {
        // best-effort flush; ignore network errors
      });
      await sendToRelay(relayUrl, prompt);
      abortRef.current = new AbortController();
      const response = await pollForResponse(relayUrl, abortRef.current.signal);
      if (response && isCurrent()) {
        setChatMessages((prev) => [...prev, { type: 'agent', text: response }]);
      }
    } catch (err) {
      if (isCurrent()) {
        setChatMessages((prev) => [
          ...prev,
          { type: 'agent', text: `Error: ${(err as Error).message}` },
        ]);
      }
    } finally {
      if (isCurrent()) {
        setAgentWorking(false);
      }
    }
  }, [selected, changeset, message, relayUrl]);

  if (!active) return null;

  const filePathShort = selected?.filePath
    ? `${shortenPath(selected.filePath)}${selected.lineNumber ? `:${selected.lineNumber}` : ''}`
    : null;
  const filePathFull = selected?.filePath
    ? `${selected.filePath}${selected.lineNumber ? `:${selected.lineNumber}` : ''}`
    : null;

  const categories =
    selected?.style && Object.keys(selected.style).length > 0
      ? categorizeStyles(selected.style)
      : null;

  return (
    <Modal
      transparent
      animationType="none"
      visible={active}
      onRequestClose={onClose}
    >
      {/* Touch interceptor — fully transparent, app visible underneath */}
      {!selected && (
        <TouchableWithoutFeedback
          onPress={(e) => handleTouch(e.nativeEvent.pageX, e.nativeEvent.pageY)}
        >
          <View style={s.overlay} />
        </TouchableWithoutFeedback>
      )}

      {/* Backdrop */}
      {selected && (
        <Pressable style={s.backdrop} onPress={() => setSelected(null)} />
      )}

      {/* Inspector panel */}
      {selected && (
        <Animated.View style={[s.panel, panelTransformStyle]}>
          {/* Drag handle */}
          <View style={s.handleBar} {...panResponder.panHandlers}>
            <View style={s.handle} />
          </View>

          {/* Header */}
          <View style={s.header}>
            <Pressable
              style={[s.copyBtn, copied && s.copyBtnCopied]}
              onPress={() => {
                const prompt = buildAgentPrompt(selected, changeset, '');
                Clipboard.setString(prompt);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              <Text style={[s.copyBtnText, copied && s.copyBtnTextCopied]}>
                {copied ? '\u2713 Copied' : 'Copy for AI'}
              </Text>
            </Pressable>
            <Text style={s.headerTitle}>Designer Mode</Text>
            <View style={s.headerActions}>
              <Pressable onPress={() => setSelected(null)} style={s.iconBtn}>
                <Text style={s.iconBtnText}>{'\u2190'}</Text>
              </Pressable>
              <Pressable onPress={onClose} style={s.iconBtn}>
                <Text style={s.iconBtnText}>{'\u00D7'}</Text>
              </Pressable>
            </View>
          </View>

          {/* Element header */}
          <View style={s.elHeader}>
            <View style={s.elNameRow}>
              <Text style={s.elName}>{selected.componentName}</Text>
              {selected.parentComponent && (
                <Text style={s.elParent}>
                  {'\u2039'} {selected.parentComponent}
                </Text>
              )}
              {selected.testID && (
                <View style={s.testIdPill}>
                  <Text style={s.testIdPillText}>{selected.testID}</Text>
                </View>
              )}
            </View>
            {filePathShort && (
              <Pressable onPress={() => setShowFullPath((p) => !p)}>
                <Text
                  style={s.elFilePath}
                  numberOfLines={showFullPath ? undefined : 1}
                >
                  {showFullPath ? filePathFull : filePathShort}
                </Text>
              </Pressable>
            )}
          </View>

          <ScrollView
            ref={scrollRef}
            style={s.body}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Text Content section — editable, like web */}
            {selected.textContent != null && (
              <Section icon={'\u270F\uFE0E'} title="Text Content">
                <TextInput
                  // Remount on each new selection so the uncontrolled input
                  // resets its defaultValue instead of showing stale text.
                  key={`textContent-${selectionId}`}
                  style={s.textContentInput}
                  defaultValue={
                    edits.__textContent?.current ?? selected.textContent
                  }
                  onChangeText={(val) =>
                    recordEdit('__textContent', selected.textContent ?? '', val)
                  }
                  multiline
                  placeholderTextColor={C.textTertiary}
                />
              </Section>
            )}

            {/* Layout section */}
            {selected.layout && (
              <Section icon={'\u229E\uFE0E'} title="Layout">
                <View style={s.twoCol}>
                  <PropRow
                    half
                    label="W"
                    value={`${Math.round(selected.layout.width)}`}
                  />
                  <PropRow
                    half
                    label="H"
                    value={`${Math.round(selected.layout.height)}`}
                  />
                  <PropRow
                    half
                    label="X"
                    value={`${Math.round(selected.layout.pageX)}`}
                  />
                  <PropRow
                    half
                    label="Y"
                    value={`${Math.round(selected.layout.pageY)}`}
                  />
                </View>
                {categories?.layout && categories.layout.length > 0 && (
                  <View style={[s.twoCol, s.twoColSpaced]}>
                    {categories.layout.map(([key, val]) => (
                      <PropRow
                        half
                        key={key}
                        label={key}
                        value={edits[key]?.current ?? val}
                        onEdit={(v) => recordEdit(key, val, v)}
                      />
                    ))}
                  </View>
                )}
              </Section>
            )}

            {/* Spacing section */}
            {categories?.spacing && categories.spacing.length > 0 && (
              <Section icon={'\u2B1C'} title="Spacing">
                {renderSpacingCross(categories.spacing, edits, recordEdit)}
              </Section>
            )}

            {/* Typography section */}
            {categories?.typography && categories.typography.length > 0 && (
              <Section icon="T" title="Typography">
                {categories.typography.map(([key, val]) => {
                  const displayVal = edits[key]?.current ?? val;
                  const swatch =
                    key === 'color' && isColorValue(displayVal)
                      ? displayVal
                      : undefined;
                  return (
                    <PropRow
                      key={key}
                      label={key}
                      value={displayVal}
                      swatchColor={swatch}
                      onEdit={(v) => recordEdit(key, val, v)}
                    />
                  );
                })}
              </Section>
            )}

            {/* Fill & Stroke section */}
            {categories?.fillStroke && categories.fillStroke.length > 0 && (
              <Section icon={'\u25C9\uFE0E'} title="Fill & Stroke">
                {categories.fillStroke.map(([key, val]) => {
                  const displayVal = edits[key]?.current ?? val;
                  const swatch = isColorValue(displayVal)
                    ? displayVal
                    : undefined;
                  return (
                    <PropRow
                      key={key}
                      label={key}
                      value={displayVal}
                      swatchColor={swatch}
                      onEdit={(v) => recordEdit(key, val, v)}
                    />
                  );
                })}
              </Section>
            )}

            {/* Style Names section — add/remove from style array */}
            <Section icon={'\u2702\uFE0E'} title="Style Names">
              <View style={s.styleNamesWrap}>
                {selected.styleNames
                  .filter((name) => !removedStyleNames.includes(name))
                  .map((name, i) => (
                    <StyleNamePill
                      key={`cur-${name}-${i}`}
                      name={name}
                      onRemove={() =>
                        setRemovedStyleNames((prev) => [...prev, name])
                      }
                    />
                  ))}
                {removedStyleNames.map((name, i) => (
                  <View key={`rm-${name}-${i}`} style={s.styleNamePillRemoved}>
                    <Text style={s.styleNamePillRemovedText}>{name}</Text>
                    <Pressable
                      onPress={() =>
                        setRemovedStyleNames((prev) =>
                          prev.filter((_, idx) => idx !== i),
                        )
                      }
                      hitSlop={4}
                    >
                      <Text style={s.styleNamePillUndoText}>undo</Text>
                    </Pressable>
                  </View>
                ))}
                {addedStyleNames.map((name, i) => (
                  <View key={`add-${name}-${i}`} style={s.styleNamePillAdded}>
                    <Text style={s.styleNamePillAddedText}>{name}</Text>
                    <Pressable
                      onPress={() =>
                        setAddedStyleNames((prev) =>
                          prev.filter((_, idx) => idx !== i),
                        )
                      }
                      hitSlop={4}
                    >
                      <Text style={s.styleNamePillRemove}>{'\u00D7'}</Text>
                    </Pressable>
                  </View>
                ))}
                <AddStyleNameInput
                  onAdd={(name) =>
                    setAddedStyleNames((prev) => [...prev, name])
                  }
                />
              </View>
            </Section>

            {/* Component section */}
            <Section icon={'\u269B\uFE0E'} title="Component">
              <PropRow
                label="Name"
                value={selected.componentName}
                mono={false}
              />
              {selected.testID && (
                <PropRow label="Test ID" value={selected.testID} />
              )}
              {selected.filePath && (
                <PropRow
                  label="File"
                  value={`${shortenPath(selected.filePath)}${selected.lineNumber ? `:${selected.lineNumber}` : ''}`}
                />
              )}
              {/* Props */}
              {selected.props && Object.keys(selected.props).length > 0 && (
                <View style={s.propsJson}>
                  <Text style={s.propsJsonText} numberOfLines={8}>
                    {JSON.stringify(
                      Object.fromEntries(
                        Object.entries(selected.props)
                          .filter(([k]) => k !== 'style' && k !== 'children')
                          .slice(0, 10),
                      ),
                      null,
                      2,
                    )}
                  </Text>
                </View>
              )}
            </Section>

            {/* Other styles */}
            {categories?.other && categories.other.length > 0 && (
              <Section
                icon={'\u2699\uFE0E'}
                title="Other Styles"
                defaultOpen={false}
              >
                {categories.other.map(([key, val]) => (
                  <PropRow key={key} label={key} value={val} />
                ))}
              </Section>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={s.footer}>
            {/* Status row */}
            <View style={s.footerTop}>
              <View
                style={[
                  s.statusDot,
                  relayStatus === 'connected' && s.statusConnected,
                  relayStatus === 'disconnected' && s.statusDisconnected,
                ]}
              />
              <Text style={s.footerStatusText}>
                {relayStatus === 'connected'
                  ? 'Connected'
                  : relayStatus === 'checking'
                    ? 'Checking...'
                    : 'Disconnected'}
              </Text>
              <View style={s.componentPill}>
                <Text style={s.componentPillText}>
                  {selected.componentName}
                </Text>
              </View>
            </View>

            {/* Pending edits banner */}
            {changeset.length > 0 && (
              <View style={s.editsBanner}>
                <Text style={s.editsBannerText} numberOfLines={1}>
                  {changeset.length} pending edit
                  {changeset.length > 1 ? 's' : ''}:{' '}
                  {changeset
                    .slice(0, 2)
                    .map((e) => `${e.property}`)
                    .join(', ')}
                  {changeset.length > 2 ? ` +${changeset.length - 2}` : ''}
                </Text>
                <Pressable
                  onPress={() => sendRequest()}
                  disabled={agentWorking || relayStatus !== 'connected'}
                  style={[
                    s.applyBtn,
                    (agentWorking || relayStatus !== 'connected') &&
                      s.sendBtnDisabled,
                  ]}
                >
                  <Text style={s.applyBtnText}>Apply</Text>
                </Pressable>
              </View>
            )}

            {/* Chat messages */}
            {chatMessages.length > 0 && (
              <View style={s.messageThread}>
                {chatMessages.map((msg, i) => (
                  <View
                    key={i}
                    style={msg.type === 'sent' ? s.msgSent : s.msgAgent}
                  >
                    <Text
                      style={
                        msg.type === 'sent' ? s.msgSentText : s.msgAgentText
                      }
                    >
                      {msg.text}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Agent working indicator */}
            {agentWorking && (
              <View style={s.agentWorking}>
                <PulseOrb />
                <Text style={s.agentWorkingText}>
                  Check your agent for progress and approvals
                </Text>
              </View>
            )}

            {/* Composer */}
            <View style={s.composer}>
              <View style={s.composerWrap}>
                <TextInput
                  style={s.chatInput}
                  value={message}
                  onChangeText={setMessage}
                  placeholder="Describe the change..."
                  placeholderTextColor={C.textTertiary}
                  multiline
                  // Multiline inputs default submitBehavior to 'newline', so Enter
                  // would never fire onSubmitEditing. 'blurAndSubmit' makes the
                  // Return key send the request instead of inserting a newline.
                  submitBehavior="blurAndSubmit"
                  onSubmitEditing={sendRequest}
                />
                <Pressable
                  onPress={sendRequest}
                  disabled={agentWorking || relayStatus !== 'connected'}
                  style={[
                    s.sendBtn,
                    (agentWorking || relayStatus !== 'connected') &&
                      s.sendBtnDisabled,
                  ]}
                >
                  <Text style={s.sendBtnText}>{'\u2191'}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Animated.View>
      )}

      {/* Bottom bar — replaces the FAB when designer mode is active */}
      {!selected && (
        <View style={s.bottomBar}>
          <Text style={s.bottomBarText}>Tap any component</Text>
          <Pressable onPress={onClose} style={s.bottomBarClose} hitSlop={8}>
            <Text style={s.bottomBarCloseText}>{'\u00D7'}</Text>
          </Pressable>
        </View>
      )}
    </Modal>
  );
}

/* ── Spacing Cross Editor ── */
/* ── Editable spacing value ── */
function SpacingVal({
  value,
  color,
  prop,
  original,
  onEdit,
}: {
  value: string;
  color: string;
  prop: string;
  original: string;
  onEdit: (property: string, original: string, newValue: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(value);
  const colorStyle = useMemo(() => ({ color }), [color]);

  if (editing) {
    return (
      <TextInput
        style={[s.spacingValInput, colorStyle]}
        value={editVal}
        onChangeText={setEditVal}
        onBlur={() => {
          setEditing(false);
          if (editVal !== value) onEdit(prop, original, editVal);
        }}
        onSubmitEditing={() => {
          setEditing(false);
          if (editVal !== value) onEdit(prop, original, editVal);
        }}
        autoFocus
        selectTextOnFocus
        keyboardType="numeric"
      />
    );
  }

  return (
    <Pressable
      onPress={() => {
        setEditVal(value);
        setEditing(true);
      }}
    >
      <Text style={[s.spacingVal, colorStyle]}>{value}</Text>
    </Pressable>
  );
}

function renderSpacingCross(
  spacingProps: [string, string][],
  edits: Record<string, { original: string; current: string }>,
  recordEdit: (property: string, original: string, newValue: string) => void,
) {
  const vals: Record<string, string> = {};
  for (const [key, val] of spacingProps) vals[key] = val;

  // Resolve values with edits applied
  const get = (key: string, ...fallbacks: string[]) => {
    if (edits[key]) return edits[key].current;
    if (vals[key]) return vals[key];
    for (const fb of fallbacks) {
      if (edits[fb]) return edits[fb].current;
      if (vals[fb]) return vals[fb];
    }
    return '-';
  };

  const marginTop = get('marginTop', 'marginVertical', 'margin');
  const marginRight = get('marginRight', 'marginHorizontal', 'margin');
  const marginBottom = get('marginBottom', 'marginVertical', 'margin');
  const marginLeft = get('marginLeft', 'marginHorizontal', 'margin');

  const paddingTop = get('paddingTop', 'paddingVertical', 'padding');
  const paddingRight = get('paddingRight', 'paddingHorizontal', 'padding');
  const paddingBottom = get('paddingBottom', 'paddingVertical', 'padding');
  const paddingLeft = get('paddingLeft', 'paddingHorizontal', 'padding');

  const hasMargin = [marginTop, marginRight, marginBottom, marginLeft].some(
    (v) => v !== '-',
  );
  const hasPadding = [
    paddingTop,
    paddingRight,
    paddingBottom,
    paddingLeft,
  ].some((v) => v !== '-');

  const marginOrig = (key: string) =>
    vals[key] ??
    vals.marginVertical ??
    vals.marginHorizontal ??
    vals.margin ??
    '-';
  const paddingOrig = (key: string) =>
    vals[key] ??
    vals.paddingVertical ??
    vals.paddingHorizontal ??
    vals.padding ??
    '-';

  return (
    <View>
      {hasMargin && (
        <View style={s.spacingEditor}>
          <Text style={[s.spacingLabel, s.spacingLabelMargin]}>Margin</Text>
          <View style={s.spacingCrossWrap}>
            <SpacingVal
              value={marginTop}
              color={C.accent}
              prop="marginTop"
              original={marginOrig('marginTop')}
              onEdit={recordEdit}
            />
            <View style={s.spacingMidRow}>
              <SpacingVal
                value={marginLeft}
                color={C.accent}
                prop="marginLeft"
                original={marginOrig('marginLeft')}
                onEdit={recordEdit}
              />
              <View style={[s.spacingCenter, s.spacingCenterMargin]} />
              <SpacingVal
                value={marginRight}
                color={C.accent}
                prop="marginRight"
                original={marginOrig('marginRight')}
                onEdit={recordEdit}
              />
            </View>
            <SpacingVal
              value={marginBottom}
              color={C.accent}
              prop="marginBottom"
              original={marginOrig('marginBottom')}
              onEdit={recordEdit}
            />
          </View>
        </View>
      )}
      {hasPadding && (
        <View style={s.spacingEditor}>
          <Text style={[s.spacingLabel, s.spacingLabelPadding]}>Padding</Text>
          <View style={s.spacingCrossWrap}>
            <SpacingVal
              value={paddingTop}
              color={C.success}
              prop="paddingTop"
              original={paddingOrig('paddingTop')}
              onEdit={recordEdit}
            />
            <View style={s.spacingMidRow}>
              <SpacingVal
                value={paddingLeft}
                color={C.success}
                prop="paddingLeft"
                original={paddingOrig('paddingLeft')}
                onEdit={recordEdit}
              />
              <View style={[s.spacingCenter, s.spacingCenterPadding]} />
              <SpacingVal
                value={paddingRight}
                color={C.success}
                prop="paddingRight"
                original={paddingOrig('paddingRight')}
                onEdit={recordEdit}
              />
            </View>
            <SpacingVal
              value={paddingBottom}
              color={C.success}
              prop="paddingBottom"
              original={paddingOrig('paddingBottom')}
              onEdit={recordEdit}
            />
          </View>
        </View>
      )}
    </View>
  );
}

/* ── Styles ── */
function createDesignerStyles() {
  return StyleSheet.create({
    // Overlay / empty state
    overlay: {
      flex: 1,
      backgroundColor: C.transparent,
    } as ViewStyle,
    bottomBar: {
      position: 'absolute',
      bottom: 30,
      right: 20,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: C.accent,
      borderRadius: 28,
      paddingVertical: 14,
      paddingLeft: 20,
      paddingRight: 14,
      gap: 10,
      shadowColor: C.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    } as ViewStyle,
    bottomBarText: {
      color: C.text,
      fontSize: 14,
      fontWeight: '600',
    } as TextStyle,
    bottomBarClose: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: C.whiteA20,
      justifyContent: 'center',
      alignItems: 'center',
    } as ViewStyle,
    bottomBarCloseText: {
      color: C.text,
      fontSize: 16,
      lineHeight: 18,
    } as TextStyle,

    // Backdrop
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: C.backdrop,
    } as ViewStyle,

    // Panel
    panel: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      maxHeight: '80%',
      backgroundColor: C.bg,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      shadowColor: C.shadow,
      shadowOffset: { width: 0, height: -8 },
      shadowOpacity: 0.55,
      shadowRadius: 32,
      elevation: 24,
    } as ViewStyle,

    // Drag handle
    handleBar: {
      alignItems: 'center',
      paddingTop: 10,
      paddingBottom: 6,
    },
    handle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: C.whiteA20,
    },

    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderBottomWidth: 1,
      borderBottomColor: C.divider,
    },
    headerTitle: {
      position: 'absolute',
      left: 0,
      right: 0,
      textAlign: 'center',
      fontWeight: '600',
      fontSize: 13,
      color: C.textSecondary,
    } as TextStyle,
    headerActions: {
      flexDirection: 'row',
      gap: 4,
      zIndex: 1,
    },
    iconBtn: {
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 4,
    },
    iconBtnText: {
      color: C.textSecondary,
      fontSize: 14,
      lineHeight: 16,
    } as TextStyle,

    // Element header
    elHeader: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: C.divider,
    },
    elNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    copyBtn: {
      backgroundColor: C.surface,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      zIndex: 1,
    },
    copyBtnCopied: {
      backgroundColor: C.successDim,
    },
    copyBtnText: {
      fontSize: 10,
      color: C.textSecondary,
      fontWeight: '500',
    } as TextStyle,
    copyBtnTextCopied: {
      color: C.success,
    } as TextStyle,
    elName: {
      fontWeight: '700',
      fontSize: 13,
      color: C.text,
    } as TextStyle,
    elParent: {
      fontSize: 11,
      color: C.textTertiary,
    } as TextStyle,
    testIdPill: {
      backgroundColor: C.accentDim,
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 8,
    },
    testIdPillText: {
      fontSize: 9,
      color: C.accent,
      fontWeight: '500',
      fontFamily: MONO_FONT,
    } as TextStyle,
    elFilePath: {
      fontSize: 10,
      color: C.textTertiary,
      fontFamily: MONO_FONT,
      marginTop: 2,
    } as TextStyle,

    // Body
    body: {
      flexShrink: 1,
    },

    // Sections
    section: {
      borderBottomWidth: 1,
      borderBottomColor: C.divider,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    sectionIcon: {
      fontSize: 11,
      width: 18,
      textAlign: 'left',
      color: C.textSecondary,
    } as TextStyle,
    sectionTitle: {
      flex: 1,
      color: C.textSecondary,
      fontSize: 10,
      fontWeight: '600',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    } as TextStyle,
    chevron: {
      fontSize: 8,
      color: C.chevron,
    } as TextStyle,
    chevronOpen: {
      transform: [{ rotate: '90deg' }],
    },
    sectionBody: {
      paddingHorizontal: 12,
      paddingBottom: 10,
      paddingTop: 2,
    },

    // Property rows
    propRow: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 24,
      gap: 6,
      marginVertical: 1,
    },
    propRowHalf: {
      width: '50%',
    } as ViewStyle,
    propLabel: {
      fontSize: 10,
      color: C.textTertiary,
      width: 72,
      flexShrink: 0,
    } as TextStyle,
    propValue: {
      flex: 1,
      fontSize: 11,
      color: C.text,
    } as TextStyle,
    propValueEditable: {
      borderBottomWidth: 1,
      borderBottomColor: C.whiteA10,
      borderStyle: 'dashed',
    } as TextStyle,
    propEditInput: {
      flex: 1,
      fontSize: 11,
      color: C.text,
      backgroundColor: C.input,
      borderWidth: 1,
      borderColor: C.accent,
      borderRadius: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
      minHeight: 22,
    } as TextStyle,
    propValueRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    mono: {
      fontFamily: MONO_FONT,
    } as TextStyle,

    // Style names
    styleNamesWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      alignItems: 'center',
    },
    styleNamePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: C.accentDim,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
    },
    styleNamePillText: {
      fontSize: 10,
      fontFamily: MONO_FONT,
      color: C.accent,
      fontWeight: '500',
    } as TextStyle,
    styleNamePillRemove: {
      fontSize: 12,
      color: C.accent,
      lineHeight: 14,
    } as TextStyle,
    styleNamePillRemoved: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: C.errorDim,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
    },
    styleNamePillRemovedText: {
      fontSize: 10,
      fontFamily: MONO_FONT,
      color: C.error,
      fontWeight: '500',
      textDecorationLine: 'line-through',
    } as TextStyle,
    styleNamePillUndoText: {
      fontSize: 9,
      color: C.error,
    } as TextStyle,
    styleNamePillAdded: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: C.successDim,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
    },
    styleNamePillAddedText: {
      fontSize: 10,
      fontFamily: MONO_FONT,
      color: C.success,
      fontWeight: '500',
    } as TextStyle,
    addStyleNameBtn: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: C.divider,
      borderStyle: 'dashed',
    } as ViewStyle,
    addStyleNameBtnText: {
      fontSize: 10,
      color: C.textTertiary,
    } as TextStyle,
    addStyleNameInput: {
      fontSize: 10,
      fontFamily: MONO_FONT,
      color: C.text,
      backgroundColor: C.input,
      borderWidth: 1,
      borderColor: C.accent,
      borderRadius: 10,
      paddingHorizontal: 8,
      paddingVertical: 3,
      minWidth: 80,
    } as TextStyle,

    // Two-column grid
    twoCol: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    twoColSpaced: {
      marginTop: 6,
    },

    // Color swatch
    colorSwatch: {
      width: 14,
      height: 14,
      borderRadius: 3,
      borderWidth: 1,
      borderColor: C.whiteA20,
    },

    // Text content (editable)
    textContentInput: {
      fontSize: 13,
      color: C.text,
      lineHeight: 18,
      backgroundColor: C.input,
      borderWidth: 1,
      borderColor: C.divider,
      borderRadius: 4,
      paddingHorizontal: 8,
      paddingVertical: 6,
      minHeight: 40,
      textAlignVertical: 'top',
    } as TextStyle,

    // Props JSON
    propsJson: {
      backgroundColor: C.input,
      borderRadius: 4,
      padding: 6,
      marginTop: 6,
    },
    propsJsonText: {
      fontSize: 10,
      fontFamily: MONO_FONT,
      color: C.textTertiary,
      lineHeight: 14,
    } as TextStyle,

    // Spacing editor
    spacingEditor: {
      marginBottom: 8,
    },
    spacingLabel: {
      fontSize: 10,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.3,
      marginBottom: 4,
    } as TextStyle,
    spacingLabelMargin: {
      color: C.accent,
    } as TextStyle,
    spacingLabelPadding: {
      color: C.success,
    } as TextStyle,
    spacingCrossWrap: {
      alignItems: 'center',
      gap: 2,
      padding: 4,
      paddingHorizontal: 8,
      backgroundColor: C.input,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: C.divider,
    },
    spacingMidRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      justifyContent: 'center',
      width: '100%',
    } as ViewStyle,
    spacingCenter: {
      width: 36,
      height: 18,
      borderRadius: 3,
    },
    spacingCenterMargin: {
      backgroundColor: C.accentDim,
    },
    spacingCenterPadding: {
      backgroundColor: C.successDim,
    },
    spacingVal: {
      width: 40,
      textAlign: 'center',
      fontSize: 10,
      fontFamily: MONO_FONT,
      borderBottomWidth: 1,
      borderBottomColor: C.whiteA10,
      borderStyle: 'dashed',
      paddingVertical: 2,
    } as TextStyle,
    spacingValInput: {
      width: 48,
      textAlign: 'center',
      fontSize: 10,
      fontFamily: MONO_FONT,
      backgroundColor: C.input,
      borderWidth: 1,
      borderColor: C.accent,
      borderRadius: 3,
      paddingVertical: 2,
      paddingHorizontal: 2,
    } as TextStyle,

    // Message thread
    messageThread: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      gap: 4,
    },
    msgSent: {
      alignSelf: 'flex-end',
      backgroundColor: C.accent,
      borderTopLeftRadius: 8,
      borderTopRightRadius: 8,
      borderBottomLeftRadius: 8,
      borderBottomRightRadius: 2,
      paddingHorizontal: 8,
      paddingVertical: 5,
      maxWidth: '85%',
    } as ViewStyle,
    msgSentText: {
      color: C.text,
      fontSize: 11,
      lineHeight: 15,
    } as TextStyle,
    msgAgent: {
      alignSelf: 'flex-start',
      backgroundColor: C.surface,
      borderTopLeftRadius: 8,
      borderTopRightRadius: 8,
      borderBottomLeftRadius: 2,
      borderBottomRightRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 5,
      maxWidth: '85%',
    } as ViewStyle,
    msgAgentText: {
      color: C.textSecondary,
      fontSize: 11,
      lineHeight: 15,
    } as TextStyle,

    // Agent working
    agentWorking: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 4,
    },
    pulseOrb: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: C.accent,
    },
    agentWorkingText: {
      color: C.textTertiary,
      fontSize: 10,
    } as TextStyle,

    // Edits banner
    editsBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: C.warningDim,
    },
    editsBannerText: {
      flex: 1,
      fontSize: 10,
      color: C.warning,
    } as TextStyle,
    applyBtn: {
      backgroundColor: C.warning,
      borderRadius: 4,
      paddingHorizontal: 10,
      paddingVertical: 3,
    },
    applyBtnText: {
      fontSize: 10,
      fontWeight: '600',
      color: C.dark,
    } as TextStyle,

    // Footer
    footer: {
      flexShrink: 0,
      backgroundColor: C.footerBg,
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
    },
    footerTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderTopWidth: 1,
      borderTopColor: C.divider,
    },
    statusDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: C.textTertiary,
    },
    statusConnected: {
      backgroundColor: C.success,
    },
    statusDisconnected: {
      backgroundColor: C.error,
    },
    footerStatusText: {
      fontSize: 10,
      color: C.textSecondary,
      flex: 1,
    } as TextStyle,
    componentPill: {
      backgroundColor: C.surface,
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 8,
    },
    componentPillText: {
      fontSize: 10,
      fontFamily: MONO_FONT,
      color: C.textSecondary,
    } as TextStyle,

    // Composer
    composer: {
      paddingHorizontal: 12,
      paddingBottom: 34,
      paddingTop: 6,
    },
    composerWrap: {
      position: 'relative',
    } as ViewStyle,
    chatInput: {
      backgroundColor: C.input,
      color: C.text,
      borderWidth: 1,
      borderColor: C.divider,
      borderRadius: 10,
      paddingLeft: 12,
      paddingRight: 42,
      paddingVertical: 10,
      fontSize: 13,
      minHeight: 80,
      maxHeight: 150,
    } as TextStyle,
    sendBtn: {
      position: 'absolute',
      right: 5,
      bottom: 5,
      backgroundColor: C.accent,
      borderRadius: 6,
      width: 26,
      height: 26,
      justifyContent: 'center',
      alignItems: 'center',
    } as ViewStyle,
    sendBtnDisabled: {
      opacity: 0.3,
    },
    sendBtnText: {
      color: C.text,
      fontSize: 14,
      fontWeight: '700',
      lineHeight: 16,
    } as TextStyle,
  });
}
