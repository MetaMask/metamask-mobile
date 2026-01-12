import React from 'react';
import { useWindowDimensions, View } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import { strings } from '../../../../locales/i18n';
import { SRPListProps } from './SRPList.types';
import { useStyles } from '../../hooks/useStyles';
import styleSheet from './SRPList.styles';
import SRPListItem from '../SRPListItem';
import { SRPListSelectorsIDs } from '../../../../e2e/selectors/MultiSRP/SRPList.selectors';
import { useHdKeyringsWithSnapAccounts } from '../../hooks/useHdKeyringsWithSnapAccounts';
import { MetaMetricsEvents } from '../../../core/Analytics/MetaMetrics.events';
import useMetrics from '../../hooks/useMetrics/useMetrics';
import { useSyncSRPs } from '../../hooks/useSyncSRPs';

const SRPList = ({
  onKeyringSelect,
  containerStyle,
  showArrowName = '',
}: SRPListProps) => {
  // trigger sync SRP when SRP list is shown
  useSyncSRPs();

  const { height: windowHeight } = useWindowDimensions();
  const maxHeight = windowHeight * 0.7;
  const { styles } = useStyles(styleSheet, { maxHeight });
  const hdKeyringsWithSnapAccounts = useHdKeyringsWithSnapAccounts();
  const { trackEvent, createEventBuilder } = useMetrics();

  return (
    <View
      style={[styles.base, containerStyle]}
      testID={SRPListSelectorsIDs.SRP_LIST}
    >
      <FlatList
        style={styles.flatList}
        data={hdKeyringsWithSnapAccounts}
        contentContainerStyle={styles.srpListContentContainer}
        renderItem={({ item, index }) => (
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
        )}
        scrollEnabled
        nestedScrollEnabled
      />
    </View>
  );
};

export default SRPList;
