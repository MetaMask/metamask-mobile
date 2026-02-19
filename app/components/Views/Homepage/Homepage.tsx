import React, { forwardRef, useCallback, useImperativeHandle } from 'react';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import { SectionRefreshHandle } from './types';

/**
 * Homepage component - Main view for the redesigned wallet homepage.
 *
 * This component will contain various sections like Tokens, NFTs, DeFi, etc.
 * Currently a placeholder while sections are being incrementally adopted.
 */
const Homepage = forwardRef<SectionRefreshHandle>((_, ref) => {
  const refresh = useCallback(async () => {
    // TODO: Implement refresh logic as sections are added
  }, []);

  useImperativeHandle(ref, () => ({ refresh }), [refresh]);

  return (
    <Box gap={6} marginBottom={8} testID="homepage-container">
      <Text variant={TextVariant.BodyMd}>Homepage sections coming soon...</Text>
    </Box>
  );
});

export default Homepage;
