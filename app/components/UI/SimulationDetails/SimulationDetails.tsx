/* eslint-disable react/prop-types */
import {
  SimulationError,
  SimulationErrorCode,
  TransactionMeta,
} from '@metamask/transaction-controller';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';

import { strings } from '../../../../locales/i18n';
import Icon, {
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';
import Text, {
  TextColor,
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { useStyles } from '../../hooks/useStyles';
import { TooltipModal } from '../../Views/confirmations/components/UI/tooltip';
import AnimatedSpinner, { SpinnerSize } from '../AnimatedSpinner';
import BalanceChangeList from './BalanceChangeList/BalanceChangeList';
import styleSheet from './SimulationDetails.styles';
import useBalanceChanges from './useBalanceChanges';
import { useSimulationMetrics } from './useSimulationMetrics';

export interface SimulationDetailsProps {
  transaction: TransactionMeta;
  enableMetrics: boolean;
  isTransactionsRedesign?: boolean;
}

/**
 * Content when simulation has failed.
 *
 * @param error - The error object.
 * @param error.code - The error code.
 * @returns The error content.
 */
const ErrorContent: React.FC<{ error: SimulationError, isTransactionsRedesign: boolean }> = ({ error, isTransactionsRedesign }) => {
  const { styles } = useStyles(styleSheet, { isTransactionsRedesign });

  function getMessage() {
    return error.code === SimulationErrorCode.Reverted
      ? strings('simulation_details.reverted')
      : strings('simulation_details.failed');
  }

  return (
    <View style={styles.errorContentContainer}>
      <Icon
        name={IconName.Warning}
        color={TextColor.Warning}
        style={styles.errorIcon}
      />
      <Text color={TextColor.Warning} variant={TextVariant.BodyMD}>
        {getMessage()}
      </Text>
    </View>
  );
};

/**
 * Content when there are no balance changes.
 */
const EmptyContent: React.FC = () => (
  <Text color={TextColor.Alternative} variant={TextVariant.BodyMD}>
    {strings('simulation_details.no_balance_changes')}
  </Text>
);

/**
 * Header at the top of the simulation preview.
 *
 * @param children - The children to render in the header.
 * @returns The header layout.
 */
const HeaderLayout: React.FC<{ isTransactionsRedesign: boolean }> = ({ children, isTransactionsRedesign }) => {
  const {
    styles,
    theme: { colors },
  } = useStyles(styleSheet, { isTransactionsRedesign });
  const [isModalVisible, setIsModalVisible] = useState(false);

  return (
    <View style={styles.headerContainer}>
      <View style={styles.innerHeaderContainer}>
        <Text variant={TextVariant.BodyMDMedium}>
          {strings('simulation_details.title')}
        </Text>
        <Pressable onPress={() => setIsModalVisible(true)}>
          <Icon
            size={IconSize.Sm}
            name={IconName.Info}
            color={colors.icon.muted}
          />
        </Pressable>
        {isModalVisible ? (
          <TooltipModal
            open={isModalVisible}
            setOpen={setIsModalVisible}
            content={strings('simulation_details.tooltip_description')}
            title={strings('simulation_details.title')}
          />
        ) : null}
      </View>
      {children}
    </View>
  );
};

/**
 * Top-level layout for the simulation preview.
 *
 * @param inHeader - The children to render in the header.
 * @param children - The children to render in the layout.
 */
const SimulationDetailsLayout: React.FC<{
  inHeader?: React.ReactNode;
  isTransactionsRedesign: boolean;
}> = ({ inHeader, children, isTransactionsRedesign }) => {
  const { styles } = useStyles(styleSheet, { isTransactionsRedesign });
  return (
    <View style={styles.container}>
      <HeaderLayout isTransactionsRedesign={isTransactionsRedesign}>{inHeader}</HeaderLayout>
      {children}
    </View>
  );
};

/**
 * Preview of a transaction's effects using simulation data.
 *
 * @param simulationData - The simulation data.
 * @returns The simulation details.
 */
export const SimulationDetails: React.FC<SimulationDetailsProps> = ({
  transaction,
  enableMetrics = false,
  isTransactionsRedesign = false,
}: SimulationDetailsProps) => {
  const { styles } = useStyles(styleSheet, { isTransactionsRedesign });
  const { chainId, id: transactionId, simulationData } = transaction;
  const balanceChangesResult = useBalanceChanges({ chainId, simulationData });
  const loading = !simulationData || balanceChangesResult.pending;

  useSimulationMetrics({
    enableMetrics,
    balanceChanges: balanceChangesResult.value,
    loading,
    simulationData,
    transactionId,
  });

  if (loading) {
    return (
      <SimulationDetailsLayout
        inHeader={
          <AnimatedSpinner
            testID="simulation-details-spinner"
            size={SpinnerSize.SM}
          />
        }
        isTransactionsRedesign={isTransactionsRedesign}
      />
    );
  }

  const { error } = simulationData;

  if (
    [
      SimulationErrorCode.ChainNotSupported,
      SimulationErrorCode.Disabled,
    ].includes(error?.code as SimulationErrorCode)
  ) {
    return null;
  }

  if (error) {
    return (
      <SimulationDetailsLayout isTransactionsRedesign={isTransactionsRedesign}>
        <ErrorContent error={error} isTransactionsRedesign={isTransactionsRedesign} />
      </SimulationDetailsLayout>
    );
  }

  const balanceChanges = balanceChangesResult.value;
  const empty = balanceChanges.length === 0;
  if (empty) {
    return (
      <SimulationDetailsLayout isTransactionsRedesign={isTransactionsRedesign}>
        <EmptyContent />
      </SimulationDetailsLayout>
    );
  }

  const outgoing = balanceChanges.filter((bc) => bc.amount.isNegative());
  const incoming = balanceChanges.filter((bc) => !bc.amount.isNegative());

  return (
    <SimulationDetailsLayout isTransactionsRedesign={isTransactionsRedesign}>
      <View style={styles.changeListContainer}>
        <BalanceChangeList
          testID="simulation-details-balance-change-list-outgoing"
          heading={strings('simulation_details.outgoing_heading')}
          balanceChanges={outgoing}
        />
        <BalanceChangeList
          testID="simulation-details-balance-change-list-incoming"
          heading={strings('simulation_details.incoming_heading')}
          balanceChanges={incoming}
        />
      </View>
    </SimulationDetailsLayout>
  );
};

export default SimulationDetails;
