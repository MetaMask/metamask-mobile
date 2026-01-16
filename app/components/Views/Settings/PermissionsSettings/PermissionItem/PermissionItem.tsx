import React from 'react';
import { View } from 'react-native';
import TouchableOpacity from '../../../../Base/TouchableOpacity';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../hooks/useStyles';

import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import styleSheet from './PermissionItem.style';
import { PermissionListItemViewModel } from './PermissionItem.types';
import WebsiteIcon from '../../../../../components/UI/WebsiteIcon';
import { strings } from '../../../../../../locales/i18n';
import { useFavicon } from '../../../../hooks/useFavicon';

interface PermissionListItemProps {
  item: PermissionListItemViewModel;
  onPress?: () => void;
}

const PermissionItem: React.FC<PermissionListItemProps> = ({
  item,
  onPress,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const faviconUrl = useFavicon(item.dappHostName);
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.iconContainer}>
        <WebsiteIcon style={styles.icon} icon={faviconUrl} />
      </View>
      <View style={styles.contentContainer}>
        <View style={styles.row}>
          <Text variant={TextVariant.BodyLGMedium}>{item.dappHostName}</Text>
        </View>
        <View style={styles.row}>
          <Text color={TextColor.Alternative} variant={TextVariant.BodyMD}>
            {item.numberOfAccountPermissions}{' '}
            {item.numberOfAccountPermissions > 1
              ? strings('app_settings.accounts')
              : strings('app_settings.account')}
          </Text>
          <Text style={styles.dot}> • </Text>
          <Text color={TextColor.Alternative} variant={TextVariant.BodyMD}>
            {item.numberOfNetworkPermissions}{' '}
            {item.numberOfNetworkPermissions > 1
              ? strings('app_settings.networks')
              : strings('app_settings.network')}
          </Text>
        </View>
      </View>
      <View style={styles.chevronContainer}>
        <Icon size={IconSize.Md} name={IconName.ArrowRight} />
      </View>
    </TouchableOpacity>
  );
};

export default PermissionItem;
