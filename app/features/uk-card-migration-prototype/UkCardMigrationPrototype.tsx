/* eslint-disable react-native/no-inline-styles */
import React, { useEffect, useReducer, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import {
  initialMigrationState,
  MIGRATION_STEPS,
  MigrationAction,
  MigrationStep,
  ukCardMigrationReducer,
} from './ukCardMigrationReducer';

const MOCK_CARD = {
  number: '4242 4242 4242 4242',
  expiry: '09/30',
  cvv: '123',
  cardholder: 'ALEX MORGAN',
  wallet: '0x0000000000000000000000000000000000000000',
};

const COPY =
  'All information, identity checks, balances, approvals, and card details in this prototype are mocked.';

const STEP_CONTENT: Record<
  Exclude<MigrationStep, 'dashboard'>,
  { eyebrow: string; title: string; body: string; action: string }
> = {
  intro: {
    eyebrow: 'MetaMask card',
    title: 'Move to your new card',
    body: 'Your existing UK card is changing. We will help you move your balance and create a new card.',
    action: 'Continue',
  },
  'get-started': {
    eyebrow: 'Before you begin',
    title: 'Get started',
    body: 'First, complete a short identity check. It is simulated in this development-only prototype.',
    action: 'Start identity check',
  },
  'sumsub-camera': {
    eyebrow: 'Identity check · 1 of 5',
    title: 'Allow camera access',
    body: 'Sumsub needs camera access to securely check your identity. This is a simulation.',
    action: 'Allow camera',
  },
  'sumsub-face': {
    eyebrow: 'Identity check · 2 of 5',
    title: 'Position your face',
    body: 'Keep your face inside the frame and look directly at the camera.',
    action: 'Simulate scan',
  },
  'sumsub-check': {
    eyebrow: 'Identity check · 3 of 5',
    title: 'Checking your identity',
    body: 'We are running a simulated identity check. No information leaves this prototype.',
    action: 'Complete check',
  },
  'sumsub-data': {
    eyebrow: 'Identity check · 4 of 5',
    title: 'Confirm your details',
    body: 'Alex Morgan · United Kingdom\nDate of birth and address verified (mock data).',
    action: 'Confirm details',
  },
  'sumsub-approved': {
    eyebrow: 'Identity check · 5 of 5',
    title: 'Identity approved',
    body: 'Your simulated Sumsub verification is complete.',
    action: 'Continue',
  },
  'awaiting-approval': {
    eyebrow: 'Application status',
    title: 'Your application is ready',
    body: 'The approval wait is simulated. Continue when you are ready to review funding.',
    action: 'Simulate approval',
  },
  'funding-source': {
    eyebrow: 'Funding source',
    title: 'Approve your wallet',
    body: 'Use your selected MetaMask wallet as the funding source for your new card.',
    action: 'Approve funding source',
  },
  'wallet-permission': {
    eyebrow: 'Wallet permission',
    title: 'Allow card access?',
    body: 'Allow the card service to request funds from Account 1 when you make a purchase.',
    action: 'Allow',
  },
  'move-balance': {
    eyebrow: 'Move your balance',
    title: 'USDC on Linea to USDC on Base',
    body: 'Move your mocked £248.60 card balance to Base so it is ready for your new card.',
    action: 'Move balance',
  },
  'card-creation': {
    eyebrow: 'Creating card',
    title: 'Your card is being created',
    body: 'Keep this screen open while we create your new virtual card in the background.',
    action: '',
  },
  'card-ready': {
    eyebrow: 'All done',
    title: 'Your new card is ready',
    body: 'Your balance is on Base and your virtual MetaMask card is ready to use.',
    action: 'Return to dashboard',
  },
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function PrototypeButton({
  label,
  onPress,
  secondary = false,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
}) {
  const pressed = useSharedValue(0);
  const reduceMotion = useReducedMotion();
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pressed.value, [0, 1], [1, 0.85]),
    transform: [
      { scale: interpolate(pressed.value, [0, 1], [1, reduceMotion ? 1 : 0.97]) },
    ],
  }));
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      onPressIn={() => {
        pressed.value = withTiming(1, { duration: reduceMotion ? 0 : 80 });
      }}
      onPressOut={() => {
        pressed.value = withTiming(0, { duration: reduceMotion ? 0 : 120 });
      }}
      style={[
        styles.action,
        secondary ? styles.secondaryAction : styles.primaryAction,
        animatedStyle,
      ]}
    >
      <Text
        color={TextColor.Default}
        style={secondary ? styles.inverseText : styles.darkText}
      >
        {label}
      </Text>
    </AnimatedPressable>
  );
}

