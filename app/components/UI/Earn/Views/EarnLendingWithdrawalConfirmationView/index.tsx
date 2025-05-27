import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { View } from 'react-native';
import { getStakingNavbar } from '../../../Navbar';
import { strings } from '../../../../../../locales/i18n';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import styleSheet from './EarnLendingWithdrawalConfirmationView.styles';
import { useStyles } from '../../../../hooks/useStyles';
import Erc20TokenHero from '../EarnLendingDepositConfirmationView/components/Erc20TokenHero';
import { TokenI } from '../../../Tokens/types';
import InfoSection from '../../../../Views/confirmations/components/UI/info-row/info-section';
import InfoSectionAccordion from '../../../../Views/confirmations/components/UI/info-section-accordion';
import KeyValueRow, {
  TooltipSizes,
} from '../../../../../component-library/components-temp/KeyValueRow';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import InfoRowDivider from '../../../../Views/confirmations/components/UI/info-row-divider';
import AccountTag from '../../../Stake/components/StakingConfirmation/AccountTag/AccountTag';
import { selectSelectedInternalAccount } from '../../../../../selectors/accountsController';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../../reducers';
import ContractTag from '../../../Stake/components/StakingConfirmation/ContractTag/ContractTag';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar';
import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import { getNetworkImageSource } from '../../../../../util/networks';
import Engine from '../../../../../core/Engine';
import { ORIGIN_METAMASK, toHex } from '@metamask/controller-utils';
import ConfirmationFooter from '../EarnLendingDepositConfirmationView/components/ConfirmationFooter';
import {
  AAVE_V3_INFINITE_HEALTH_FACTOR,
  AAVE_WITHDRAWAL_RISKS,
  SimulatedAaveV3HealthFactorAfterWithdrawal,
} from '../../utils/tempLending';
import Routes from '../../../../../constants/navigation/Routes';
import Toast, {
  ToastContext,
  ToastVariants,
} from '../../../../../component-library/components/Toast';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import { capitalize } from 'lodash';
import useEarnTokens from '../../hooks/useEarnTokens';
import { EarnTokenDetails } from '../../types/lending.types';
import {
  TransactionType,
  WalletDevice,
} from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';

interface EarnWithdrawalConfirmationViewRouteParams {
  token: TokenI | EarnTokenDetails;
  amountTokenMinimalUnit: string;
  amountFiat: string;
  lendingProtocol: string;
  lendingContractAddress: string;
  healthFactorSimulation: SimulatedAaveV3HealthFactorAfterWithdrawal;
}

export interface EarnWithdrawalConfirmationViewProps {
  route: RouteProp<
    { params: EarnWithdrawalConfirmationViewRouteParams },
    'params'
  >;
}

