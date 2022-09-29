import React, { useEffect } from 'react';
import Text, { TextVariant } from '../../../components/Texts/Text';
import { ContractBaseProps } from './ContractBase.types';
import { View } from 'react-native';
import { formatAddress } from '../../../../util/address';
import { doENSReverseLookup } from '../../../../util/ENSUtils';
import Icon, { IconName, IconSize } from '../../../components/Icon';
import styles from './ContractBoxBase.styles'

const ContractBoxBase = ({ address, name, icon, type }: ContractBaseProps) => {
  const formattedAddress = formatAddress(address, 'short');

  // not working. Not sure
  useEffect(() => {
    async function getEnsName() {
        const ens = await doENSReverseLookup(address);
    }
    getEnsName()
  }, [])

  return (
    <View
      style={styles.container}
    >
      <Text variant={TextVariant.lBodyMD}>{formattedAddress}</Text>
      <View style={styles.iconContainer}>
        <Icon name={IconName.CopyFilled} size={IconSize.Md} />
        <Icon name={IconName.ExportOutline} size={IconSize.Md} />
      </View>
    </View>
  );
};

export default ContractBoxBase;
