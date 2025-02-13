import React from 'react';
import Row from '../../components/Row';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';

import { useInstalledProviderApps } from '../../hooks/useInstalledProviderApps';

export default function InstalledApps() {
  const [isLoading, installedApps] = useInstalledProviderApps();
  return (
    <>
      <Text variant={TextVariant.BodyLGMedium}>Installed Apps</Text>
      <Row>
        {isLoading ? (
          <Text>Loading...</Text>
        ) : (
          Object.entries(installedApps).map(([scheme, isInstalled]) => (
            <Text key={scheme}>
              {scheme}:// — {isInstalled ? 'Installed' : 'Not Installed'}
            </Text>
          ))
        )}
      </Row>
    </>
  );
}
