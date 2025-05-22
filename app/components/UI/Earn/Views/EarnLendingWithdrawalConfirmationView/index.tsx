import React, { useCallback, useContext, useEffect, useState } from 'react';
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
import { toHex } from '@metamask/controller-utils';
import ConfirmationFooter from '../EarnLendingDepositConfirmationView/components/ConfirmationFooter';
import { generateLendingWithdrawalTransaction } from '../../utils/tempLending';
import useLendingTokenPair from '../../hooks/useLendingTokenPair';
import Routes from '../../../../../constants/navigation/Routes';
import Toast, {
  ToastContext,
  ToastVariants,
} from '../../../../../component-library/components/Toast';
import { IconName } from '../../../../../component-library/components/Icons/Icon';

interface EarnWithdrawalConfirmationViewRouteParams {
  token: TokenI;
  amountTokenMinimalUnit: string;
  amountFiat: string;
  lendingProtocol: string;
  lendingContractAddress: string;
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
  } = params;

  const [isConfirmButtonDisabled, setIsConfirmButtonDisabled] = useState(false);

  // Get lending and receipt token using either lending or receipt token to find pair.
  const { lendingToken } = useLendingTokenPair(token);

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

      const { txParams, txOptions } = generateLendingWithdrawalTransaction(
        lendingToken.address,
        amountTokenMinimalUnit.toString(),
        activeAccount.address,
        lendingToken.chainId,
      );

      const txRes = await Engine.context.TransactionController.addTransaction(
        txParams,
        txOptions,
      );

      const transactionId = txRes.transactionMeta.id;

      // Transaction Event Listeners
      Engine.controllerMessenger.subscribeOnceIf(
        'TransactionController:transactionRejected',
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
                }}
                value={{
                  label: (
                    <View style={styles.healthFactorRight}>
                      <Text
                        variant={TextVariant.BodyMDMedium}
                        color={theme.colors.success.default}
                      >
                        13.7
                      </Text>
                      <Text>→</Text>
                      <Text
                        variant={TextVariant.BodyMDMedium}
                        color={theme.colors.success.default}
                      >
                        7.0
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
                      <Text>Low</Text>
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