const EarnLendingWithdrawalConfirmationView = () => {
  const { styles, theme } = useStyles(styleSheet, {});

  const navigation = useNavigation();

  const { params } = useRoute<EarnWithdrawalConfirmationViewProps['route']>();

  const {
    token,
    amountTokenMinimalUnit,
    amountFiat,
    lendingContractAddress,
    lendingProtocol,
    healthFactorSimulation,
  } = params;

  const [isConfirmButtonDisabled, setIsConfirmButtonDisabled] = useState(false);

  // Get lending and receipt token using either lending or receipt token to find pair.
  const { getPairedEarnTokens } = useEarnTokens();
  const { earnToken: lendingToken } = getPairedEarnTokens(token);

  const activeAccount = useSelector(selectSelectedInternalAccount);
  const useBlockieIcon = useSelector(
    (state: RootState) => state.settings.useBlockieIcon,
  );

  const { toastRef } = useContext(ToastContext);

  const showTransactionSubmissionToast = useCallback(() => {
    toastRef?.current?.showToast({
      variant: ToastVariants.Icon,
      iconName: IconName.Check,
      iconColor: theme.colors.success.default,
      backgroundColor: theme.colors.background.default,
      labelOptions: [
        {
          label: `${strings('earn.transaction_submitted')}`,
          isBold: false,
        },
      ],
      hasNoTimeout: false,
    });
  }, [theme.colors.background.default, theme.colors.success.default, toastRef]);

  useEffect(() => {
    navigation.setOptions(
      getStakingNavbar(strings('earn.withdraw'), navigation, theme.colors, {
        hasCancelButton: false,
        backgroundColor: theme.colors.background.alternative,
      }),
    );
  }, [navigation, theme.colors]);

  const riskTextColor = useMemo(() => {
    const riskLabel = healthFactorSimulation?.risk;

    switch (riskLabel) {
      case AAVE_WITHDRAWAL_RISKS.VERY_HIGH:
      case AAVE_WITHDRAWAL_RISKS.HIGH:
        return TextColor.Error;
      case AAVE_WITHDRAWAL_RISKS.MEDIUM:
        return TextColor.Warning;
      case AAVE_WITHDRAWAL_RISKS.LOW:
        return TextColor.Success;
      case AAVE_WITHDRAWAL_RISKS.UNKNOWN:
      default:
        return TextColor.Default;
    }
  }, [healthFactorSimulation.risk]);

  const getHealthFactorValueColor = (value: string) => {
    const parsedValue = parseFloat(value);

    if (isNaN(parsedValue)) return TextColor.Default;

    if (parsedValue >= 2.0) return TextColor.Success;
    else if (parsedValue >= 1.5) return TextColor.Warning;
    else if (parsedValue >= 1.25) return TextColor.Error;
  };

  const getHealthFactorLabel = (healthFactor: string) => {
    if (healthFactor === AAVE_V3_INFINITE_HEALTH_FACTOR) {
      return '∞';
    }

    return parseFloat(healthFactor).toFixed(2);
  };

  // Guards
  if (
    !token?.chainId ||
    !amountTokenMinimalUnit ||
    !amountFiat ||
    !lendingContractAddress ||
    !lendingProtocol ||
    !activeAccount?.address
  )
    return null;

  // Needed to get token's network name
  const networkConfig =
    Engine.context.NetworkController.getNetworkConfigurationByChainId(
      toHex(token.chainId),
    );

  const networkClientId =
    Engine.context.NetworkController.findNetworkClientIdByChainId(
      toHex(lendingToken?.chainId as Hex),
    );

  const handleCancel = () => {
    navigation.goBack();
  };

  const handleConfirm = async () => {
    if (
      !lendingToken?.address ||
      !amountTokenMinimalUnit ||
      !lendingToken?.chainId
    )
      return;

    try {
      setIsConfirmButtonDisabled(true);

      const txRes = await Engine.context.EarnController.executeLendingWithdraw({
        amount: amountTokenMinimalUnit.toString(),
        protocol: lendingToken.experience?.market?.protocol,
        underlyingTokenAddress:
          lendingToken.experience?.market?.underlying?.address,
        gasOptions: {},
        txOptions: {
          deviceConfirmedOn: WalletDevice.MM_MOBILE,
          networkClientId,
          origin: ORIGIN_METAMASK,
          type: 'lendingWithdraw' as TransactionType,
        },
      });

      const transactionId = txRes.transactionMeta.id;

      // Transaction Event Listeners
      Engine.controllerMessenger.subscribeOnceIf(
        'TransactionController:transactionDropped',
        () => {
          setIsConfirmButtonDisabled(false);
        },
        ({ transactionMeta }) => transactionMeta.id === transactionId,
      );
      Engine.controllerMessenger.subscribeOnceIf(
        'TransactionController:transactionRejected',
        () => {
          setIsConfirmButtonDisabled(false);
        },
        ({ transactionMeta }) => transactionMeta.id === transactionId,
      );

      Engine.controllerMessenger.subscribeOnceIf(
        'TransactionController:transactionFailed',
        () => {
          setIsConfirmButtonDisabled(false);
        },
        ({ transactionMeta }) => transactionMeta.id === transactionId,
      );
      Engine.controllerMessenger.subscribeOnceIf(
        'TransactionController:transactionSubmitted',
        () => {
          showTransactionSubmissionToast();
          navigation.navigate(Routes.TRANSACTIONS_VIEW);
        },
        ({ transactionMeta }) => transactionMeta.id === transactionId,
      );
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
                      accountAddress={activeAccount?.address}
                      accountName={activeAccount.metadata.name}
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
                      contractName={lendingProtocol}
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
                          <View style={styles.healthFactorTooltipRow}>
                            <Text variant={TextVariant.BodyMDMedium}>
                              {`• ${strings(
                                'earn.tooltip_content.health_factor.infinite',
                              )} (∞)`}
                            </Text>
                            <Text>
                              {strings(
                                'earn.tooltip_content.health_factor.no_debt_maximum_security',
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
        </View>
      </View>
      <ConfirmationFooter
        onCancel={handleCancel}
        onConfirm={handleConfirm}
        buttonPrimary={{
          disabled: isConfirmButtonDisabled,
        }}
      />
      <Toast ref={toastRef} />
    </View>
  );
};

export default EarnLendingWithdrawalConfirmationView;
