import React from 'react';
import { View } from 'react-native';
import { strings } from '../../../../../../../locales/i18n';
import { useStyles } from '../../../../../../component-library/hooks';
import InfoSectionAccordion from '../../UI/InfoSectionAccordion';
import ContractInteractionDetails, { ContractInteractionDetailsVariant } from '../ContractInteractionDetails/ContractInteractionDetails';
import styleSheet from './AdvancedDetails.styles';

const AdvancedDetails = () => {
  const { styles } = useStyles(styleSheet, {});

  return (
    <View style={styles.container}>
      <InfoSectionAccordion header={strings('stake.advanced_details')}>
        <ContractInteractionDetails variant={ContractInteractionDetailsVariant.StakingDeposit} />
      </InfoSectionAccordion>
    </View>
  );
};



export default AdvancedDetails;