function PrototypeSheet({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const progress = useSharedValue(visible ? 1 : 0);
  const backdropProgress = useSharedValue(visible ? 0.6 : 0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (visible) {
      setMounted(true);
      backdropProgress.value = withTiming(0.6, {
        duration: reduceMotion ? 0 : 200,
      });
      progress.value = reduceMotion
        ? withTiming(1, { duration: 0 })
        : withSpring(1, { stiffness: 540, damping: 55 });
    } else if (mounted) {
      backdropProgress.value = withTiming(0, {
        duration: reduceMotion ? 0 : 200,
      });
      progress.value = withTiming(
        0,
        {
          duration: reduceMotion ? 0 : 280,
          easing: Easing.bezier(0.32, 0.72, 0, 1),
        },
      );
      const timer = setTimeout(() => setMounted(false), reduceMotion ? 0 : 280);
      return () => clearTimeout(timer);
    }
  }, [backdropProgress, mounted, progress, reduceMotion, visible]);

  const sheetStyle = useAnimatedStyle(() => ({
    opacity: reduceMotion ? progress.value : 1,
    transform: [{ translateY: reduceMotion ? 0 : (1 - progress.value) * 500 }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropProgress.value,
  }));

  if (!mounted) return null;
  return (
    <Modal transparent visible onRequestClose={onClose} animationType="none">
      <View style={styles.modal}>
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close sheet"
            onPress={onClose}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, 12) + 24 },
            sheetStyle,
          ]}
        >
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

function Dashboard({
  complete,
  creating,
  frozen,
  dispatch,
}: {
  complete: boolean;
  creating: boolean;
  frozen: boolean;
  dispatch: React.Dispatch<MigrationAction>;
}) {
  return (
    <>
      <Text color={TextColor.Inverse} variant={TextVariant.HeadingLg}>
        Card
      </Text>
      <View style={styles.balance}>
        <Text style={styles.muted}>Available balance</Text>
        <Text color={TextColor.Inverse} variant={TextVariant.DisplayMd}>
          £248.60
        </Text>
        <Text style={styles.muted}>USDC · Mock balance</Text>
      </View>
      {creating ? (
        <View style={styles.notice}>
          <Text color={TextColor.Inverse} variant={TextVariant.HeadingSm}>
            Card setup continues in the background
          </Text>
          <Text style={styles.muted}>
            You can keep using MetaMask while this simulated step finishes.
          </Text>
        </View>
      ) : !complete ? (
        <View style={styles.notice}>
          <Text color={TextColor.Inverse} variant={TextVariant.HeadingSm}>
            Move to your new card
          </Text>
          <Text style={styles.muted}>Your UK card needs a quick migration to keep working.</Text>
          <PrototypeButton
            label="Start migration"
            onPress={() => dispatch({ type: 'NEXT' })}
          />
        </View>
      ) : (
        <View style={styles.card}>
          <Text color={TextColor.Inverse}>METAMASK · VIRTUAL</Text>
          <Text color={TextColor.Inverse} variant={TextVariant.HeadingLg}>
            •••• 4242
          </Text>
          <Text color={TextColor.Inverse}>Virtual card · Ready</Text>
          <PrototypeButton
            label="View card details"
            onPress={() => dispatch({ type: 'OPEN_AUTH' })}
          />
          <PrototypeButton
            label="View transaction history"
            secondary
            onPress={() => dispatch({ type: 'VIEW_HISTORY' })}
          />
          <View style={styles.freezeRow}>
            <Text color={TextColor.Inverse}>Freeze card</Text>
            <Switch
              accessibilityLabel="Freeze card"
              accessibilityRole="switch"
              value={frozen}
              onValueChange={() => dispatch({ type: 'TOGGLE_FREEZE' })}
            />
          </View>
        </View>
      )}
    </>
  );
}

