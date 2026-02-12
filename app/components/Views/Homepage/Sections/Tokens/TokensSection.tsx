import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
} from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Box, Text } from '@metamask/design-system-react-native';
import SectionTitle from '../../components/SectionTitle';
import SectionCard from '../../components/SectionCard';
import Routes from '../../../../../constants/navigation/Routes';
import SectionRow from '../../components/SectionRow';
import { useIsZeroBalanceAccount } from './hooks';
import { selectSortedAssetsBySelectedAccountGroup } from '../../../../../selectors/assets/assets-list';
import { TokenListItem } from '../../../../UI/Tokens/TokenList/TokenListItem/TokenListItem';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import { SectionRefreshHandle } from '../../types';

const MAX_TOKENS_DISPLAYED = 4;

// No-op functions for TokenListItem props we don't need in the homepage section
const noop = () => undefined;
const noopWithArg = () => undefined;
const shouldShowCtaFalse = () => false;

const TokensSection = forwardRef<SectionRefreshHandle>((_, ref) => {
  const refresh = useCallback(async () => {
    // TODO: Implement token refresh logic
  }, []);

  useImperativeHandle(ref, () => ({ refresh }), [refresh]);
  const navigation = useNavigation();
  const isZeroBalanceAccount = useIsZeroBalanceAccount();
  const title = isZeroBalanceAccount ? 'Popular Tokens' : 'Tokens';
  const sortedTokenKeys = useSelector(selectSortedAssetsBySelectedAccountGroup);
  const privacyMode = useSelector(selectPrivacyMode);

  const displayTokenKeys = useMemo(
    () => sortedTokenKeys.slice(0, MAX_TOKENS_DISPLAYED),
    [sortedTokenKeys],
  );

  const handleViewAllTokens = useCallback(
    () => navigation.navigate(Routes.WALLET.TOKENS_FULL_VIEW),
    [navigation],
  );

  return (
    <Box gap={3}>
      <SectionTitle title={title} onPress={handleViewAllTokens} />
      {isZeroBalanceAccount ? (
        <SectionRow>
          <SectionCard>
            <Text>card content for zero balance account :)</Text>
            <Text>card content for zero balance account :)</Text>
            <Text>card content for zero balance account :)</Text>
          </SectionCard>
        </SectionRow>
      ) : (
        <SectionRow>
          {displayTokenKeys.map((tokenKey, index) => (
            <TokenListItem
              key={`${tokenKey.chainId}-${tokenKey.address}-${tokenKey.isStaked ? 'staked' : 'unstaked'}-${index}`}
              assetKey={tokenKey}
              showRemoveMenu={noopWithArg}
              setShowScamWarningModal={noop}
              shouldShowTokenListItemCta={shouldShowCtaFalse}
              privacyMode={privacyMode}
              showPercentageChange
            />
          ))}
        </SectionRow>
      )}
    </Box>
  );
});

export default TokensSection;
