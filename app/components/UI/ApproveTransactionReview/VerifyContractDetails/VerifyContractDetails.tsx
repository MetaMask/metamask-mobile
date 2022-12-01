import React from 'react';
import { View, SafeAreaView } from 'react-native';
import Text, {TextVariants} from '../../../../component-library/components/Texts/Text';
import { strings } from '../../../../../locales/i18n';
import { useAppThemeFromContext, mockTheme  } from '../../../../util/theme';
import ConnectHeader from '../../ConnectHeader';
import ContractBox from '../../../../component-library/components-temp/Contracts/ContractBox';
import createStyles from './VerifyContractDetails.styles'
import {VerifyContractDetailsProps} from './VerifyContractDetails.types'
import ShowBlockExplorer from '../ShowBlockExplorer';


const VerifyContractDetails = ({ toggleViewDetails, address, copyContractAddress, providerType }: VerifyContractDetailsProps) => {
  const { colors } = useAppThemeFromContext() || mockTheme;
  const [isBlockExplorerVisible, setIsBlockExplorerVisible] = React.useState(false);
  const styles = createStyles(colors);

  const toggleBlockExplorer = () => {
    setIsBlockExplorerVisible(!isBlockExplorerVisible);
  };

    return (
      <View style={styles.section}>
        {isBlockExplorerVisible ? (
    <ShowBlockExplorer
    setIsBlockExplorerVisible={setIsBlockExplorerVisible}
    type={providerType}
    contractAddress={address}
    headerWrapperStyle={styles.headerWrapper}
    headerTextStyle={styles.headerText}
    iconStyle={styles.icon}
  />
        ) : (
          <>
          <ConnectHeader
            action={toggleViewDetails}
            title={strings('confirmation.token_allowance.verify_contract_details')}
          />
          <View style={styles.details}>
            <Text variant={TextVariants.sBodyMD}>{strings("confirmation.token_allowance.protect_from_scams")} {strings("confirmation.token_allowance.learn_to_verify")}</Text>
            <Text>Token Contract</Text>
            <ContractBox contractAddress="" contractPetName="" onCopyAddress={copyContractAddress} onExportAddress={toggleBlockExplorer} contractLocalImage={0} />
  
            <Text>Contract requesting spending cap</Text>
            <ContractBox contractAddress={address} contractPetName="" onCopyAddress={copyContractAddress} onExportAddress={toggleBlockExplorer} contractLocalImage={0} />
            </View>
            </>
        )}
      </View>
    );
  }
  export default VerifyContractDetails;
