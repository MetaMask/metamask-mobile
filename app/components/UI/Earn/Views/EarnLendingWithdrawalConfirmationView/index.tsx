import { ORIGIN_METAMASK, toHex } from '@metamask/controller-utils';
import {
  TransactionType,
  WalletDevice,
} from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { useNavigation } from '@react-navigation/native';
import { ethers } from 'ethers';
import { capitalize } from 'lodash';
import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../locales/i18n';
import KeyValueRow, {
  TooltipSizes,
} from '../../../../../component-library/components-temp/KeyValueRow';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar';
import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import Routes from '../../../../../constants/navigation/Routes';
import { IMetaMetricsEvent } from '../../../../../core/Analytics';
import Engine from '../../../../../core/Engine';
import { RootState } from '../../../../../reducers';
import { selectSelectedInternalAccountByScope } from '../../../../../selectors/multichainAccounts/accounts';
import { getNetworkImageSource } from '../../../../../util/networks';
import { renderFromTokenMinimalUnit } from '../../../../../util/number';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { useStyles } from '../../../../hooks/useStyles';
import InfoRowDivider from '../../../../Views/confirmations/components/UI/info-row-divider';
import InfoSection from '../../../../Views/confirmations/components/UI/info-row/info-section';
import { getStakingNavbar } from '../../../Navbar';
import AccountTag from '../../../Stake/components/StakingConfirmation/AccountTag/AccountTag';
import ContractTag from '../../../Stake/components/StakingConfirmation/ContractTag/ContractTag';
import { EVENT_LOCATIONS, EVENT_PROVIDERS } from '../../constants/events';
import { EARN_EXPERIENCES } from '../../constants/experiences';
import useEarnToken from '../../hooks/useEarnToken';
import ConfirmationFooter from '../EarnLendingDepositConfirmationView/components/ConfirmationFooter';
import Erc20TokenHero from '../EarnLendingDepositConfirmationView/components/Erc20TokenHero';
import styleSheet from './EarnLendingWithdrawalConfirmationView.styles';
import { endTrace, trace, TraceName } from '../../../../../util/trace';
import useEndTraceOnMount from '../../../../hooks/useEndTraceOnMount';
import { EVM_SCOPE } from '../../constants/networks';
import type { RootParamList } from '../../../../../util/navigation';
import type { StackScreenProps } from '@react-navigation/stack';

export type EarnLendingWithdrawalConfirmationViewProps = StackScreenProps<
  RootParamList,
  'EarnLendingWithdrawalConfirmation'
>;

