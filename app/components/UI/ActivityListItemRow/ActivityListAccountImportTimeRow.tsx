import React from 'react';
import {
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../locales/i18n';
import ListItem from '../../Base/ListItem';
import { toDateFormat } from '../../../util/date';
import { Pressable } from '../primitives/Pressable';
import { View } from '../primitives/View';

interface ActivityListAccountImportTimeRowProps {
  importTime: number;
  onPress: () => void;
}

export const ActivityListAccountImportTimeRow = ({
  importTime,
  onPress,
}: ActivityListAccountImportTimeRowProps) => (
  <View className="flex-1 bg-default">
    <Pressable
      onPress={onPress}
      className="items-center pt-2.5"
      pressedClassName="opacity-20"
      testID="activity-list-account-import-time-row"
    >
      <View className="flex-row items-center gap-1">
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Bold}
          color={TextColor.TextAlternative}
        >
          {strings('transactions.import_wallet_row')}
        </Text>
        <Icon
          name={IconName.Info}
          size={IconSize.Sm}
          color={IconColor.IconAlternative}
        />
      </View>
      <ListItem.Date>{toDateFormat(importTime)}</ListItem.Date>
    </Pressable>
  </View>
);

export default ActivityListAccountImportTimeRow;
