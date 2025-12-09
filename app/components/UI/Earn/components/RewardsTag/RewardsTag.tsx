import React from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import TagBase, {
  TagShape,
} from '../../../../../component-library/base-components/TagBase';
import { TextVariant } from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import FoxRewardIcon from '../../../../../images/rewards/metamask-rewards-points.svg';
import { useStyles } from '../../../../../component-library/hooks';
import { useTheme } from '../../../../../util/theme';

export const REWARDS_TAG_SELECTOR = 'rewards-tag';
export const REWARDS_TAG_INFO_ICON_SELECTOR = 'rewards-tag-info-icon';

export enum RewardsTagBackgroundVariant {
  Subsection = 'subsection',
  Muted = 'muted',
}

interface RewardsTagProps {
  /**
   * Number of points to display
   */
  points: number;
  /**
   * Optional callback when tag is pressed (e.g., to show tooltip)
   */
  onPress?: () => void;
  /**
   * Whether to show the info icon on the right
   * @default false
   */
  showInfoIcon?: boolean;
  /**
   * Whether to show the background color
   * @default true
   */
  showBackground?: boolean;
  /**
   * Background color variant
   * @default RewardsTagBackgroundVariant.Subsection
   */
  backgroundVariant?: RewardsTagBackgroundVariant;
  /**
   * Optional text to display after "points" (e.g., "per $100")
   */
  suffix?: string;
  /**
   * Optional test ID for the component
   */
  testID?: string;
}

const createStyles = () =>
  StyleSheet.create({
    wrapper: {
      marginVertical: 12,
    },
  });

/**
 * Reusable rewards tag component that displays the rewards icon and dynamic points.
 * Shows "0 points" until there's a value, then displays the actual points.
 * Can be used across different features like mUSD conversion, Perps, etc.
 */
const RewardsTag: React.FC<RewardsTagProps> = ({
  points,
  onPress,
  showInfoIcon = false,
  showBackground = true,
  backgroundVariant = RewardsTagBackgroundVariant.Subsection,
  suffix,
  testID,
}) => {
  const formattedPoints = new Intl.NumberFormat('en-US').format(points);
  const { colors } = useTheme();
  const { styles } = useStyles(createStyles, {});

  const backgroundColor = showBackground
    ? backgroundVariant === RewardsTagBackgroundVariant.Muted
      ? colors.background.muted
      : colors.background.subsection
    : 'transparent';

  const tagStyle = {
    backgroundColor,
    borderRadius: 8,
  };

  const content = (
    <TagBase
      shape={TagShape.Rectangle}
      includesBorder={false}
      textProps={{ variant: TextVariant.BodySMMedium }}
      startAccessory={
        <FoxRewardIcon name="fox-reward-icon" width={16} height={16} />
      }
      endAccessory={
        showInfoIcon ? (
          <Icon
            name={IconName.Info}
            size={IconSize.Sm}
            testID={REWARDS_TAG_INFO_ICON_SELECTOR}
          />
        ) : undefined
      }
      testID={testID || REWARDS_TAG_SELECTOR}
      gap={6}
      style={tagStyle}
    >
      {`${formattedPoints} points${suffix ? ` ${suffix}` : ''}`}
    </TagBase>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} style={styles.wrapper}>
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={styles.wrapper}>{content}</View>;
};

export default RewardsTag;
