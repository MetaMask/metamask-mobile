import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Button,
  ButtonVariant,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

import ScreenLayout from '../../Aggregator/components/ScreenLayout';
import Row from '../../Aggregator/components/Row';
import HeaderCompactStandard from '../../../../../component-library/components-temp/HeaderCompactStandard';
import Accordion from '../../../../../component-library/components/Accordions/Accordion/Accordion';
import { AccordionHeaderHorizontalAlignment } from '../../../../../component-library/components/Accordions/Accordion';

import { strings } from '../../../../../../locales/i18n';

import { useStyles } from '../../../../hooks/useStyles';

import useRampsController from '../../hooks/useRampsController';
import {
  useHeadlessBuy,
  type PaymentMethod,
  type QuotesResponse,
} from '../../headless';
import type { Quote } from '../../types';

import styleSheet from './HeadlessPlayground.styles';

export const HEADLESS_PLAYGROUND_HEADER_TEST_ID = 'headless-playground-header';
export const HEADLESS_PLAYGROUND_BACK_BUTTON_TEST_ID =
  'headless-playground-back-button';
export const HEADLESS_PLAYGROUND_SUMMARY_TEST_ID =
  'headless-playground-summary';
export const HEADLESS_PLAYGROUND_SUMMARY_DIVIDER_TEST_ID =
  'headless-playground-summary-divider';
export const HEADLESS_PLAYGROUND_AMOUNT_INPUT_TEST_ID =
  'headless-playground-amount-input';
export const HEADLESS_PLAYGROUND_GET_QUOTES_BUTTON_TEST_ID =
  'headless-playground-get-quotes-button';
export const HEADLESS_PLAYGROUND_QUOTES_SECTION_TEST_ID =
  'headless-playground-quotes-section';
export const HEADLESS_PLAYGROUND_HEADLESS_SECTION_TEST_ID =
  'headless-playground-headless-section';
export const HEADLESS_PLAYGROUND_RESET_ASSET_TEST_ID =
  'headless-playground-reset-asset';
export const HEADLESS_PLAYGROUND_RESET_PAYMENT_METHOD_TEST_ID =
  'headless-playground-reset-payment-method';
export const HEADLESS_PLAYGROUND_RESET_PROVIDER_TEST_ID =
  'headless-playground-reset-provider';
export const HEADLESS_PLAYGROUND_START_BUTTON_TEST_ID =
  'headless-playground-start-button';
export const HEADLESS_PLAYGROUND_CANCEL_BUTTON_TEST_ID =
  'headless-playground-cancel-button';
export const HEADLESS_PLAYGROUND_EVENT_LOG_TEST_ID =
  'headless-playground-event-log';

export enum HeadlessPlaygroundAccordionIndex {
  Selected = 0,
  Providers = 1,
  Tokens = 2,
  PaymentMethods = 3,
  Countries = 4,
  Quotes = 5,
}

export const HEADLESS_PLAYGROUND_DEFAULT_TOKEN_ASSET_ID =
  'eip155:59144/erc20:0xaca92e438df0b2401ff60da7e4337b687a2435da';
export const HEADLESS_PLAYGROUND_DEFAULT_PROVIDER_ID_SUFFIX = 'transak-native';

// =============================================================================
// HARDCODED INPUTS FOR THE HEADLESS CONSUMER SIMULATION
// =============================================================================
// These are the only "selection" inputs the headless sandbox section is
// allowed to read. Together with the user-typed amount (via useState) and
// `useHeadlessBuy` they reproduce what an external consumer of the public
// hook would have at hand. Do NOT replace these with controller-derived
// values — see the section comment in HeadlessPlayground.tsx for context.
// =============================================================================
export const HEADLESS_SIM_ASSET_ID = HEADLESS_PLAYGROUND_DEFAULT_TOKEN_ASSET_ID;
export const HEADLESS_SIM_PAYMENT_METHOD_ID = '/payments/debit-credit-card';
export const HEADLESS_SIM_PROVIDER_ID = '/providers/transak-native';

interface DataAccordionProps {
  title: string;
  status: string;
  children: React.ReactNode;
  isEmpty: boolean;
  isExpanded?: boolean;
  styles: ReturnType<typeof styleSheet>;
}

function DataAccordion({
  title,
  status,
  children,
  isEmpty,
  isExpanded = false,
  styles,
}: DataAccordionProps) {
  return (
    <View style={styles.section}>
      <Accordion
        title={`${title} (${status})`}
        isExpanded={isExpanded}
        horizontalAlignment={AccordionHeaderHorizontalAlignment.Start}
      >
        <View style={styles.box}>
          {isEmpty ? (
            <View style={styles.emptyState}>
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
              >
                {strings(
                  'app_settings.fiat_on_ramp.headless_playground.no_data',
                )}
              </Text>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={styles.boxScroll}
              nestedScrollEnabled
            >
              {children}
            </ScrollView>
          )}
        </View>
      </Accordion>
    </View>
  );
}

interface SelectedRowProps {
  label: string;
  value: string;
  styles: ReturnType<typeof styleSheet>;
}

function SelectedRow({ label, value, styles }: SelectedRowProps) {
  return (
    <View style={styles.selectedRow}>
      <Text
        variant={TextVariant.BodySm}
        color={TextColor.TextAlternative}
        style={styles.selectedRowLabel}
      >
        {label}
      </Text>
      <Text variant={TextVariant.BodySm}>{value}</Text>
    </View>
  );
}

interface SandboxParamRowProps {
  label: string;
  resolvedName?: string;
  rawId: string;
  isOverridden: boolean;
  onReset: () => void;
  styles: ReturnType<typeof styleSheet>;
  resetTestID?: string;
  isLast?: boolean;
}

