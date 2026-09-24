import {
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React from 'react';

import { useStyles } from '../../../../component-library/hooks';
import { useTheme } from '../../../../util/theme';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): shared CL24 harness, not an Onboarding screen
import CL24Benchmark from '../../Onboarding/CL24Benchmark';
import styleSheet from './DeveloperOptions.styles';

const CL24BenchmarkDeveloperOptionsSection = () => {
  const theme = useTheme();
  const { styles } = useStyles(styleSheet, { theme });

  return (
    <Box>
      <Text
        color={TextColor.TextDefault}
        variant={TextVariant.HeadingLg}
        style={styles.heading}
      >
        CL24 DKM
      </Text>
      <Text
        color={TextColor.TextAlternative}
        variant={TextVariant.BodyMd}
        style={styles.desc}
      >
        Single-party compute on this device. The UI will hitch while samples
        run.
      </Text>
      <Box twClassName="mt-4">
        <CL24Benchmark />
      </Box>
    </Box>
  );
};

export default CL24BenchmarkDeveloperOptionsSection;
