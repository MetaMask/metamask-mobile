import React, { type ComponentProps } from 'react';
import { useWindowDimensions } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';

import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Box } from '@metamask/design-system-react-native';

import { strings } from '../../../../locales/i18n';
import { SRPListProps } from './SRPList.types';
import SRPListItem from '../SRPListItem';
import { SRPListSelectorsIDs } from './SRPList.testIds';
import { useHdKeyringsWithSnapAccounts } from '../../hooks/useHdKeyringsWithSnapAccounts';
import { MetaMetricsEvents } from '../../../core/Analytics/MetaMetrics.events';
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import { useSyncSRPs } from '../../hooks/useSyncSRPs';

const SRPList = ({
  onKeyringSelect,
  containerStyle,
  showArrowName = '',
  scrollEnabled = true,
}: SRPListProps) => {
  useSyncSRPs();

  const { height: windowHeight } = useWindowDimensions();
  const maxHeight = windowHeight * 0.7;
  const tw = useTailwind();
  const hdKeyringsWithSnapAccounts = useHdKeyringsWithSnapAccounts();
  const { trackEvent, createEventBuilder } = useAnalytics();

  const renderItem = ({
    item,
    index,
  }: {
    item: (typeof hdKeyringsWithSnapAccounts)[number];
    index: number;
  }) => (
    <SRPListItem
      key={item.metadata.id}
      keyring={item}
      name={`${strings('accounts.secret_recovery_phrase')} ${index + 1}`}
      showArrowName={showArrowName}
      onActionComplete={() => {
        onKeyringSelect(item.metadata.id);
        trackEvent(
          createEventBuilder(
            MetaMetricsEvents.SECRET_RECOVERY_PHRASE_PICKER_CLICKED,
          )
            .addProperties({
              button_type: 'srp_select',
            })
            .build(),
        );
      }}
    />
  );

  return (
    <Box
      twClassName="py-4 px-4 bg-default m-2"
      style={
        {
          maxHeight,
          ...(containerStyle ?? {}),
        } as ComponentProps<typeof Box>['style']
      }
      testID={SRPListSelectorsIDs.SRP_LIST}
    >
      {scrollEnabled ? (
        <FlatList
          style={tw.style('flex-grow-0')}
          data={hdKeyringsWithSnapAccounts}
          contentContainerStyle={tw.style('py-1 gap-y-4')}
          renderItem={renderItem}
          scrollEnabled
          nestedScrollEnabled
        />
      ) : (
        <Box twClassName="py-1 gap-y-4">
          {hdKeyringsWithSnapAccounts.map((item, index) =>
            renderItem({ item, index }),
          )}
        </Box>
      )}
    </Box>
  );
};

export default SRPList;