function SandboxParamRow({
  label,
  resolvedName,
  rawId,
  isOverridden,
  onReset,
  styles,
  resetTestID,
  isLast = false,
}: SandboxParamRowProps) {
  return (
    <View
      style={[styles.sandboxParamRow, isLast && styles.sandboxParamRowLast]}
    >
      <View style={styles.sandboxParamHeader}>
        <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
          {label}
        </Text>
        <Text
          variant={TextVariant.BodyXs}
          color={
            isOverridden ? TextColor.WarningDefault : TextColor.TextAlternative
          }
          fontWeight={isOverridden ? FontWeight.Medium : FontWeight.Regular}
        >
          {isOverridden
            ? strings(
                'app_settings.fiat_on_ramp.headless_playground.headless_section_meta_overridden',
              )
            : strings(
                'app_settings.fiat_on_ramp.headless_playground.headless_section_meta_hardcoded',
              )}
        </Text>
      </View>
      <Text variant={TextVariant.BodySm}>
        {resolvedName ? `${resolvedName} — ${rawId}` : rawId}
      </Text>
      {isOverridden ? (
        <Pressable
          onPress={onReset}
          style={styles.sandboxParamReset}
          accessibilityRole="button"
          testID={resetTestID}
        >
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.PrimaryDefault}
            fontWeight={FontWeight.Medium}
          >
            {strings(
              'app_settings.fiat_on_ramp.headless_playground.headless_section_reset',
            )}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

interface SelectableRowProps {
  label: string;
  isSelected: boolean;
  onPress: () => void;
  testID?: string;
  styles: ReturnType<typeof styleSheet>;
}

function SelectableRow({
  label,
  isSelected,
  onPress,
  testID,
  styles,
}: SelectableRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.selectableRow, isSelected && styles.selectableRowSelected]}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      testID={testID}
    >
      <Text
        variant={TextVariant.BodySm}
        fontWeight={isSelected ? FontWeight.Medium : FontWeight.Regular}
        color={isSelected ? TextColor.PrimaryDefault : TextColor.TextDefault}
        style={styles.selectableRowLabel}
      >
        {label}
      </Text>
      {isSelected ? (
        <Icon
          name={IconName.Check}
          size={IconSize.Sm}
          color={IconColor.PrimaryDefault}
        />
      ) : null}
    </Pressable>
  );
}

type QuotesStatus = 'idle' | 'loading' | 'success' | 'error';

