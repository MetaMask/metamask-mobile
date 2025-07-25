import React from 'react';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../../component-library/components/Icons/Icon';
import ListItem, {
  VerticalAlignment,
} from '../../../../../../component-library/components/List/ListItem';
import ListItemColumn, {
  WidthType,
} from '../../../../../../component-library/components/List/ListItemColumn';
import Text, {
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import styleSheet from './PrivacySection.styles';
import { useStyles } from '../../../../../hooks/useStyles';
import { strings } from '../../../../../../../locales/i18n';

interface PrivacySectionProps {
  children?: React.ReactNode;
}

function PrivacySection({ children }: Readonly<PrivacySectionProps>) {
  const { styles, theme } = useStyles(styleSheet, {});
  return (
    <ListItem
      style={styles.section}
      verticalAlignment={VerticalAlignment.Top}
      gap={8}
    >
      <ListItemColumn>
        <Icon
          name={IconName.SecurityKey}
          size={IconSize.Lg}
          color={theme.colors.icon.alternative}
        />
      </ListItemColumn>
      <ListItemColumn widthType={WidthType.Fill}>
        {children ?? (
          <>
            <Text
              variant={TextVariant.BodyXS}
              color={theme.colors.text.alternative}
            >
              {strings('deposit.privacy_section.transak')}
            </Text>
            <Text
              variant={TextVariant.BodyXS}
              color={theme.colors.text.alternative}
            >
              {strings('deposit.privacy_section.metamask')}
            </Text>
          </>
        )}
      </ListItemColumn>
    </ListItem>
  );
}

export default PrivacySection;
