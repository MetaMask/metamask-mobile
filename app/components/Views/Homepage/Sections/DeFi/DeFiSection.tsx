import React, { forwardRef, useCallback, useImperativeHandle } from 'react';
import { useSelector } from 'react-redux';
import { Box } from '@metamask/design-system-react-native';
import SectionTitle from '../../components/SectionTitle';
import SectionRow from '../../components/SectionRow';
import { SectionRefreshHandle } from '../../types';
import { selectAssetsDefiPositionsEnabled } from '../../../../../selectors/featureFlagController/assetsDefiPositions';
import { strings } from '../../../../../../locales/i18n';

/**
 * DeFiSection - Displays DeFi positions on the homepage
 *
 * Only renders when the DeFi positions feature flag is enabled.
 */
const DeFiSection = forwardRef<SectionRefreshHandle>((_, ref) => {
  const isDeFiEnabled = useSelector(selectAssetsDefiPositionsEnabled);
  const title = strings('homepage.sections.defi');

  const refresh = useCallback(async () => {
    // TODO: Implement DeFi refresh logic
  }, []);

  useImperativeHandle(ref, () => ({ refresh }), [refresh]);

  // Don't render if DeFi is disabled
  if (!isDeFiEnabled) {
    return null;
  }

  return (
    <Box gap={3}>
      <SectionTitle title={title} />
      <SectionRow>
        <>{/* DeFi content will be added here */}</>
      </SectionRow>
    </Box>
  );
});

export default DeFiSection;
