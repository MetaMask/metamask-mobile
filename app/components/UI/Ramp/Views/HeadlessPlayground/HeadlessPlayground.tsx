import React, { useCallback, useEffect, useRef } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';

import ScreenLayout from '../../Aggregator/components/ScreenLayout';
import Row from '../../Aggregator/components/Row';
import HeaderCompactStandard from '../../../../../component-library/components-temp/HeaderCompactStandard';
import Accordion from '../../../../../component-library/components/Accordions/Accordion/Accordion';
import { AccordionHeaderHorizontalAlignment } from '../../../../../component-library/components/Accordions/Accordion';

import { strings } from '../../../../../../locales/i18n';

import { useStyles } from '../../../../hooks/useStyles';

import useRampsController from '../../hooks/useRampsController';

import styleSheet from './HeadlessPlayground.styles';

export const HEADLESS_PLAYGROUND_HEADER_TEST_ID = 'headless-playground-header';
export const HEADLESS_PLAYGROUND_BACK_BUTTON_TEST_ID =
  'headless-playground-back-button';
export const HEADLESS_PLAYGROUND_SUMMARY_TEST_ID =
  'headless-playground-summary';
export const HEADLESS_PLAYGROUND_SUMMARY_DIVIDER_TEST_ID =
  'headless-playground-summary-divider';

export enum HeadlessPlaygroundAccordionIndex {
  Selected = 0,
  Providers = 1,
  Tokens = 2,
  PaymentMethods = 3,
}

export const HEADLESS_PLAYGROUND_DEFAULT_TOKEN_ASSET_ID =
  'eip155:59144/erc20:0xaca92e438df0b2401ff60da7e4337b687a2435da';
export const HEADLESS_PLAYGROUND_DEFAULT_PROVIDER_ID_SUFFIX = 'transak-native';

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

function HeadlessPlayground() {
  const navigation = useNavigation();
  const { styles } = useStyles(styleSheet, {});

  const {
    userRegion,
    selectedProvider,
    setSelectedProvider,
    providers,
    providersLoading,
    providersError,
    selectedToken,
    setSelectedToken,
    tokens,
    tokensLoading,
    tokensError,
    selectedPaymentMethod,
    paymentMethods,
    paymentMethodsLoading,
    paymentMethodsError,
  } = useRampsController();

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
    if (tokensLoading) {
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
  }, [tokens, tokensLoading, selectedToken, setSelectedToken]);

  useEffect(() => {
    if (hasAttemptedProviderDefault.current) {
      return;
    }
    if (providersLoading) {
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
  }, [providers, providersLoading, selectedProvider, setSelectedProvider]);

  const formatStatus = (
    isLoading: boolean,
    error: string | null,
    count: number,
  ) => {
    if (isLoading) {
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
              <View style={styles.section}>
                <Accordion
                  title={`${strings(
                    'app_settings.fiat_on_ramp.headless_playground.selected_values',
                  )} (${selectedValuesCount}/4)`}
                  isExpanded
                  horizontalAlignment={AccordionHeaderHorizontalAlignment.Start}
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
            </Row>

            <Row>
              <DataAccordion
                title={strings(
                  'app_settings.fiat_on_ramp.headless_playground.providers',
                )}
                status={formatStatus(
                  providersLoading,
                  providersError,
                  providers?.length ?? 0,
                )}
                isEmpty={!providers || providers.length === 0}
                styles={styles}
              >
                {providers?.map((provider) => {
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
            </Row>

            <Row>
              <DataAccordion
                title={strings(
                  'app_settings.fiat_on_ramp.headless_playground.tokens',
                )}
                status={formatStatus(
                  tokensLoading,
                  tokensError,
                  tokensList.length,
                )}
                isEmpty={tokensList.length === 0}
                styles={styles}
              >
                {tokensList.map((token) => {
                  const isSelected = selectedToken?.assetId === token.assetId;
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
            </Row>

            <Row>
              <DataAccordion
                title={strings(
                  'app_settings.fiat_on_ramp.headless_playground.payment_methods',
                )}
                status={formatStatus(
                  paymentMethodsLoading,
                  paymentMethodsError,
                  paymentMethods?.length ?? 0,
                )}
                isEmpty={!paymentMethods || paymentMethods.length === 0}
                styles={styles}
              >
                {paymentMethods?.map((paymentMethod) => (
                  <Text
                    key={paymentMethod.id}
                    variant={TextVariant.BodySm}
                    style={styles.item}
                  >
                    {`• ${paymentMethod.name} (${paymentMethod.id})`}
                  </Text>
                ))}
              </DataAccordion>
            </Row>

            <Row last>
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
          </ScreenLayout.Content>
        </ScreenLayout.Body>
      </ScreenLayout>
    </SafeAreaView>
  );
}

export default HeadlessPlayground;
