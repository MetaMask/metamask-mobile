import React, { forwardRef, useCallback, useImperativeHandle } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Box } from '@metamask/design-system-react-native';
import SectionTitle from '../../components/SectionTitle';
import SectionRow from '../../components/SectionRow';
import Routes from '../../../../../constants/navigation/Routes';
import { SectionRefreshHandle } from '../../types';
import { strings } from '../../../../../../locales/i18n';

/**
 * NFTsSection - Displays user's NFTs on the homepage
 */
const NFTsSection = forwardRef<SectionRefreshHandle>((_, ref) => {
  const navigation = useNavigation();
  const title = strings('homepage.sections.nfts');

  const refresh = useCallback(async () => {
    // TODO: Implement NFTs refresh logic
  }, []);

  useImperativeHandle(ref, () => ({ refresh }), [refresh]);

  const handleViewAllNfts = useCallback(() => {
    navigation.navigate(Routes.WALLET.NFTS_FULL_VIEW);
  }, [navigation]);

  return (
    <Box gap={3}>
      <SectionTitle title={title} onPress={handleViewAllNfts} />
      <SectionRow>
        <>{/* NFTs content will be added here */}</>
      </SectionRow>
    </Box>
  );
});

export default NFTsSection;
