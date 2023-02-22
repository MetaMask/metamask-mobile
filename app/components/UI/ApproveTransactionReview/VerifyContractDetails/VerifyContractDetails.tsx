import React, { useEffect, useMemo, useCallback } from 'react';
import { View } from 'react-native';
import Text, {
  TextVariant,
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
import TransactionTypes from '../../../../core/TransactionTypes';
import { safeToChecksumAddress } from '../../../../util/address';

const {
  ASSET: { ERC20, ERC1155, ERC721 },
} = TransactionTypes;

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
  tokenStandard,
}: VerifyContractDetailsProps) => {
  const [contractNickname, setContractNickname] = React.useState<string>('');
  const [tokenNickname, setTokenNickname] = React.useState<string>('');
  const { colors } = useAppThemeFromContext() || mockTheme;
  const styles = createStyles(colors);

  const tokens = useSelector(
    (state: any) => state.engine.backgroundState.TokensController.tokens,
  );

  const filterTokensByTokenSymbol = useMemo(
    () => tokens.filter((token: any) => token.symbol === tokenSymbol),
    [tokens, tokenSymbol],
  );

  const tokenSymbolFirstLetter = tokenSymbol?.charAt(0);

  const tokenImage =
    filterTokensByTokenSymbol.length > 0
      ? filterTokensByTokenSymbol[0].image
      : false;

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

  const showBlockExplorerIcon = useCallback(() => {
    if (type === RPC) {
      return findBlockExplorerForRpc(rpcTarget, frequentRpcList);
    }
    return true;
  }, [type, rpcTarget, frequentRpcList]);

  const hasBlockExplorer = showBlockExplorerIcon();

  return (
    <View style={styles.container}>
      <ConnectHeader
        action={closeVerifyContractView}
        title={strings(
          'contract_allowance.token_allowance.verify_contract_details',
        )}
      />
      <Text style={styles.description}>
        <Text variant={TextVariant.BodyMD} style={styles.text}>
          {strings('contract_allowance.token_allowance.protect_from_scams')}
        </Text>
      </Text>
      <View>
        <Text variant={TextVariant.BodySM} style={styles.title}>
          {strings('contract_allowance.token_allowance.contract_type', {
            type:
              tokenStandard === ERC20
                ? strings('contract_allowance.token_allowance.token')
                : tokenStandard === ERC721 || tokenStandard === ERC1155
                ? strings('contract_allowance.token_allowance.nft')
                : '',
          })}
        </Text>
        <View style={styles.contractSection}>
          <ContractBox
            contractAddress={tokenAddress}
            contractPetName={tokenNickname}
            onCopyAddress={() => copyAddress(tokenAddress)}
            onExportAddress={() => toggleBlockExplorer(tokenAddress)}
            contractLocalImage={tokenImage && { uri: tokenImage }}
            tokenSymbol={tokenSymbolFirstLetter}
            hasBlockExplorer={Boolean(hasBlockExplorer)}
            onContractPress={() => showNickname(tokenAddress)}
          />
        </View>
        <Text variant={TextVariant.BodySM} style={styles.title}>
          {strings(
            'contract_allowance.token_allowance.contract_requesting_text',
            {
              action:
                tokenStandard === ERC20
                  ? strings('contract_allowance.token_allowance.spending_cap')
                  : tokenStandard === ERC721 || tokenStandard === ERC1155
                  ? strings('contract_allowance.token_allowance.access')
                  : '',
            },
          )}
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
