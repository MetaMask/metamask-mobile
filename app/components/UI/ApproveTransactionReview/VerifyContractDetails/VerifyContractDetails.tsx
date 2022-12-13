import React from 'react';
import { View, Linking } from 'react-native';
import Text, {
  TextVariants,
} from '../../../../component-library/components/Texts/Text';
import ButtonLink from '../../../../component-library/components/Buttons/Button/variants/ButtonLink';
import { strings } from '../../../../../locales/i18n';
import { useAppThemeFromContext, mockTheme } from '../../../../util/theme';
import ConnectHeader from '../../ConnectHeader';
import ContractBox from '../../../../component-library/components-temp/Contracts/ContractBox';
import createStyles from './VerifyContractDetails.styles';
import { VerifyContractDetailsProps } from './VerifyContractDetails.types';
import { CONTRACT_LOCAL_IMAGE } from '../../../../component-library/components-temp/Contracts/ContractBox/ContractBox.constants';

const VerifyContractDetails = ({
  toggleVerifyContractView,
  contractAddress,
  copyAddress,
  toggleBlockExplorerView,
  toggleNicknameView,
  contractName,
}: VerifyContractDetailsProps) => {
  const { colors } = useAppThemeFromContext() || mockTheme;
  const styles = createStyles(colors);

  const learnMore = () => Linking.openURL('');

  return (
    <View style={styles.container}>
      <ConnectHeader
        action={toggleVerifyContractView}
        title={strings('confirmation.token_allowance.verify_contract_details')}
      />
      <Text style={styles.description}>
        <Text variant={TextVariants.sBodyMD}>
          {strings('confirmation.token_allowance.protect_from_scams')}
        </Text>{' '}
        <ButtonLink onPress={learnMore}>
          {strings('confirmation.token_allowance.learn_to_verify')}
        </ButtonLink>
      </Text>
      <View>
        <Text variant={TextVariants.lBodyMD} style={styles.title}>
          {strings('confirmation.token_allowance.contract_type', {
            type: 'NFT',
          })}
        </Text>
        <View style={styles.contractSection}>
          <ContractBox
            contractAddress={contractAddress}
            contractPetName={contractName}
            onCopyAddress={copyAddress}
            onExportAddress={toggleBlockExplorerView}
            contractLocalImage={0}
            onContractPress={toggleNicknameView}
          />
        </View>
        <Text variant={TextVariants.lBodyMD} style={styles.title}>
          {strings('confirmation.token_allowance.contract_requesting_text')}
        </Text>
        <View style={styles.contractSection}>
          <ContractBox
            contractAddress={contractAddress}
            contractPetName={contractName}
            onCopyAddress={copyAddress}
            onExportAddress={toggleBlockExplorerView}
            contractLocalImage={CONTRACT_LOCAL_IMAGE}
            onContractPress={toggleNicknameView}
          />
        </View>
      </View>
    </View>
  );
};
export default VerifyContractDetails;