function HeadlessPlayground() {
  const navigation = useNavigation();
  const { styles } = useStyles(styleSheet, {});

  // Setters live in the controller hook — `useHeadlessBuy` is read-only on
  // purpose. The playground simulates an external consumer pre-seeding
  // controller state before invoking the hook.
  const {
    setSelectedProvider,
    setSelectedToken,
    setSelectedPaymentMethod,
    setUserRegion,
    selectedProvider,
    selectedToken,
    selectedPaymentMethod,
  } = useRampsController();

  const {
    userRegion,
    providers,
    tokens,
    paymentMethods,
    countries,
    isLoading: headlessIsLoading,
    errors: headlessErrors,
    getQuotes,
    startHeadlessBuy,
  } = useHeadlessBuy();

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // Default selections are applied at most once per mount: once data arrives,
  // we make a single attempt to pick mUSD on Linea and the Transak native
  // provider so the playground starts in a useful state. After this initial
  // attempt, the user is fully in control of the selection.
  const hasAttemptedTokenDefault = useRef(false);
  const hasAttemptedProviderDefault = useRef(false);

  useEffect(() => {
    if (hasAttemptedTokenDefault.current) {
      return;
    }
    if (headlessIsLoading) {
      return;
    }
    const allTokens = tokens?.allTokens ?? [];
    if (allTokens.length === 0) {
      return;
    }
    hasAttemptedTokenDefault.current = true;
    if (selectedToken) {
      return;
    }
    const target = allTokens.find(
      (token) =>
        token.assetId.toLowerCase() ===
        HEADLESS_PLAYGROUND_DEFAULT_TOKEN_ASSET_ID,
    );
    if (target) {
      setSelectedToken(target.assetId);
    }
  }, [tokens, headlessIsLoading, selectedToken, setSelectedToken]);

  useEffect(() => {
    if (hasAttemptedProviderDefault.current) {
      return;
    }
    if (headlessIsLoading) {
      return;
    }
    if (!providers || providers.length === 0) {
      return;
    }
    hasAttemptedProviderDefault.current = true;
    if (selectedProvider) {
      return;
    }
    const target = providers.find((provider) =>
      provider.id
        .toLowerCase()
        .endsWith(HEADLESS_PLAYGROUND_DEFAULT_PROVIDER_ID_SUFFIX),
    );
    if (target) {
      setSelectedProvider(target);
    }
  }, [providers, headlessIsLoading, selectedProvider, setSelectedProvider]);

  // ===========================================================================
  // HEADLESS CONSUMER SIMULATION — local state
  // ===========================================================================
  // The sandbox simulates how an external consumer would invoke
  // `useHeadlessBuy.getQuotes`:
  //
  //   • The "amount" input + quote results live in `useState` (owned by the
  //     consumer).
  //   • The asset / payment method / provider IDs default to the
  //     HEADLESS_SIM_* hardcoded constants above. They can be *overridden*
  //     by selecting a different option in the picker accordions higher up
  //     (which write to `useRampsController`'s selected* state). When an
  //     override is active a "Reset" link surfaces here so you can flip back
  //     to the hardcoded sim value.
  //   • `getQuotes` itself goes through `useHeadlessBuy` — never through the
  //     controller's own `getQuotes`. That's the public surface we're
  //     validating with this sandbox.
  // ===========================================================================
  const [headlessAmount, setHeadlessAmount] = useState('25');
  const [headlessQuotesStatus, setHeadlessQuotesStatus] =
    useState<QuotesStatus>('idle');
  const [headlessQuotesResult, setHeadlessQuotesResult] =
    useState<QuotesResponse | null>(null);
  const [headlessQuotesError, setHeadlessQuotesError] = useState<string | null>(
    null,
  );

  const headlessAmountAsNumber = Number(headlessAmount);
  const headlessAmountIsValid =
    Number.isFinite(headlessAmountAsNumber) && headlessAmountAsNumber > 0;

  const canGetQuotes = headlessAmountIsValid;

  const effectiveAssetId = selectedToken?.assetId ?? HEADLESS_SIM_ASSET_ID;
  const effectivePaymentMethodId =
    selectedPaymentMethod?.id ?? HEADLESS_SIM_PAYMENT_METHOD_ID;
  const effectiveProviderId = selectedProvider?.id ?? HEADLESS_SIM_PROVIDER_ID;

  const isAssetOverridden =
    effectiveAssetId.toLowerCase() !== HEADLESS_SIM_ASSET_ID.toLowerCase();
  const isPaymentMethodOverridden =
    effectivePaymentMethodId !== HEADLESS_SIM_PAYMENT_METHOD_ID;
  const isProviderOverridden = effectiveProviderId !== HEADLESS_SIM_PROVIDER_ID;

  // Reset = restore the hardcoded sim defaults. For the token we re-select
  // HEADLESS_SIM_ASSET_ID instead of clearing because the controller's
  // setSelectedToken does not accept null. Once equal to the hardcoded id,
  // `isAssetOverridden` becomes false and the Reset link disappears.
  const handleResetAsset = useCallback(() => {
    setSelectedToken(HEADLESS_SIM_ASSET_ID);
  }, [setSelectedToken]);
  const handleResetPaymentMethod = useCallback(() => {
    setSelectedPaymentMethod(null);
  }, [setSelectedPaymentMethod]);
  const handleResetProvider = useCallback(() => {
    setSelectedProvider(null);
  }, [setSelectedProvider]);

  const handleHeadlessGetQuotes = useCallback(async () => {
    if (!headlessAmountIsValid) {
      return;
    }
    setHeadlessQuotesStatus('loading');
    setHeadlessQuotesError(null);
    try {
      const result = await getQuotes({
        assetId: effectiveAssetId,
        amount: headlessAmountAsNumber,
        paymentMethodIds: [effectivePaymentMethodId],
        providerIds: [effectiveProviderId],
      });
      setHeadlessQuotesResult(result);
      setHeadlessQuotesStatus('success');
    } catch (error) {
      setHeadlessQuotesResult(null);
      setHeadlessQuotesError(
        error instanceof Error ? error.message : 'Unknown error',
      );
      setHeadlessQuotesStatus('error');
    }
  }, [
    getQuotes,
    headlessAmountAsNumber,
    headlessAmountIsValid,
    effectiveAssetId,
    effectivePaymentMethodId,
    effectiveProviderId,
  ]);

  // ---------------------------------------------------------------------------
  // HEADLESS SESSION SIMULATION
  // ---------------------------------------------------------------------------
  // The playground holds an inline "event log" so we can eyeball the lifecycle
  // callbacks the consumer wires into `startHeadlessBuy`. Phase 3 exercises
  // the start + cancel paths; the order/error/close events are wired to fire
  // from the registry in later phases.
  const [eventLog, setEventLog] = useState<string[]>([]);
  const [activeSession, setActiveSession] = useState<{
    sessionId: string;
    cancel: () => void;
  } | null>(null);

  const appendEvent = useCallback((message: string) => {
    setEventLog((current) => [
      `${new Date().toISOString()} · ${message}`,
      ...current,
    ]);
  }, []);

  const fiatCurrency = userRegion?.country?.currency;

  // Per-quote start: each successful row in the quotes list renders a
  // "Start headless buy" action that calls back here with the actual
  // Quote object. The hook itself enforces the single-live-session
  // policy (auto-cancels any prior active session), so this UI only has
  // to wire callbacks + log events.
  const handleStartHeadlessBuyForQuote = useCallback(
    (quote: Quote) => {
      if (!headlessAmountIsValid) {
        return;
      }
      const params = {
        quote,
        assetId: effectiveAssetId,
        amount: headlessAmountAsNumber,
        currency: fiatCurrency,
      };
      const session = startHeadlessBuy(params, {
        onOrderCreated: (orderId) => {
          appendEvent(
            strings(
              'app_settings.fiat_on_ramp.headless_playground.event_log_order_created',
              { orderId },
            ),
          );
          setActiveSession(null);
        },
        onError: (error) => {
          appendEvent(
            strings(
              'app_settings.fiat_on_ramp.headless_playground.event_log_error',
              {
                code: error.code,
                messageSuffix: error.message ? ` (${error.message})` : '',
              },
            ),
          );
          setActiveSession(null);
        },
        onClose: (info) => {
          appendEvent(
            strings(
              'app_settings.fiat_on_ramp.headless_playground.event_log_close',
              { reason: info.reason },
            ),
          );
          setActiveSession(null);
        },
      });
      appendEvent(
        strings(
          'app_settings.fiat_on_ramp.headless_playground.event_log_started',
          {
            sessionId: session.sessionId,
            assetId: params.assetId,
            amount: params.amount,
            paymentMethodId: quote.quote.paymentMethod ?? '',
            providerSuffix: quote.providerInfo?.id
              ? `, provider=${quote.providerInfo.id}`
              : `, provider=${quote.provider}`,
          },
        ),
      );
      setActiveSession(session);
    },
    [
      appendEvent,
      effectiveAssetId,
      fiatCurrency,
      headlessAmountAsNumber,
      headlessAmountIsValid,
      startHeadlessBuy,
    ],
  );

  const handleCancelHeadlessSession = useCallback(() => {
    if (!activeSession) {
      return;
    }
    appendEvent(
      strings(
        'app_settings.fiat_on_ramp.headless_playground.event_log_cancelled',
        { sessionId: activeSession.sessionId },
      ),
    );
    activeSession.cancel();
    setActiveSession(null);
  }, [activeSession, appendEvent]);

  // Resolve the effective ids into human-friendly labels via `useHeadlessBuy`
  // so the section also exercises the catalog data exposed by the hook.
  const headlessResolvedToken = useMemo(
    () =>
      tokens?.allTokens?.find(
        (token) =>
          token.assetId.toLowerCase() === effectiveAssetId.toLowerCase(),
      ),
    [tokens, effectiveAssetId],
  );
  const headlessResolvedPaymentMethod = useMemo(
    () =>
      paymentMethods.find(
        (paymentMethod) => paymentMethod.id === effectivePaymentMethodId,
      ),
    [paymentMethods, effectivePaymentMethodId],
  );
  const headlessResolvedProvider = useMemo(
    () => providers.find((provider) => provider.id === effectiveProviderId),
    [providers, effectiveProviderId],
  );

  const formatStatus = (
    isSectionLoading: boolean,
    error: string | null,
    count: number,
  ) => {
    if (isSectionLoading) {
      return strings('app_settings.fiat_on_ramp.headless_playground.loading');
    }
    if (error) {
      return `${strings(
        'app_settings.fiat_on_ramp.headless_playground.error',
      )}: ${error}`;
    }
    return strings('app_settings.fiat_on_ramp.headless_playground.count', {
      count,
    });
  };

  const noneSelected = strings(
    'app_settings.fiat_on_ramp.headless_playground.none_selected',
  );
  const noData = strings(
    'app_settings.fiat_on_ramp.headless_playground.no_data',
  );

  const tokensList = tokens?.allTokens ?? [];

  const selectedValuesCount = [
    userRegion,
    selectedProvider,
    selectedToken,
    selectedPaymentMethod,
  ].filter(Boolean).length;

  const quotesSummary = useMemo(() => {
    if (headlessQuotesStatus === 'loading') {
      return strings('app_settings.fiat_on_ramp.headless_playground.loading');
    }
    if (headlessQuotesStatus === 'error' && headlessQuotesError) {
      return `${strings(
        'app_settings.fiat_on_ramp.headless_playground.error',
      )}: ${headlessQuotesError}`;
    }
    if (headlessQuotesStatus === 'success') {
      const successCount = headlessQuotesResult?.success?.length ?? 0;
      return strings('app_settings.fiat_on_ramp.headless_playground.count', {
        count: successCount,
      });
    }
    return strings('app_settings.fiat_on_ramp.headless_playground.quotes_idle');
  }, [headlessQuotesStatus, headlessQuotesError, headlessQuotesResult]);

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <HeaderCompactStandard
        testID={HEADLESS_PLAYGROUND_HEADER_TEST_ID}
        title={strings('app_settings.fiat_on_ramp.headless_playground.title')}
        onBack={handleBack}
        backButtonProps={{ testID: HEADLESS_PLAYGROUND_BACK_BUTTON_TEST_ID }}
      />
      <ScreenLayout scrollable>
        <ScreenLayout.Body>
          <ScreenLayout.Content>
            <Row first>
              <View style={styles.accordionStack}>
                <View style={styles.accordionItem}>
                  <Accordion
                    title={`${strings(
                      'app_settings.fiat_on_ramp.headless_playground.selected_values',
                    )} (${selectedValuesCount}/4)`}
                    horizontalAlignment={
                      AccordionHeaderHorizontalAlignment.Start
                    }
                  >
                    <View style={styles.box}>
                      <ScrollView
                        contentContainerStyle={styles.boxScroll}
                        nestedScrollEnabled
                      >
                        <SelectedRow
                          label={strings(
                            'app_settings.fiat_on_ramp.headless_playground.selected_user_region',
                          )}
                          value={userRegion?.regionCode || noData}
                          styles={styles}
                        />
                        <SelectedRow
                          label={strings(
                            'app_settings.fiat_on_ramp.headless_playground.selected_provider',
                          )}
                          value={
                            selectedProvider
                              ? `${selectedProvider.name} (${selectedProvider.id})`
                              : noneSelected
                          }
                          styles={styles}
                        />
                        <SelectedRow
                          label={strings(
                            'app_settings.fiat_on_ramp.headless_playground.selected_token',
                          )}
                          value={
                            selectedToken
                              ? `${selectedToken.symbol} — ${selectedToken.assetId}`
                              : noneSelected
                          }
                          styles={styles}
                        />
                        <SelectedRow
                          label={strings(
                            'app_settings.fiat_on_ramp.headless_playground.selected_payment_method',
                          )}
                          value={
                            selectedPaymentMethod
                              ? `${selectedPaymentMethod.name} (${selectedPaymentMethod.id})`
                              : noneSelected
                          }
                          styles={styles}
                        />
                      </ScrollView>
                    </View>
                  </Accordion>
                </View>

                <View style={styles.accordionItem}>
                  <DataAccordion
                    title={strings(
                      'app_settings.fiat_on_ramp.headless_playground.providers',
                    )}
                    status={formatStatus(
                      headlessIsLoading,
                      headlessErrors.providers,
                      providers.length,
                    )}
                    isEmpty={providers.length === 0}
                    styles={styles}
                  >
                    {providers.map((provider) => {
                      const isSelected = selectedProvider?.id === provider.id;
                      return (
                        <SelectableRow
                          key={provider.id}
                          label={`${provider.name} (${provider.id})`}
                          isSelected={isSelected}
                          onPress={() =>
                            setSelectedProvider(isSelected ? null : provider)
                          }
                          testID={`headless-playground-provider-${provider.id}`}
                          styles={styles}
                        />
                      );
                    })}
                  </DataAccordion>
                </View>

                <View style={styles.accordionItem}>
                  <DataAccordion
                    title={strings(
                      'app_settings.fiat_on_ramp.headless_playground.tokens',
                    )}
                    status={formatStatus(
                      headlessIsLoading,
                      headlessErrors.tokens,
                      tokensList.length,
                    )}
                    isEmpty={tokensList.length === 0}
                    styles={styles}
                  >
                    {tokensList.map((token) => {
                      const isSelected =
                        selectedToken?.assetId === token.assetId;
                      return (
                        <SelectableRow
                          key={token.assetId}
                          label={`${token.symbol} — ${token.assetId}`}
                          isSelected={isSelected}
                          onPress={() => setSelectedToken(token.assetId)}
                          testID={`headless-playground-token-${token.assetId}`}
                          styles={styles}
                        />
                      );
                    })}
                  </DataAccordion>
                </View>

                <View style={styles.accordionItem}>
                  <DataAccordion
                    title={strings(
                      'app_settings.fiat_on_ramp.headless_playground.payment_methods',
                    )}
                    status={formatStatus(
                      headlessIsLoading,
                      headlessErrors.paymentMethods,
                      paymentMethods.length,
                    )}
                    isEmpty={paymentMethods.length === 0}
                    styles={styles}
                  >
                    {paymentMethods.map((paymentMethod) => {
                      const isSelected =
                        selectedPaymentMethod?.id === paymentMethod.id;
                      return (
                        <SelectableRow
                          key={paymentMethod.id}
                          label={`${paymentMethod.name} (${paymentMethod.id})`}
                          isSelected={isSelected}
                          onPress={() =>
                            setSelectedPaymentMethod(
                              isSelected ? null : paymentMethod,
                            )
                          }
                          testID={`headless-playground-payment-method-${paymentMethod.id}`}
                          styles={styles}
                        />
                      );
                    })}
                  </DataAccordion>
                </View>

                <View style={styles.accordionItem}>
                  <DataAccordion
                    title={strings(
                      'app_settings.fiat_on_ramp.headless_playground.countries',
                    )}
                    status={formatStatus(
                      headlessIsLoading,
                      headlessErrors.countries,
                      countries.length,
                    )}
                    isEmpty={countries.length === 0}
                    styles={styles}
                  >
                    {countries.map((country) => {
                      const regionCode = country.isoCode.toLowerCase();
                      const isSelected = userRegion?.regionCode === regionCode;
                      return (
                        <SelectableRow
                          key={country.isoCode}
                          label={`${country.flag ?? ''} ${country.name} (${country.isoCode})`.trim()}
                          isSelected={isSelected}
                          onPress={() => {
                            setUserRegion(regionCode).catch(() => undefined);
                          }}
                          testID={`headless-playground-country-${country.isoCode}`}
                          styles={styles}
                        />
                      );
                    })}
                  </DataAccordion>
                </View>
              </View>
            </Row>

            <Row>
              <View
                style={styles.divider}
                testID={HEADLESS_PLAYGROUND_SUMMARY_DIVIDER_TEST_ID}
              />
              <View
                style={styles.summarySection}
                testID={HEADLESS_PLAYGROUND_SUMMARY_TEST_ID}
              >
                <Text
                  variant={TextVariant.HeadingSm}
                  style={styles.summaryTitle}
                >
                  {strings(
                    'app_settings.fiat_on_ramp.headless_playground.summary',
                  )}
                </Text>
                <SelectedRow
                  label={strings(
                    'app_settings.fiat_on_ramp.headless_playground.summary_token',
                  )}
                  value={
                    selectedToken
                      ? `${selectedToken.symbol} — ${selectedToken.assetId}`
                      : noneSelected
                  }
                  styles={styles}
                />
                <SelectedRow
                  label={strings(
                    'app_settings.fiat_on_ramp.headless_playground.summary_provider',
                  )}
                  value={
                    selectedProvider
                      ? `${selectedProvider.name} (${selectedProvider.id})`
                      : noneSelected
                  }
                  styles={styles}
                />
              </View>
            </Row>

            {/*
              ===================================================================
              HEADLESS CONSUMER SIMULATION
              ===================================================================
              Sandbox that mirrors what a third-party feature integrating the
              `useHeadlessBuy` hook would have access to: only the public hook
              surface (`useHeadlessBuy`), local UI state (`useState`), and the
              HEADLESS_SIM_* hardcoded constants. No `useRampsController`
              setters or selected state should ever be referenced inside this
              section — keeping it self-contained is what makes the simulation
              meaningful.
              ===================================================================
            */}
            <Row last>
              <View
                style={styles.headlessSection}
                testID={HEADLESS_PLAYGROUND_HEADLESS_SECTION_TEST_ID}
              >
                <View style={styles.headlessSectionBadge}>
                  <Text
                    variant={TextVariant.BodyXs}
                    fontWeight={FontWeight.Bold}
                    color={TextColor.TextDefault}
                  >
                    {strings(
                      'app_settings.fiat_on_ramp.headless_playground.headless_section_badge',
                    )}
                  </Text>
                </View>
                <Text
                  variant={TextVariant.HeadingSm}
                  fontWeight={FontWeight.Bold}
                  style={styles.headlessSectionTitle}
                >
                  {strings(
                    'app_settings.fiat_on_ramp.headless_playground.headless_section_title',
                  )}
                </Text>
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                  style={styles.headlessSectionWarning}
                >
                  {strings(
                    'app_settings.fiat_on_ramp.headless_playground.headless_section_warning',
                  )}
                </Text>

                <View style={styles.headlessParamsBox}>
                  <SandboxParamRow
                    label={strings(
                      'app_settings.fiat_on_ramp.headless_playground.headless_section_asset_id',
                    )}
                    resolvedName={
                      headlessResolvedToken?.symbol ??
                      strings(
                        'app_settings.fiat_on_ramp.headless_playground.headless_section_unresolved',
                      )
                    }
                    rawId={effectiveAssetId}
                    isOverridden={isAssetOverridden}
                    onReset={handleResetAsset}
                    resetTestID={HEADLESS_PLAYGROUND_RESET_ASSET_TEST_ID}
                    styles={styles}
                  />
                  <SandboxParamRow
                    label={strings(
                      'app_settings.fiat_on_ramp.headless_playground.headless_section_payment_method_id',
                    )}
                    resolvedName={
                      headlessResolvedPaymentMethod?.name ??
                      strings(
                        'app_settings.fiat_on_ramp.headless_playground.headless_section_unresolved',
                      )
                    }
                    rawId={effectivePaymentMethodId}
                    isOverridden={isPaymentMethodOverridden}
                    onReset={handleResetPaymentMethod}
                    resetTestID={
                      HEADLESS_PLAYGROUND_RESET_PAYMENT_METHOD_TEST_ID
                    }
                    styles={styles}
                  />
                  <SandboxParamRow
                    label={strings(
                      'app_settings.fiat_on_ramp.headless_playground.headless_section_provider_id',
                    )}
                    resolvedName={
                      headlessResolvedProvider?.name ??
                      strings(
                        'app_settings.fiat_on_ramp.headless_playground.headless_section_unresolved',
                      )
                    }
                    rawId={effectiveProviderId}
                    isOverridden={isProviderOverridden}
                    onReset={handleResetProvider}
                    resetTestID={HEADLESS_PLAYGROUND_RESET_PROVIDER_TEST_ID}
                    styles={styles}
                    isLast
                  />
                </View>

                <View style={styles.amountSection}>
                  <Text
                    variant={TextVariant.BodySm}
                    color={TextColor.TextAlternative}
                    style={styles.amountLabel}
                  >
                    {strings(
                      'app_settings.fiat_on_ramp.headless_playground.amount_label',
                    )}
                  </Text>
                  <TextInput
                    style={styles.amountInput}
                    value={headlessAmount}
                    onChangeText={setHeadlessAmount}
                    keyboardType="numeric"
                    placeholder={strings(
                      'app_settings.fiat_on_ramp.headless_playground.amount_placeholder',
                    )}
                    testID={HEADLESS_PLAYGROUND_AMOUNT_INPUT_TEST_ID}
                  />
                </View>

                <View style={styles.actionsRow}>
                  <Button
                    variant={ButtonVariant.Primary}
                    onPress={handleHeadlessGetQuotes}
                    isDisabled={
                      !canGetQuotes || headlessQuotesStatus === 'loading'
                    }
                    testID={HEADLESS_PLAYGROUND_GET_QUOTES_BUTTON_TEST_ID}
                  >
                    {strings(
                      'app_settings.fiat_on_ramp.headless_playground.get_quotes',
                    )}
                  </Button>
                  {!canGetQuotes ? (
                    <Text
                      variant={TextVariant.BodyXs}
                      color={TextColor.TextAlternative}
                      style={styles.actionsHint}
                    >
                      {strings(
                        'app_settings.fiat_on_ramp.headless_playground.get_quotes_disabled_hint',
                      )}
                    </Text>
                  ) : null}
                </View>

                {activeSession ? (
                  <View style={styles.actionsRow}>
                    <Text
                      variant={TextVariant.BodyXs}
                      color={TextColor.TextAlternative}
                      style={styles.actionsHint}
                    >
                      {strings(
                        'app_settings.fiat_on_ramp.headless_playground.active_session_hint',
                        { sessionId: activeSession.sessionId },
                      )}
                    </Text>
                    <Pressable
                      onPress={handleCancelHeadlessSession}
                      style={styles.sandboxParamReset}
                      accessibilityRole="button"
                      testID={HEADLESS_PLAYGROUND_CANCEL_BUTTON_TEST_ID}
                    >
                      <Text
                        variant={TextVariant.BodySm}
                        color={TextColor.PrimaryDefault}
                        fontWeight={FontWeight.Medium}
                      >
                        {strings(
                          'app_settings.fiat_on_ramp.headless_playground.cancel_headless_buy',
                        )}
                      </Text>
                    </Pressable>
                  </View>
                ) : null}

                <View
                  style={styles.eventLogSection}
                  testID={HEADLESS_PLAYGROUND_EVENT_LOG_TEST_ID}
                >
                  <Text
                    variant={TextVariant.BodySm}
                    fontWeight={FontWeight.Medium}
                    style={styles.eventLogTitle}
                  >
                    {strings(
                      'app_settings.fiat_on_ramp.headless_playground.event_log_title',
                    )}
                  </Text>
                  {eventLog.length === 0 ? (
                    <Text
                      variant={TextVariant.BodyXs}
                      color={TextColor.TextAlternative}
                    >
                      {strings(
                        'app_settings.fiat_on_ramp.headless_playground.event_log_empty',
                      )}
                    </Text>
                  ) : (
                    eventLog.map((line, index) => (
                      <Text
                        key={`event-${index}`}
                        variant={TextVariant.BodyXs}
                        color={TextColor.TextAlternative}
                        style={styles.eventLogLine}
                      >
                        {line}
                      </Text>
                    ))
                  )}
                </View>

                <View
                  style={styles.section}
                  testID={HEADLESS_PLAYGROUND_QUOTES_SECTION_TEST_ID}
                >
                  <Accordion
                    title={`${strings(
                      'app_settings.fiat_on_ramp.headless_playground.quotes',
                    )} (${quotesSummary})`}
                    isExpanded
                    horizontalAlignment={
                      AccordionHeaderHorizontalAlignment.Start
                    }
                  >
                    <View style={styles.box}>
                      <ScrollView
                        contentContainerStyle={styles.boxScroll}
                        nestedScrollEnabled
                      >
                        {headlessQuotesStatus === 'idle' ? (
                          <Text
                            variant={TextVariant.BodySm}
                            color={TextColor.TextAlternative}
                          >
                            {strings(
                              'app_settings.fiat_on_ramp.headless_playground.quotes_idle',
                            )}
                          </Text>
                        ) : null}
                        {headlessQuotesStatus === 'loading' ? (
                          <Text
                            variant={TextVariant.BodySm}
                            color={TextColor.TextAlternative}
                          >
                            {strings(
                              'app_settings.fiat_on_ramp.headless_playground.loading',
                            )}
                          </Text>
                        ) : null}
                        {headlessQuotesStatus === 'error' ? (
                          <Text
                            variant={TextVariant.BodySm}
                            color={TextColor.ErrorDefault}
                          >
                            {`${strings(
                              'app_settings.fiat_on_ramp.headless_playground.error',
                            )}: ${headlessQuotesError ?? ''}`}
                          </Text>
                        ) : null}
                        {headlessQuotesStatus === 'success' ? (
                          <QuotesList
                            quotes={headlessQuotesResult}
                            paymentMethods={paymentMethods}
                            cryptoSymbol={headlessResolvedToken?.symbol}
                            fiatCurrency={fiatCurrency?.toUpperCase()}
                            canStart={canGetQuotes}
                            onStartHeadlessBuy={handleStartHeadlessBuyForQuote}
                            styles={styles}
                          />
                        ) : null}
                      </ScrollView>
                    </View>
                  </Accordion>
                </View>
              </View>
            </Row>
          </ScreenLayout.Content>
        </ScreenLayout.Body>
      </ScreenLayout>
    </SafeAreaView>
  );
}

