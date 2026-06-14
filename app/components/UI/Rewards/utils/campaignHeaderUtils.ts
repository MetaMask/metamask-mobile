import {
  ButtonIconProps,
  IconName,
} from '@metamask/design-system-react-native';

/**
 * Returns the endButtonIconProps for a campaign mechanics help button,
 * or undefined if no campaign is loaded (hides the button).
 */
export function getCampaignMechanicsButtonProps(
  hasCampaign: boolean,
  onPress: () => void,
  testID: string,
): ButtonIconProps[] | undefined {
  return hasCampaign
    ? [{ iconName: IconName.Question, onPress, testID }]
    : undefined;
}