const EarnLendingWithdrawalConfirmationView = ({
  route,
}: EarnLendingWithdrawalConfirmationViewProps) => {
  const { styles, theme } = useStyles(styleSheet, {});
  const { trackEvent, createEventBuilder } = useMetrics();

  const navigation = useNavigation();

  const {
    token,
    amountTokenMinimalUnit,
    amountFiat,
    lendingContractAddress,
    lendingProtocol,
    // healthFactorSimulation,
  } = route.params;

  const [isConfirmButtonDisabled, setIsConfirmButtonDisabled] = useState(false);

  const { earnTokenPair, getTokenSnapshot, tokenSnapshot } =
    useEarnToken(token);

  const earnToken = earnTokenPair?.earnToken;
  const outputToken = earnTokenPair?.outputToken;

  const selectedAccount = useSelector(selectSelectedInternalAccountByScope)(
    EVM_SCOPE,
  );
  const useBlockieIcon = useSelector(
    (state: RootState) => state.settings.useBlockieIcon,
  );

  useEndTraceOnMount(TraceName.EarnWithdrawReviewScreen);

  useEffect(() => {
    navigation.setOptions(
      getStakingNavbar(
        strings('earn.withdraw'),
        navigation,
        theme.colors,
        {
          hasCancelButton: false,
          backgroundColor: theme.colors.background.alternative,
        },
        {
          backButtonEvent: {
            event:
              MetaMetricsEvents.EARN_LENDING_WITHDRAW_CONFIRMATION_BACK_CLICKED,
            properties: {
              selected_provider: EVENT_PROVIDERS.CONSENSYS,
              location: EVENT_LOCATIONS.EARN_LENDING_WITHDRAW_CONFIRMATION_VIEW,
              experience: EARN_EXPERIENCES.STABLECOIN_LENDING,
              user_token_balance: outputToken?.balanceFormatted as string,
              transaction_value: `${renderFromTokenMinimalUnit(
                amountTokenMinimalUnit,
                outputToken?.decimals as number,
              )} ${outputToken?.symbol}`,
              token: token.symbol,
            },
          },
        },
      ),
    );
  }, [
    amountTokenMinimalUnit,
    navigation,
    outputToken?.balanceFormatted,
    outputToken?.balanceMinimalUnit,
    outputToken?.decimals,
    outputToken?.experience.type,
    outputToken?.symbol,
    theme.colors,
    token.symbol,
  ]);

  // const riskTextColor = useMemo(() => {
  //   const riskLabel = healthFactorSimulation?.risk;

  //   switch (riskLabel) {
  //     case AAVE_WITHDRAWAL_RISKS.VERY_HIGH:
  //     case AAVE_WITHDRAWAL_RISKS.HIGH:
  //       return TextColor.Error;
  //     case AAVE_WITHDRAWAL_RISKS.MEDIUM:
  //       return TextColor.Warning;
  //     case AAVE_WITHDRAWAL_RISKS.LOW:
  //       return TextColor.Success;
  //     case AAVE_WITHDRAWAL_RISKS.UNKNOWN:
  //     default:
  //       return TextColor.Default;
  //   }
  // }, [healthFactorSimulation.risk]);

  // const getHealthFactorValueColor = (value: string) => {
  //   const parsedValue = parseFloat(value);

  //   if (isNaN(parsedValue)) return TextColor.Default;

  //   if (parsedValue >= 2.0) return TextColor.Success;
  //   else if (parsedValue >= 1.5) return TextColor.Warning;
  //   else if (parsedValue >= 1.25) return TextColor.Error;
  // };

  // const getHealthFactorLabel = (healthFactor: string) => {
  //   if (healthFactor === AAVE_V3_INFINITE_HEALTH_FACTOR) {
  //     return '∞';
  //   }

  //   return parseFloat(healthFactor).toFixed(2);
  // };

  useEffect(() => {
    if (!earnToken) {
      getTokenSnapshot(
        outputToken?.chainId as Hex,
        outputToken?.experience.market?.underlying?.address as Hex,
      );
    }
  }, [outputToken, getTokenSnapshot, earnToken]);

  // Needed to get token's network name
  const networkConfig =
    Engine.context.NetworkController.getNetworkConfigurationByChainId(
      toHex(token?.chainId as string),
    );

  const getTrackEventProperties = useCallback(
    (actionType: string, transactionId?: string, transactionType?: string) => {
      const properties: {
        action_type: string;
        token: string | undefined;
        network: string | undefined;
        user_token_balance: string | undefined;
        transaction_value: string;
        experience: EARN_EXPERIENCES;
        transaction_id?: string;
        transaction_type?: string;
      } = {
        action_type: actionType,
        token: earnToken?.symbol,
        network: networkConfig?.name,
        user_token_balance: outputToken?.balanceFormatted,
        transaction_value: `${renderFromTokenMinimalUnit(
          amountTokenMinimalUnit,
          outputToken?.decimals as number,
        )} ${outputToken?.symbol}`,
        experience: EARN_EXPERIENCES.STABLECOIN_LENDING,
      };

      if (transactionId) {
        properties.transaction_id = transactionId;
      }

      if (transactionType) {
        properties.transaction_type = transactionType;
      }

      return properties;
    },
    [
      earnToken?.symbol,
      networkConfig?.name,
      outputToken?.balanceFormatted,
      outputToken?.decimals,
      outputToken?.symbol,
      amountTokenMinimalUnit,
    ],
  );

  useEffect(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.EARN_CONFIRMATION_PAGE_VIEWED)
        .addProperties(getTrackEventProperties('withdrawal'))
        .build(),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emitTxMetaMetric = useCallback(
    (txType: TransactionType) =>
      (transactionId: string) =>
      (event: IMetaMetricsEvent) => {
        trackEvent(
          createEventBuilder(event)
            .addProperties(
              getTrackEventProperties('withdrawal', transactionId, txType),
            )
            .build(),
        );
      },
    [createEventBuilder, getTrackEventProperties, trackEvent],
  );

  const createTransactionEventListeners = useCallback(
    (transactionId: string) => {
      if (!transactionId) return;

      const emitWithdrawalTxMetaMetric = emitTxMetaMetric(
        TransactionType.lendingWithdraw,
      )(transactionId);

      emitWithdrawalTxMetaMetric(MetaMetricsEvents.EARN_TRANSACTION_INITIATED);
      // generic confirmation bottom sheet shows after transaction has been added
      endTrace({ name: TraceName.EarnWithdrawConfirmationScreen });

      // Transaction Event Listeners
      Engine.controllerMessenger.subscribeOnceIf(
        'TransactionController:transactionDropped',
        () => {
          setIsConfirmButtonDisabled(false);
          emitWithdrawalTxMetaMetric(
            MetaMetricsEvents.EARN_TRANSACTION_DROPPED,
          );
        },
        ({ transactionMeta }) => transactionMeta.id === transactionId,
      );

      Engine.controllerMessenger.subscribeOnceIf(
        'TransactionController:transactionRejected',
        () => {
          setIsConfirmButtonDisabled(false);
          emitWithdrawalTxMetaMetric(
            MetaMetricsEvents.EARN_TRANSACTION_REJECTED,
          );
        },
        ({ transactionMeta }) => transactionMeta.id === transactionId,
      );

      Engine.controllerMessenger.subscribeOnceIf(
        'TransactionController:transactionFailed',
        () => {
          setIsConfirmButtonDisabled(false);
          emitWithdrawalTxMetaMetric(MetaMetricsEvents.EARN_TRANSACTION_FAILED);
        },
        ({ transactionMeta }) => transactionMeta.id === transactionId,
      );

      Engine.controllerMessenger.subscribeOnceIf(
        'TransactionController:transactionSubmitted',
        () => {
          emitWithdrawalTxMetaMetric(
            MetaMetricsEvents.EARN_TRANSACTION_SUBMITTED,
          );
          // start trace of time between tx submitted and tx confirmed
          trace({
            name: TraceName.EarnLendingWithdrawTxConfirmed,
            data: {
              chainId: outputToken?.chainId || '',
              experience: EARN_EXPERIENCES.STABLECOIN_LENDING,
            },
          });
          // There is variance in when navigation can be called across chains
          setTimeout(() => {
            navigation.navigate(Routes.TRANSACTIONS_VIEW);
          }, 0);
        },
        ({ transactionMeta }) => transactionMeta.id === transactionId,
      );

      Engine.controllerMessenger.subscribeOnceIf(
        'TransactionController:transactionConfirmed',
        () => {
          emitWithdrawalTxMetaMetric(
            MetaMetricsEvents.EARN_TRANSACTION_CONFIRMED,
          );
          endTrace({ name: TraceName.EarnLendingWithdrawTxConfirmed });
        },
        (transactionMeta) => transactionMeta.id === transactionId,
      );
      Engine.controllerMessenger.subscribeOnceIf(
        'TransactionController:transactionConfirmed',
        () => {
          if (!earnToken) {
            try {
              const tokenNetworkClientId =
                Engine.context.NetworkController.findNetworkClientIdByChainId(
                  tokenSnapshot?.chainId as Hex,
                );
              Engine.context.TokensController.addToken({
                decimals: tokenSnapshot?.token?.decimals || 0,
                symbol: tokenSnapshot?.token?.symbol || '',
                address: tokenSnapshot?.token?.address || '',
                name: tokenSnapshot?.token?.name || '',
                networkClientId: tokenNetworkClientId,
              }).catch(console.error);
            } catch (error) {
              console.error(
                error,
                `error adding counter-token for ${
                  outputToken?.symbol || outputToken?.ticker || ''
                } on confirmation`,
              );
            }
          }
        },
        (transactionMeta) => transactionMeta.id === transactionId,
      );
    },
    [emitTxMetaMetric, tokenSnapshot, earnToken, outputToken, navigation],
  );

  // Guards
  if (
    !token?.chainId ||
    !amountTokenMinimalUnit ||
    !amountFiat ||
    !lendingContractAddress ||
    !lendingProtocol ||
    !selectedAccount?.address
  )
    return null;

  const networkClientId =
    Engine.context.NetworkController.findNetworkClientIdByChainId(
      toHex(outputToken?.chainId as Hex),
    );

  const handleCancel = () => {
    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.EARN_WITHDRAWAL_REVIEW_CANCEL_CLICKED,
      )
        .addProperties(getTrackEventProperties('withdrawal'))
        .build(),
    );

    navigation.goBack();
  };

  const handleConfirm = async () => {
    if (
      !amountTokenMinimalUnit ||
      !outputToken?.address ||
      !outputToken?.chainId ||
      !outputToken?.experience?.market?.underlying.address ||
      !outputToken?.experience?.market?.protocol
    )
      return;

    try {
      setIsConfirmButtonDisabled(true);

      trackEvent(
        createEventBuilder(MetaMetricsEvents.EARN_ACTION_SUBMITTED)
          .addProperties(getTrackEventProperties('withdrawal'))
          .build(),
      );

      // start trace between user intiating withdrawal and generic confirmation bottom sheet showing
      trace({
        name: TraceName.EarnWithdrawConfirmationScreen,
        data: {
          chainId: outputToken.chainId,
          experience: EARN_EXPERIENCES.STABLECOIN_LENDING,
        },
      });

      // if sending max amount, send max uint256 (aave specific)
      // TODO: STAKE-1044 move this logic to earn controller and sdk.
      let amountTokenMinimalUnitToSend: string;
      if (amountTokenMinimalUnit === outputToken.balanceMinimalUnit) {
        amountTokenMinimalUnitToSend = ethers.constants.MaxUint256.toString();
      } else {
        amountTokenMinimalUnitToSend = amountTokenMinimalUnit;
      }

      const txRes = await Engine.context.EarnController.executeLendingWithdraw({
        amount: amountTokenMinimalUnitToSend,
        chainId: outputToken.chainId,
        protocol: outputToken.experience?.market?.protocol,
        underlyingTokenAddress:
          outputToken.experience?.market?.underlying?.address,
        gasOptions: {
          gasLimit: 'none', // pass gas handling to Transactions Controller
        },
        txOptions: {
          deviceConfirmedOn: WalletDevice.MM_MOBILE,
          networkClientId,
          origin: ORIGIN_METAMASK,
          type: TransactionType.lendingWithdraw,
        },
      });

      const transactionId = txRes?.transactionMeta?.id;

      createTransactionEventListeners(transactionId);
    } catch (e) {
      setIsConfirmButtonDisabled(false);
    }
  };

  return (
    <View style={styles.pageContainer}>
      <View style={styles.contentContainer}>
        <Erc20TokenHero
          token={token}
          amountTokenMinimalUnit={amountTokenMinimalUnit}
          fiatValue={amountFiat}
        />
        <View style={styles.infoSections}>
          {/* Withdrawal time */}
          <InfoSection>
            <View style={styles.infoSectionContainer}>
              <KeyValueRow
                field={{
                  label: {
                    text: strings('earn.withdrawal_time'),
                    variant: TextVariant.BodyMDMedium,
                  },
                  tooltip: {
                    title: strings('earn.withdrawal_time'),
                    content: strings('earn.tooltip_content.withdrawal_time'),
                    size: TooltipSizes.Sm,
                  },
                }}
                value={{
                  label: {
                    text: strings('earn.immediate'),
                    variant: TextVariant.BodyMD,
                  },
                }}
              />
            </View>
          </InfoSection>
          <InfoSection>
            <View style={styles.infoSectionContainer}>
              <KeyValueRow
                field={{
                  label: {
                    text: strings('earn.withdrawing_to'),
                    variant: TextVariant.BodyMDMedium,
                  },
                }}
                value={{
                  label: (
                    <AccountTag
                      accountAddress={selectedAccount?.address}
                      accountName={selectedAccount.metadata.name}
                      useBlockieIcon={useBlockieIcon}
                    />
                  ),
                }}
              />
              <KeyValueRow
                field={{
                  label: {
                    text: strings('earn.protocol'),
                    variant: TextVariant.BodyMDMedium,
                  },
                  tooltip: {
                    title: strings('earn.protocol'),
                    content: strings('earn.tooltip_content.protocol'),
                    size: TooltipSizes.Sm,
                  },
                }}
                value={{
                  label: (
                    <ContractTag
                      contractAddress={lendingContractAddress}
                      contractName={capitalize(lendingProtocol)}
                      useBlockieIcon={useBlockieIcon}
                    />
                  ),
                }}
              />
            </View>
            <InfoRowDivider />
            <View style={styles.infoSectionContainer}>
              <KeyValueRow
                field={{
                  label: {
                    text: strings('earn.network'),
                    variant: TextVariant.BodyMDMedium,
                  },
                }}
                value={{
                  label: (
                    <View style={styles.networkRowRight}>
                      <Badge
                        variant={BadgeVariant.Network}
                        size={AvatarSize.Xs}
                        isScaled={false}
                        imageSource={getNetworkImageSource({
                          chainId: token?.chainId,
                        })}
                      />
                      <Text>{networkConfig?.name}</Text>
                    </View>
                  ),
                }}
              />
            </View>
          </InfoSection>
          {/* TODO: https://consensyssoftware.atlassian.net/browse/STAKE-1044 Add back in v1.1 */}
          {/* {healthFactorSimulation.before !== AAVE_V3_INFINITE_HEALTH_FACTOR && (
            <InfoSectionAccordion header={strings('stake.advanced_details')}>
              <View style={styles.advancedDetailsContainer}>
                <KeyValueRow
                  field={{
                    label: {
                      text: strings('earn.health_factor'),
                      variant: TextVariant.BodyMDMedium,
                    },
                    tooltip: {
                      title: strings('earn.health_factor'),
                      content: (
                        <View style={styles.healthFactorTooltipContainer}>
                          <Text>
                            {strings(
                              'earn.tooltip_content.health_factor.your_health_factor_measures_liquidation_risk',
                            )}
                          </Text>
                          <View style={styles.healthFactorTooltipContent}>
                            <View style={styles.healthFactorTooltipRow}>
                              <Text variant={TextVariant.BodyMDMedium}>
                                •{' '}
                                {strings(
                                  'earn.tooltip_content.health_factor.above_two_dot_zero',
                                )}
                              </Text>
                              <Text>
                                {strings(
                                  'earn.tooltip_content.health_factor.safe_position',
                                )}
                              </Text>
                            </View>
                            <View style={styles.healthFactorTooltipRow}>
                              <Text variant={TextVariant.BodyMDMedium}>
                                •{' '}
                                {strings(
                                  'earn.tooltip_content.health_factor.between_one_dot_five_and_2_dot_zero',
                                )}
                              </Text>
                              <Text>
                                {strings(
                                  'earn.tooltip_content.health_factor.medium_liquidation_risk',
                                )}
                              </Text>
                            </View>
                            <View style={styles.healthFactorTooltipRow}>
                              <Text variant={TextVariant.BodyMDMedium}>
                                •{' '}
                                {strings(
                                  'earn.tooltip_content.health_factor.below_one_dot_five',
                                )}
                              </Text>
                              <Text>
                                {strings(
                                  'earn.tooltip_content.health_factor.higher_liquidation_risk',
                                )}
                              </Text>
                            </View>
                          </View>
                        </View>
                      ),
                      size: TooltipSizes.Sm,
                    },
                  }}
                  value={{
                    label: (
                      <View style={styles.healthFactorRight}>
                        <Text
                          variant={TextVariant.BodyMDMedium}
                          color={getHealthFactorValueColor(
                            healthFactorSimulation.before,
                          )}
                        >
                          {getHealthFactorLabel(healthFactorSimulation.before)}
                        </Text>
                        <Text>→</Text>
                        <Text
                          variant={TextVariant.BodyMDMedium}
                          color={getHealthFactorValueColor(
                            healthFactorSimulation.after,
                          )}
                        >
                          {getHealthFactorLabel(healthFactorSimulation.after)}
                        </Text>
                      </View>
                    ),
                  }}
                />
                <KeyValueRow
                  field={{
                    label: {
                      text: strings('earn.liquidation_risk'),
                      variant: TextVariant.BodyMDMedium,
                    },
                  }}
                  value={{
                    label: (
                      <View>
                        <Text color={riskTextColor}>
                          {capitalize(healthFactorSimulation.risk)}
                        </Text>
                      </View>
                    ),
                  }}
                />
              </View>
            </InfoSectionAccordion>
          )} */}
        </View>
      </View>
      <ConfirmationFooter
        onCancel={handleCancel}
        onConfirm={handleConfirm}
        buttonPrimary={{
          disabled: isConfirmButtonDisabled,
        }}
      />
    </View>
  );
};

export default EarnLendingWithdrawalConfirmationView;