interface QuotesListProps {
  quotes: QuotesResponse | null;
  paymentMethods: PaymentMethod[];
  cryptoSymbol?: string;
  fiatCurrency?: string;
  canStart: boolean;
  onStartHeadlessBuy: (quote: Quote) => void;
  styles: ReturnType<typeof styleSheet>;
}

function QuotesList({
  quotes,
  paymentMethods,
  cryptoSymbol,
  fiatCurrency,
  canStart,
  onStartHeadlessBuy,
  styles,
}: QuotesListProps) {
  const successList = (quotes?.success ?? []) as Quote[];
  const errorList = quotes?.error ?? [];

  if (successList.length === 0 && errorList.length === 0) {
    return (
      <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
        {strings(
          'app_settings.fiat_on_ramp.headless_playground.quotes_no_results',
        )}
      </Text>
    );
  }

  return (
    <View>
      {successList.map((entry, index) => (
        <QuoteRow
          key={`quote-${index}`}
          entry={entry}
          index={index}
          paymentMethods={paymentMethods}
          cryptoSymbol={cryptoSymbol}
          fiatCurrency={fiatCurrency}
          canStart={canStart}
          onStartHeadlessBuy={onStartHeadlessBuy}
          styles={styles}
        />
      ))}
      {errorList.length > 0 ? (
        <View style={styles.quoteErrors}>
          <Text
            variant={TextVariant.BodyXs}
            color={TextColor.TextAlternative}
            style={styles.quoteErrorsTitle}
          >
            {strings(
              'app_settings.fiat_on_ramp.headless_playground.quote_errors_title',
              { count: errorList.length },
            )}
          </Text>
          {errorList.map((entry, index) => (
            <Text
              key={`quote-error-${index}`}
              variant={TextVariant.BodyXs}
              color={TextColor.ErrorDefault}
            >
              {strings(
                'app_settings.fiat_on_ramp.headless_playground.quote_error_item',
                {
                  provider: readQuoteProvider(entry),
                  message: readQuoteErrorMessage(entry),
                },
              )}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

interface QuoteRowProps {
  entry: Quote;
  index: number;
  paymentMethods: PaymentMethod[];
  cryptoSymbol?: string;
  fiatCurrency?: string;
  canStart: boolean;
  onStartHeadlessBuy: (quote: Quote) => void;
  styles: ReturnType<typeof styleSheet>;
}

function QuoteRow({
  entry,
  index,
  paymentMethods,
  cryptoSymbol,
  fiatCurrency,
  canStart,
  onStartHeadlessBuy,
  styles,
}: QuoteRowProps) {
  const provider = readQuoteProvider(entry);
  const amountIn = readQuoteAmountIn(entry);
  const amountOut = readQuoteAmountOut(entry);
  const paymentMethodId = readQuotePaymentMethodId(entry);
  const fees = readQuoteFees(entry);
  const tags = readQuoteTags(entry);
  const reliability = readQuoteReliability(entry);

  const paymentMethodEntry = paymentMethodId
    ? paymentMethods.find(
        (paymentMethod) => paymentMethod.id === paymentMethodId,
      )
    : undefined;

  return (
    <View style={styles.quoteRow} testID={`headless-playground-quote-${index}`}>
      <View style={styles.quoteRowHeader}>
        <Text variant={TextVariant.BodySm} fontWeight={FontWeight.Medium}>
          {provider}
        </Text>
        {tags.isBestRate || tags.isMostReliable ? (
          <View style={styles.quoteBadgeRow}>
            {tags.isBestRate ? (
              <View style={[styles.quoteBadge, styles.quoteBadgeAccent]}>
                <Text
                  variant={TextVariant.BodyXs}
                  color={TextColor.PrimaryDefault}
                  fontWeight={FontWeight.Medium}
                >
                  {strings(
                    'app_settings.fiat_on_ramp.headless_playground.quote_tag_best_rate',
                  )}
                </Text>
              </View>
            ) : null}
            {tags.isMostReliable ? (
              <View style={styles.quoteBadge}>
                <Text
                  variant={TextVariant.BodyXs}
                  color={TextColor.TextAlternative}
                >
                  {strings(
                    'app_settings.fiat_on_ramp.headless_playground.quote_tag_most_reliable',
                  )}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>

      {amountIn !== undefined ? (
        <QuoteDetailLine
          label={strings(
            'app_settings.fiat_on_ramp.headless_playground.quote_you_pay',
          )}
          value={`${amountIn}${fiatCurrency ? ` ${fiatCurrency}` : ''}`}
          styles={styles}
        />
      ) : null}

      {amountOut !== undefined ? (
        <QuoteDetailLine
          label={strings(
            'app_settings.fiat_on_ramp.headless_playground.quote_you_get',
          )}
          value={`${amountOut}${cryptoSymbol ? ` ${cryptoSymbol}` : ''}`}
          styles={styles}
        />
      ) : null}

      {paymentMethodId ? (
        <QuoteDetailLine
          label={strings(
            'app_settings.fiat_on_ramp.headless_playground.quote_payment_method_label',
          )}
          value={
            paymentMethodEntry
              ? `${paymentMethodEntry.name} (${paymentMethodId})`
              : paymentMethodId
          }
          styles={styles}
        />
      ) : null}

      {fees.total !== undefined ||
      fees.network !== undefined ||
      fees.provider !== undefined ? (
        <QuoteDetailLine
          label={strings(
            'app_settings.fiat_on_ramp.headless_playground.quote_fees',
          )}
          value={formatFees(fees, fiatCurrency)}
          styles={styles}
        />
      ) : null}

      {reliability !== undefined ? (
        <QuoteDetailLine
          label={strings(
            'app_settings.fiat_on_ramp.headless_playground.quote_reliability',
          )}
          value={strings(
            'app_settings.fiat_on_ramp.headless_playground.quote_reliability_value',
            { score: reliability },
          )}
          styles={styles}
        />
      ) : null}

      <View style={styles.quoteRowAction}>
        <Button
          variant={ButtonVariant.Primary}
          isFullWidth
          isDisabled={!canStart}
          onPress={() => onStartHeadlessBuy(entry)}
          testID={`${HEADLESS_PLAYGROUND_START_BUTTON_TEST_ID}-${index}`}
        >
          {strings(
            'app_settings.fiat_on_ramp.headless_playground.start_headless_buy',
          )}
        </Button>
      </View>
    </View>
  );
}

interface QuoteDetailLineProps {
  label: string;
  value: string;
  styles: ReturnType<typeof styleSheet>;
}

function QuoteDetailLine({ label, value, styles }: QuoteDetailLineProps) {
  return (
    <View style={styles.quoteRowDetail}>
      <Text
        variant={TextVariant.BodyXs}
        color={TextColor.TextAlternative}
        style={styles.quoteRowDetailLabel}
      >
        {label}
      </Text>
      <Text variant={TextVariant.BodyXs} style={styles.quoteRowDetailValue}>
        {value}
      </Text>
    </View>
  );
}

// The QuotesResponse shape varies between providers; the playground prints
// a best-effort summary so devs can eyeball the response without us locking
// the rendering to a specific provider schema.
function readQuoteProvider(entry: unknown): string {
  if (typeof entry !== 'object' || entry === null) {
    return strings(
      'app_settings.fiat_on_ramp.headless_playground.quote_unknown_provider',
    );
  }
  const obj = entry as Record<string, unknown>;
  if (typeof obj.provider === 'string') {
    return obj.provider;
  }
  if (
    typeof obj.provider === 'object' &&
    obj.provider !== null &&
    'name' in (obj.provider as Record<string, unknown>) &&
    typeof (obj.provider as Record<string, unknown>).name === 'string'
  ) {
    return (obj.provider as Record<string, unknown>).name as string;
  }
  return strings(
    'app_settings.fiat_on_ramp.headless_playground.quote_unknown_provider',
  );
}

function readQuoteInner(entry: unknown): Record<string, unknown> | null {
  if (typeof entry !== 'object' || entry === null) {
    return null;
  }
  const obj = entry as Record<string, unknown>;
  const inner = obj.quote ?? obj;
  if (typeof inner !== 'object' || inner === null) {
    return null;
  }
  return inner as Record<string, unknown>;
}

function readNumericLike(value: unknown): number | string | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    return value;
  }
  return undefined;
}

function readQuoteAmountIn(entry: unknown): number | string | undefined {
  return readNumericLike(readQuoteInner(entry)?.amountIn);
}

function readQuoteAmountOut(entry: unknown): number | string | undefined {
  return readNumericLike(readQuoteInner(entry)?.amountOut);
}

function readQuotePaymentMethodId(entry: unknown): string | undefined {
  const inner = readQuoteInner(entry);
  if (!inner) {
    return undefined;
  }
  return typeof inner.paymentMethod === 'string'
    ? inner.paymentMethod
    : undefined;
}

interface QuoteFees {
  total?: number | string;
  network?: number | string;
  provider?: number | string;
}

function readQuoteFees(entry: unknown): QuoteFees {
  const inner = readQuoteInner(entry);
  if (!inner) {
    return {};
  }
  return {
    total: readNumericLike(inner.totalFees),
    network: readNumericLike(inner.networkFee),
    provider: readNumericLike(inner.providerFee),
  };
}

function formatFees(fees: QuoteFees, fiatCurrency?: string): string {
  const currencySuffix = fiatCurrency ? ` ${fiatCurrency}` : '';
  const headline =
    fees.total !== undefined
      ? strings(
          'app_settings.fiat_on_ramp.headless_playground.quote_fees_total',
          { total: `${fees.total}${currencySuffix}` },
        )
      : `${fees.network ?? 0}${currencySuffix}`;
  if (fees.network !== undefined || fees.provider !== undefined) {
    const breakdown = strings(
      'app_settings.fiat_on_ramp.headless_playground.quote_fees_breakdown',
      {
        network: `${fees.network ?? 0}${currencySuffix}`,
        provider: `${fees.provider ?? 0}${currencySuffix}`,
      },
    );
    return `${headline} ${breakdown}`;
  }
  return headline;
}

interface QuoteTags {
  isBestRate?: boolean;
  isMostReliable?: boolean;
}

function readQuoteTags(entry: unknown): QuoteTags {
  if (typeof entry !== 'object' || entry === null) {
    return {};
  }
  const obj = entry as Record<string, unknown>;
  const metadata = obj.metadata;
  if (typeof metadata !== 'object' || metadata === null) {
    return {};
  }
  const tags = (metadata as Record<string, unknown>).tags;
  if (typeof tags !== 'object' || tags === null) {
    return {};
  }
  const tagsObj = tags as Record<string, unknown>;
  return {
    isBestRate:
      typeof tagsObj.isBestRate === 'boolean' ? tagsObj.isBestRate : undefined,
    isMostReliable:
      typeof tagsObj.isMostReliable === 'boolean'
        ? tagsObj.isMostReliable
        : undefined,
  };
}

function readQuoteReliability(entry: unknown): number | undefined {
  if (typeof entry !== 'object' || entry === null) {
    return undefined;
  }
  const obj = entry as Record<string, unknown>;
  const metadata = obj.metadata;
  if (typeof metadata !== 'object' || metadata === null) {
    return undefined;
  }
  const reliability = (metadata as Record<string, unknown>).reliability;
  return typeof reliability === 'number' && Number.isFinite(reliability)
    ? reliability
    : undefined;
}

function readQuoteErrorMessage(entry: unknown): string {
  if (typeof entry !== 'object' || entry === null) {
    return '';
  }
  const obj = entry as Record<string, unknown>;
  if (typeof obj.message === 'string') {
    return obj.message;
  }
  if (typeof obj.error === 'string') {
    return obj.error;
  }
  return '';
}

export default HeadlessPlayground;
