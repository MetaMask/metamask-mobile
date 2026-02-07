/* eslint-disable react/prop-types */
import React, { useState } from 'react';
import { Pressable, TextProps, View, ViewStyle } from 'react-native';
import { AvatarSize } from '../../../component-library/components/Avatars/Avatar';
import Badge, {
  BadgeVariant,
} from '../../../component-library/components/Badges/Badge';
import Text, {
  TextColor,
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import Icon, {
  IconSize,
} from '../../../component-library/components/Icons/Icon';
import { useStyles } from '../../../component-library/hooks';
import images from '../../../images/image-icons';
import { renderShortAddress } from '../../../util/address';
import useDisplayName, {
  DisplayNameVariant,
} from '../../hooks/DisplayName/useDisplayName';
import { TrustSignalIcon } from '../../Views/confirmations/utils/trust-signals';
import Identicon from '../Identicon';
import styleSheet from './Name.styles';
import { NameProperties, NameType } from './Name.types';
import { TooltipModal } from '../../Views/confirmations/components/UI/Tooltip';

/**
 * Component to render a trust signal icon if available.
 */
const TrustIcon: React.FC<{ icon: TrustSignalIcon | null }> = ({ icon }) => {
  if (!icon) {
    return null;
  }

  return (
    <Icon
      name={icon.name}
      color={icon.color}
      size={IconSize.Sm}
      testID="trust-signal-icon"
    />
  );
};

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
  iconSize: AvatarSize;
  icon?: TrustSignalIcon | null | undefined;
}> = ({ address, style, iconSize, icon = null }) => {
  const displayNameVariant = DisplayNameVariant.Unknown;
  const { styles } = useStyles(styleSheet, { displayNameVariant });

  return (
    <View style={[styles.base, style]}>
      {icon ? (
        <TrustIcon icon={icon} />
      ) : (
        <Identicon
          avatarSize={iconSize}
          address={address}
          diameter={16}
          customStyle={styles.image}
        />
      )}
      <NameLabel displayNameVariant={displayNameVariant} ellipsizeMode="middle">
        {renderShortAddress(address, 5)}
      </NameLabel>
    </View>
  );
};

const Name: React.FC<NameProperties> = ({
  preferContractSymbol,
  style,
  type,
  value,
  variation,
  maxCharLength = 21,
}) => {
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  if (type !== NameType.EthereumAddress) {
    throw new Error('Unsupported NameType: ' + type);
  }

  const { image, name, variant, isFirstPartyContractName, subtitle, icon } =
    useDisplayName({
      preferContractSymbol,
      type,
      value,
      variation,
    });
  const iconSize = subtitle ? AvatarSize.Md : AvatarSize.Sm;

  const { styles } = useStyles(styleSheet, {
    displayNameVariant: variant,
  });

  if (variant === DisplayNameVariant.Unknown) {
    return (
      <UnknownEthereumAddress
        iconSize={iconSize}
        address={value}
        style={style}
        icon={icon}
      />
    );
  }

  const MIDDLE_SECTION_ELLIPSIS = '...';
  const truncatedName =
    name && name.length > maxCharLength
      ? `${name.slice(
          0,
          (maxCharLength - MIDDLE_SECTION_ELLIPSIS.length) / 2,
        )}${MIDDLE_SECTION_ELLIPSIS}${name.slice(
          -(maxCharLength - MIDDLE_SECTION_ELLIPSIS.length) / 2,
        )}`
      : name;

  return (
    <>
      <Pressable
        testID={`name-${value}`}
        onPress={() => setIsTooltipVisible(true)}
      >
        <View style={[styles.base, style]}>
          {icon ? (
            <TrustIcon icon={icon} />
          ) : isFirstPartyContractName ? (
            <Badge
              size={AvatarSize.Xs}
              imageSource={images.FOX_LOGO}
              variant={BadgeVariant.Network}
              isScaled={false}
            />
          ) : (
            <Identicon
              avatarSize={iconSize}
              address={value}
              imageUri={image}
              customStyle={styles.image}
            />
          )}
          <View style={styles.labelContainer}>
            <NameLabel displayNameVariant={variant} ellipsizeMode="tail">
              {truncatedName}
            </NameLabel>
            {subtitle && (
              <Text
                numberOfLines={1}
                color={TextColor.Alternative}
                variant={TextVariant.BodySM}
              >
                {subtitle}
              </Text>
            )}
          </View>
        </View>
      </Pressable>
      {isTooltipVisible && (
        <TooltipModal
          open={isTooltipVisible}
          setOpen={setIsTooltipVisible}
          content={value}
          title={name}
        />
      )}
    </>
  );
};

export default Name;
