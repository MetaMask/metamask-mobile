import React, { useEffect } from 'react';
import { View } from 'react-native';
import Text, {
  TextVariants,
} from '../../../../component-library/components/Texts/Text';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../locales/i18n';
import { useAppThemeFromContext, mockTheme } from '../../../../util/theme';
import ConnectHeader from '../../ConnectHeader';
import ContractBox from '../../../../component-library/components-temp/Contracts/ContractBox';
import createStyles from './VerifyContractDetails.styles';
import { VerifyContractDetailsProps } from './VerifyContractDetails.types';
import { findBlockExplorerForRpc } from '../../../../util/networks';
import { RPC } from '../../../../constants/network';

import { safeToChecksumAddress } from '../../../../util/address';

const VerifyContractDetails = ({
  contractAddress,
  closeVerifyContractView,
  copyAddress,
  toggleBlockExplorer,
  showNickname,
  tokenAddress,
  savedContactListToArray,
  tokenSymbol,
  networkProvider: { rpcTarget, type },
  frequentRpcList,
}: VerifyContractDetailsProps) => {
  const [contractNickname, setContractNickname] = React.useState('');
  const [tokenNickname, setTokenNickname] = React.useState('');
  const { colors } = useAppThemeFromContext() || mockTheme;
  const styles = createStyles(colors);

  const tokens = useSelector(
    (state: any) => state.engine.backgroundState.TokensController.tokens,
  );

  const filterTokensByTokenSymbol = tokens.filter(
    (token: any) => token.symbol === tokenSymbol,
  );

  // TODO: handle when tokenSymbol is not found
  // our tokenController only returns tokens for mainnet
  const tokenImage =
    filterTokensByTokenSymbol.length > 0
      ? filterTokensByTokenSymbol[0].image
      : null;

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

  const hasBlockExplorer =
    type === RPC && findBlockExplorerForRpc(rpcTarget, frequentRpcList);

  return (
    <View style={styles.container}>
      <ConnectHeader
        action={closeVerifyContractView}
        title={strings('confirmation.token_allowance.verify_contract_details')}
      />
      <Text style={styles.description}>
        <Text variant={TextVariants.sBodyMD} style={styles.text}>
          {strings('confirmation.token_allowance.protect_from_scams')}
        </Text>{' '}
      </Text>
      <View>
        <Text variant={TextVariants.lBodySM} style={styles.title}>
          {strings('confirmation.token_allowance.contract_type', {
            type: 'Token',
          })}
        </Text>
        <View style={styles.contractSection}>
          <ContractBox
            contractAddress={tokenAddress}
            contractPetName={tokenNickname}
            onCopyAddress={() => copyAddress(tokenAddress)}
            onExportAddress={() => toggleBlockExplorer(tokenAddress)}
            contractLocalImage={{ uri: tokenImage }}
            hasBlockExplorer={Boolean(hasBlockExplorer)}
            onContractPress={() => showNickname(tokenAddress)}
          />
        </View>
        <Text variant={TextVariants.lBodySM} style={styles.title}>
          {strings('confirmation.token_allowance.contract_requesting_text')}
        </Text>
        <View style={styles.contractSection}>
          <ContractBox
            contractAddress={contractAddress}
            contractPetName={contractNickname}
            onCopyAddress={() => copyAddress(contractAddress)}
            onExportAddress={() => toggleBlockExplorer(contractAddress)}
            onContractPress={() => showNickname(contractAddress)}
            hasBlockExplorer={Boolean(hasBlockExplorer)}
          />
        </View>
      </View>
    </View>
  );
};
export default VerifyContractDetails;
