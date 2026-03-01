import React, { forwardRef, useCallback, useImperativeHandle } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Box } from '@metamask/design-system-react-native';
import SectionTitle from '../../components/SectionTitle';
import SectionRow from '../../components/SectionRow';
import Routes from '../../../../../constants/navigation/Routes';
import { SectionRefreshHandle } from '../../types';
import { strings } from '../../../../../../locales/i18n';

/**
 * TokensSection - Displays user's token balances on the homepage
 */
const TokensSection = forwardRef<SectionRefreshHandle>((_, ref) => {
  const navigation = useNavigation();
  const title = strings('homepage.sections.tokens');

  const refresh = useCallback(async () => {
    // TODO: Implement tokens refresh logic
  }, []);

  useImperativeHandle(ref, () => ({ refresh }), [refresh]);

  const handleViewAllTokens = useCallback(() => {
    navigation.navigate(Routes.WALLET.TOKENS_FULL_VIEW);
  }, [navigation]);

  return (
    <Box gap={3}>
      <SectionTitle title={title} onPress={handleViewAllTokens} />
      <SectionRow>
        <>{/* Token content will be added here */}</>
      </SectionRow>
    </Box>
  );
});

export default TokensSection;
