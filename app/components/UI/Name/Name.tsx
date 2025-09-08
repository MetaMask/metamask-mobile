/* eslint-disable react/prop-types */
import React, { useState } from 'react';
import { Pressable, TextProps, View, ViewStyle } from 'react-native';
import { AvatarSize } from '../../../component-library/components/Avatars/Avatar';
import Badge, {
  BadgeVariant,
} from '../../../component-library/components/Badges/Badge';
import Icon, {
  IconName,
} from '../../../component-library/components/Icons/Icon';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { useStyles } from '../../../component-library/hooks';
import images from '../../../images/image-icons';
import { renderShortAddress } from '../../../util/address';
import useDisplayName, {
  DisplayNameVariant,
} from '../../hooks/DisplayName/useDisplayName';
import Identicon from '../Identicon';
import styleSheet from './Name.styles';
import { NameProperties, NameType } from './Name.types';
import { TooltipModal } from '../../Views/confirmations/components/UI/Tooltip';
import { strings } from '../../../../locales/i18n';

const NameLabel: React.FC<{
  displayNameVariant: DisplayNameVariant;
  ellipsizeMode: TextProps['ellipsizeMode'];
  children: React.ReactNode;
}> = ({ displayNameVariant, ellipsizeMode, children }) => {
  const { styles } = useStyles(styleSheet, { displayNameVariant });
  return (
    <Text
      style={styles.label}
      ellipsizeMode={ellipsizeMode}
      numberOfLines={1}
      variant={TextVariant.BodyMD}
    >
      {children}
    </Text>
  );
};

const UnknownEthereumAddress: React.FC<{
  address: string;
  style?: ViewStyle;
}> = ({ address, style }) => {
  const displayNameVariant = DisplayNameVariant.Unknown;
  const { styles } = useStyles(styleSheet, { displayNameVariant });

  return (
    <View style={[styles.base, style]}>
      <Icon name={IconName.Question} />
      <NameLabel displayNameVariant={displayNameVariant} ellipsizeMode="middle">
        {renderShortAddress(address, 5)}
      </NameLabel>
    </View>
  );
};

const Name: React.FC<NameProperties> = ({
  preferContractSymbol,
  type,
  value,
  variation,
  style,
}) => {
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  if (type !== NameType.EthereumAddress) {
    throw new Error('Unsupported NameType: ' + type);
  }

  const { image, name, variant, isFirstPartyContractName } = useDisplayName({
    preferContractSymbol,
    type,
    value,
    variation,
  });

  const { styles } = useStyles(styleSheet, {
    displayNameVariant: variant,
  });

  if (variant === DisplayNameVariant.Unknown) {
    return <UnknownEthereumAddress address={value} style={style} />;
  }

  const MAX_CHAR_LENGTH = 21;
  const MIDDLE_SECTION_ELLIPSIS = '...';
  const truncatedName =
    name && name.length > MAX_CHAR_LENGTH
      ? `${name.slice(
          0,
          (MAX_CHAR_LENGTH - MIDDLE_SECTION_ELLIPSIS.length) / 2,
        )}${MIDDLE_SECTION_ELLIPSIS}${name.slice(
          -(MAX_CHAR_LENGTH - MIDDLE_SECTION_ELLIPSIS.length) / 2,
        )}`
      : name;

  return (
    <>
      <Pressable
        testID={`name-${value}`}
        onPress={() => setIsTooltipVisible(true)}
      >
        <View style={[styles.base, style]}>
          {isFirstPartyContractName ? (
            <Badge
              size={AvatarSize.Xs}
              imageSource={images.FOX_LOGO}
              variant={BadgeVariant.Network}
              isScaled={false}
            />
          ) : (
            <Identicon
              address={value}
              diameter={16}
              imageUri={image}
              customStyle={styles.image}
            />
          )}
          <NameLabel displayNameVariant={variant} ellipsizeMode="tail">
            {truncatedName}
          </NameLabel>
        </View>
      </Pressable>
      {isTooltipVisible && (
        <TooltipModal
          open={isTooltipVisible}
          setOpen={setIsTooltipVisible}
          content={value}
          title={strings('confirm.label.value')}
        />
      )}
    </>
  );
};

export default Name;
