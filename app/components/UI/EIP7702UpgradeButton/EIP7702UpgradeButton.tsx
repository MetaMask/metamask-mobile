import React, { useCallback, useState } from 'react';
import { Alert, TouchableOpacity, View } from 'react-native';
import { Hex } from '@metamask/utils';
import {
  TransactionEnvelopeType,
  TransactionType,
} from '@metamask/transaction-controller';
import { useSelector } from 'react-redux';
import { useStyles } from '../../../component-library/hooks';
import styleSheet from './EIP7702UpgradeButton.styles';
import { selectSelectedInternalAccountFormattedAddress } from '../../../selectors/accountsController';
import Engine from '../../../core/Engine';
import { addMMOriginatedTransaction } from '../../Views/confirmations/utils/transaction';
import CustomText from '../../../component-library/components/Texts/Text';

const SEPOLIA_CHAIN_ID = '0xaa36a7';
const UPGRADE_CONTRACT_ADDRESS: Hex =
  '0x4Cd241E8d1510e30b2076397afc7508Ae59C66c9';
const DOWNGRADE_CONTRACT_ADDRESS: Hex =
  '0x0000000000000000000000000000000000000000';

const EIP7702UpgradeButton: React.FC = () => {
  const { styles } = useStyles(styleSheet, {});
  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isDowngrading, setIsDowngrading] = useState(false);

  const submitSetCode = useCallback(
    async (authorizationAddress: Hex) => {
      if (!selectedAddress) {
        return;
      }

      const { NetworkController } = Engine.context;
      const networkClientId =
        NetworkController.findNetworkClientIdByChainId(SEPOLIA_CHAIN_ID);

      if (!networkClientId) {
        Alert.alert(
          'Error',
          'Sepolia network not found. Please add Sepolia network first.',
        );
        return;
      }

      await addMMOriginatedTransaction(
        {
          authorizationList: [
            {
              address: authorizationAddress,
            },
          ],
          from: selectedAddress as Hex,
          to: selectedAddress as Hex,
          type: TransactionEnvelopeType.setCode,
        },
        {
          networkClientId,
          type: TransactionType.batch,
        },
      );
    },
    [selectedAddress],
  );

  const handleUpgrade = useCallback(async () => {
    if (!selectedAddress || isUpgrading) {
      return;
    }

    setIsUpgrading(true);
    try {
      await submitSetCode(UPGRADE_CONTRACT_ADDRESS);
    } catch (error) {
      Alert.alert(
        'Upgrade Failed',
        error instanceof Error ? error.message : 'Unknown error occurred',
      );
    } finally {
      setIsUpgrading(false);
    }
  }, [selectedAddress, isUpgrading, submitSetCode]);

  const handleDowngrade = useCallback(async () => {
    if (!selectedAddress || isDowngrading) {
      return;
    }

    setIsDowngrading(true);
    try {
      await submitSetCode(DOWNGRADE_CONTRACT_ADDRESS);
    } catch (error) {
      Alert.alert(
        'Downgrade Failed',
        error instanceof Error ? error.message : 'Unknown error occurred',
      );
    } finally {
      setIsDowngrading(false);
    }
  }, [selectedAddress, isDowngrading, submitSetCode]);

  if (!selectedAddress) {
    return null;
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, styles.upgradeButton]}
        onPress={handleUpgrade}
        disabled={isUpgrading || isDowngrading}
        activeOpacity={0.7}
      >
        <CustomText style={styles.buttonText}>
          {isUpgrading ? 'Upgrading...' : '7702 Upgrade'}
        </CustomText>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, styles.downgradeButton]}
        onPress={handleDowngrade}
        disabled={isUpgrading || isDowngrading}
        activeOpacity={0.7}
      >
        <CustomText style={styles.buttonText}>
          {isDowngrading ? 'Downgrading...' : '7702 Downgrade'}
        </CustomText>
      </TouchableOpacity>
    </View>
  );
};

export default EIP7702UpgradeButton;
