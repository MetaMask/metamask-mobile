/* eslint-disable react/prop-types */
import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import {
  SimulationData,
  SimulationErrorCode,
  SimulationError,
} from '@metamask/transaction-controller';

import { strings } from '../../../../locales/i18n';
import Text, {
  TextVariant,
  TextColor,
} from '../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';
import InfoModal from '../../../components/UI/Swaps/components/InfoModal';
import { useStyles } from '../../hooks/useStyles';
import AnimatedSpinner, { SpinnerSize } from '../AnimatedSpinner';
import useBalanceChanges from './useBalanceChanges';
import BalanceChangeList from './BalanceChangeList/BalanceChangeList';
import styleSheet from './SimulationDetails.styles';
import { useSimulationMetrics } from './useSimulationMetrics';

export interface SimulationDetailsProps {
  simulationData?: SimulationData;
  transactionId: string;
  enableMetrics: boolean;
}

/**
 * Content when simulation has failed.
 *
 * @param error - The error object.
 * @param error.code - The error code.
 * @returns The error content.
 */
const ErrorContent: React.FC<{ error: SimulationError }> = ({ error }) => {
  const { styles } = useStyles(styleSheet, {});

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
const HeaderLayout: React.FC = ({ children }) => {
  const {
    styles,
    theme: { colors },
  } = useStyles(styleSheet, {});
  const [isModalVisible, setIsModalVisible] = useState(false);

  const toggleModal = () => {
    setIsModalVisible(!isModalVisible);
  };

  return (
    <View style={styles.headerContainer}>
      <View style={styles.innerHeaderContainer}>
        <Text variant={TextVariant.BodyMDMedium}>
          {strings('simulation_details.title')}
        </Text>
        <Pressable onPress={toggleModal}>
          <Icon
            size={IconSize.Sm}
            name={IconName.Info}
            color={colors.icon.muted}
          />
        </Pressable>
        {isModalVisible ? (
          <InfoModal
            isVisible={isModalVisible}
            title={strings('simulation_details.title')}
            body={
              <Text>{strings('simulation_details.tooltip_description')}</Text>
            }
            toggleModal={toggleModal}
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
}> = ({ inHeader, children }) => {
  const { styles } = useStyles(styleSheet, {});
  return (
    <View style={styles.container}>
      <HeaderLayout>{inHeader}</HeaderLayout>
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
  simulationData,
  enableMetrics = false,
  transactionId,
}: SimulationDetailsProps) => {
  const { styles } = useStyles(styleSheet, {});
  const balanceChangesResult = useBalanceChanges(simulationData);
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
      <SimulationDetailsLayout>
        <ErrorContent error={error} />
      </SimulationDetailsLayout>
    );
  }

  const balanceChanges = balanceChangesResult.value;
  const empty = balanceChanges.length === 0;
  if (empty) {
    return (
      <SimulationDetailsLayout>
        <EmptyContent />
      </SimulationDetailsLayout>
    );
  }

  const outgoing = balanceChanges.filter((bc) => bc.amount.isNegative());
  const incoming = balanceChanges.filter((bc) => !bc.amount.isNegative());

  return (
    <SimulationDetailsLayout>
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
