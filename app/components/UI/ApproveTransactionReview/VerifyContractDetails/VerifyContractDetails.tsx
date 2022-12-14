import React, { useEffect } from 'react';
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
import images from 'images/static-logos';

import { safeToChecksumAddress } from '../../../../util/address';

const VerifyContractDetails = ({
  contractAddress,
  closeVerifyContractView,
  copyAddress,
  toggleBlockExplorerView,
  showNickname,
  tokenAddress,
  savedContactListToArray,
  tokenSymbol,
}: VerifyContractDetailsProps) => {
  const [contractNickname, setContractNickname] = React.useState('');
  const [tokenNickname, setTokenNickname] = React.useState('');
  const { colors } = useAppThemeFromContext() || mockTheme;
  const styles = createStyles(colors);

  const learnMore = () => Linking.openURL('');

  // TODO: This is a temporary solution to get the correct image for the token
  const imageUtil = (symbol: string) => {
    switch (symbol) {
      case 'WETH':
        return 'weth.png';
      default:
        return 'nDEX.png';
    }
  };

  useEffect(() => {
    savedContactListToArray.forEach((contact: any) => {
      if (contact.address === safeToChecksumAddress(contractAddress)) {
        setContractNickname(contact.name);
      }
      if (contact.address === safeToChecksumAddress(tokenAddress)) {
        setTokenNickname(contact.name);
      }
    });
  }, [contractAddress, tokenAddress, savedContactListToArray]);

  return (
    <View style={styles.container}>
      <ConnectHeader
        action={closeVerifyContractView}
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
            type: 'Token',
          })}
        </Text>
        <View style={styles.contractSection}>
          <ContractBox
            contractAddress={tokenAddress}
            contractPetName={tokenNickname}
            onCopyAddress={() => copyAddress(tokenAddress)}
            onExportAddress={toggleBlockExplorerView}
            contractLocalImage={images[imageUtil(tokenSymbol)]}
            onContractPress={() => showNickname(tokenAddress)}
          />
        </View>
        <Text variant={TextVariants.lBodyMD} style={styles.title}>
          {strings('confirmation.token_allowance.contract_requesting_text')}
        </Text>
        <View style={styles.contractSection}>
          <ContractBox
            contractAddress={contractAddress}
            contractPetName={contractNickname}
            onCopyAddress={() => copyAddress(contractAddress)}
            onExportAddress={toggleBlockExplorerView}
            onContractPress={() => showNickname(contractAddress)}
          />
        </View>
      </View>
    </View>
  );
};
export default VerifyContractDetails;