export function UkCardMigrationPrototype() {
  const insets = useSafeAreaInsets();
  const [state, dispatch] = useReducer(
    ukCardMigrationReducer,
    initialMigrationState,
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [password, setPassword] = useState('');
  const visualStep =
    state.step === 'wallet-permission' ? 'funding-source' : state.step;
  const content =
    visualStep === 'dashboard' || visualStep === 'card-creation'
      ? null
      : STEP_CONTENT[visualStep];
  const cardReadyContent =
    state.step === 'card-ready' && !state.balanceMoved
      ? {
          ...STEP_CONTENT['card-ready'],
          body: 'Your virtual MetaMask card is ready. You can move your previous card balance from the dashboard when you are ready.',
        }
      : content;

  useEffect(() => {
    if (state.step !== 'card-creation') return undefined;
    const timer = setTimeout(
      () => dispatch({ type: 'CARD_CREATED' }),
      2200,
    );
    return () => clearTimeout(timer);
  }, [state.step]);

  return (
    <View
      style={[
        styles.root,
        { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 },
      ]}
    >
      <View style={styles.devBar}>
        <Text color={TextColor.Inverse} variant={TextVariant.BodySm}>
          DEV ONLY · MOCK DATA
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open prototype state picker"
          onPress={() => setPickerOpen((open) => !open)}
        >
          <Text style={styles.eyebrow}>
            {pickerOpen ? 'Close tools' : 'State picker'}
          </Text>
        </Pressable>
      </View>
      {pickerOpen && (
        <View style={styles.devPanel}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {MIGRATION_STEPS.map((step) => (
              <Pressable
                key={step}
                accessibilityRole="button"
                accessibilityLabel={`Jump to ${step}`}
                onPress={() => dispatch({ type: 'JUMP', step })}
                style={[
                  styles.chip,
                  state.step === step && styles.selectedChip,
                ]}
              >
                <Text color={TextColor.Inverse} variant={TextVariant.BodySm}>
                  {step}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <View style={styles.devActions}>
            <PrototypeButton
              secondary
              label="Reset"
              onPress={() => dispatch({ type: 'RESET' })}
            />
            <Text style={styles.muted} variant={TextVariant.BodySm}>
              Event log · {state.events.slice(-4).join(' → ')}
            </Text>
          </View>
        </View>
      )}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        {state.step === 'dashboard' || state.step === 'card-creation' ? (
          <Dashboard
            complete={state.migrationComplete}
            creating={state.step === 'card-creation'}
            frozen={state.cardFrozen}
            dispatch={dispatch}
          />
        ) : (
          <>
            <Text style={styles.eyebrow}>{cardReadyContent?.eyebrow}</Text>
            <View style={styles.hero}>
              <Text color={TextColor.Inverse} variant={TextVariant.DisplayMd}>
                {cardReadyContent?.title}
              </Text>
              <Text style={styles.muted}>{cardReadyContent?.body}</Text>
            </View>
            {visualStep === 'sumsub-face' && (
              <View style={styles.faceFrame}>
                <Text variant={TextVariant.DisplayMd}>◯</Text>
                <Text style={styles.muted}>Simulated camera preview</Text>
              </View>
            )}
            {visualStep === 'move-balance' && (
              <View style={styles.route}>
                <View style={styles.routeRow}>
                  <Text style={styles.muted}>From</Text>
                  <Text color={TextColor.Inverse}>● USDC on Linea</Text>
                  <Text color={TextColor.Inverse}>£248.60</Text>
                </View>
                <View style={styles.routeRow}>
                  <Text style={styles.muted}>To</Text>
                  <Text color={TextColor.Inverse}>● USDC on Base</Text>
                  <Text color={TextColor.Inverse}>£248.60</Text>
                </View>
              </View>
            )}
            {visualStep === 'move-balance' ? (
              <>
              <PrototypeButton
                label="Move £248.60"
                onPress={() => dispatch({ type: 'NEXT' })}
              />
              <PrototypeButton
                secondary
                label="Skip for now"
                onPress={() => dispatch({ type: 'SKIP_BALANCE' })}
              />
              </>
            ) : (
              <PrototypeButton
                label={cardReadyContent?.action ?? 'Continue'}
                onPress={() => dispatch({ type: 'NEXT' })}
              />
            )}
          </>
        )}
        <Text style={styles.disclaimer} variant={TextVariant.BodySm}>
          {COPY}
        </Text>
      </ScrollView>

      <PrototypeSheet
        visible={state.step === 'wallet-permission'}
        onClose={() => dispatch({ type: 'JUMP', step: 'funding-source' })}
      >
        <Text style={styles.eyebrow}>Wallet permission</Text>
        <Text color={TextColor.Inverse} variant={TextVariant.HeadingLg}>Allow card access?</Text>
        <Text style={styles.muted}>
          Allow the card service to request funds from Account 1 when you make a
          purchase. This permission is simulated.
        </Text>
        <PrototypeButton
          label="Allow"
          onPress={() => dispatch({ type: 'NEXT' })}
        />
      </PrototypeSheet>

      <PrototypeSheet
        visible={state.authSheetOpen}
        onClose={() => dispatch({ type: 'CLOSE_SHEETS' })}
      >
        <Text color={TextColor.Inverse} variant={TextVariant.HeadingLg}>
          Verify it’s you
        </Text>
        <Text style={styles.muted}>
          Confirm it is you before showing sensitive card information.
        </Text>
        {state.passwordMode ? (
          <>
            <TextInput
              accessibilityLabel="Password"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor="#9b9b9b"
              style={styles.input}
            />
            {state.passwordError && (
              <Text style={styles.error}>Enter your password.</Text>
            )}
            <PrototypeButton
              label="Continue"
              onPress={() => dispatch({ type: 'SUBMIT_PASSWORD', password })}
            />
          </>
        ) : (
          <>
            <PrototypeButton
              label="Use Face ID"
              onPress={() => dispatch({ type: 'REQUEST_FACE_ID' })}
            />
            <PrototypeButton
              secondary
              label="Use password"
              onPress={() => dispatch({ type: 'REQUEST_PASSWORD' })}
            />
          </>
        )}
      </PrototypeSheet>

      <PrototypeSheet
        visible={state.detailsSheetOpen}
        onClose={() => dispatch({ type: 'CLOSE_SHEETS' })}
      >
        <Text color={TextColor.Inverse} variant={TextVariant.HeadingLg}>
          Card details
        </Text>
        <Text style={styles.muted}>Card number</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Copy card number"
          onPress={() => dispatch({ type: 'COPY_CARD_NUMBER' })}
        >
          <Text color={TextColor.Inverse} variant={TextVariant.HeadingMd}>
            {MOCK_CARD.number} · {state.copied ? 'Copied' : 'Copy'}
          </Text>
        </Pressable>
        <View style={styles.detailRow}>
          <View>
            <Text style={styles.muted}>Expiry date</Text>
            <Text color={TextColor.Inverse}>{MOCK_CARD.expiry}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Show or hide CVV"
            onPress={() => dispatch({ type: 'TOGGLE_CVV' })}
          >
            <Text style={styles.muted}>CVV · Show or hide</Text>
            <Text color={TextColor.Inverse}>{state.cvvVisible ? MOCK_CARD.cvv : '•••'}</Text>
          </Pressable>
        </View>
        <Text style={styles.muted}>Cardholder name</Text>
        <Text color={TextColor.Inverse}>{MOCK_CARD.cardholder}</Text>
        <Text style={styles.muted}>Wallet address</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Show full wallet address"
          onPress={() => dispatch({ type: 'TOGGLE_WALLET_ADDRESS' })}
        >
          <Text color={TextColor.Inverse}>
            {state.walletExpanded ? MOCK_CARD.wallet : '0x0000...0000'} ·{' '}
            {state.walletExpanded ? 'Hide' : 'Show'}
          </Text>
        </Pressable>
        <Text style={styles.muted}>
          Add this card to Apple Pay or Google Pay after setup in your digital
          wallet.
        </Text>
        <PrototypeButton
          label="Done"
          onPress={() => dispatch({ type: 'CLOSE_SHEETS' })}
        />
      </PrototypeSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#131416' },
  content: { flex: 1 },
  contentContainer: { padding: 24, gap: 24, flexGrow: 1 },
  devBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#303134',
  },
  devPanel: { padding: 12, backgroundColor: '#1c1d1f', gap: 8 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#4a4b4d',
  },
  selectedChip: { backgroundColor: '#303134', borderColor: '#ffffff' },
  devActions: { gap: 8 },
  hero: { gap: 16, marginTop: 42 },
  action: {
    minHeight: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginTop: 8,
  },
  primaryAction: { backgroundColor: '#ffffff' },
  secondaryAction: {
    backgroundColor: '#1c1d1f',
    borderWidth: 1,
    borderColor: '#4a4b4d',
  },
  balance: { alignItems: 'center', paddingVertical: 32, gap: 6 },
  notice: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#1c1d1f',
    gap: 12,
  },
  card: {
    minHeight: 220,
    padding: 24,
    borderRadius: 20,
    backgroundColor: '#1c1d1f',
    justifyContent: 'space-between',
  },
  faceFrame: {
    height: 240,
    borderRadius: 120,
    borderWidth: 3,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  route: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#1c1d1f',
    gap: 12,
  },
  routeRow: { gap: 6, paddingVertical: 8 },
  freezeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  muted: { color: '#9b9b9b' },
  eyebrow: { color: '#ffffff' },
  inverseText: { color: '#ffffff' },
  darkText: { color: '#131416' },
  error: { color: '#ff7a7a' },
  input: {
    borderWidth: 1,
    borderColor: '#4a4b4d',
    borderRadius: 12,
    color: '#ffffff',
    padding: 14,
  },
  disclaimer: { marginTop: 'auto', color: '#9b9b9b' },
  modal: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  sheet: {
    backgroundColor: '#1c1d1f',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
    gap: 14,
  },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between' },
});

export default UkCardMigrationPrototype;