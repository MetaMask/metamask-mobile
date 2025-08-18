import React from 'react';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { Box } from '../../../../../UI/Box/Box';
import Icon, {
  IconColor,
  IconName,
} from '../../../../../../component-library/components/Icons/Icon';
import {
  AlignItems,
  FlexDirection,
  JustifyContent,
} from '../../../../../UI/Box/box.types';
import { useStyles } from '../../../../../hooks/useStyles';
import styleSheet from './transaction-details-summary.styles';
import I18n from '../../../../../../../locales/i18n';
import { getIntlDateTimeFormatter } from '../../../../../../util/intl';

export function TransactionDetailsSummary() {
  const { styles } = useStyles(styleSheet, {});
  const testData = [{}, {}, {}, {}, {}];

  return (
    <Box gap={12}>
      <Text color={TextColor.Alternative}>Summary</Text>
      <Box gap={1} style={styles.lineContainer}>
        {testData.map((_item, index) => (
          <SummaryLine key={index} isLast={index === testData.length - 1} />
        ))}
      </Box>
    </Box>
  );
}

function SummaryLine({ isLast }: { isLast: boolean }) {
  const { styles } = useStyles(styleSheet, { isLast });
  const timestamp = Date.now();
  const dateString = getDateString(timestamp);

  return (
    <Box>
      <Box
        flexDirection={FlexDirection.Row}
        justifyContent={JustifyContent.spaceBetween}
        alignItems={AlignItems.center}
      >
        <Box
          flexDirection={FlexDirection.Row}
          alignItems={AlignItems.center}
          gap={12}
        >
          <Icon name={IconName.CircleX} />
          <Text variant={TextVariant.BodyMD}>Bridge from ETH to Arbitrum</Text>
        </Box>
        <Icon name={IconName.Arrow2UpRight} color={IconColor.Alternative} />
      </Box>
      <Box flexDirection={FlexDirection.Row}>
        <Box style={styles.divider} />
        <Text
          variant={TextVariant.BodySM}
          color={TextColor.Alternative}
          style={styles.secondary}
        >
          {dateString}
        </Text>
      </Box>
    </Box>
  );
}

function getDateString(timestamp: number): string {
  const date = new Date(timestamp);

  const timeString = getIntlDateTimeFormatter(I18n.locale, {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  }).format(date);

  const month = getIntlDateTimeFormatter(I18n.locale, {
    month: 'short',
  }).format(date);

  const dateString = `${month} ${date.getDate()}, ${date.getFullYear()}`;

  return `${timeString} • ${dateString}`;
}
