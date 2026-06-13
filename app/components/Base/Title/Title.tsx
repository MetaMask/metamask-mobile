import React from 'react';
import { useTheme } from '../../../util/theme';
import styles from './Title.styles';
import { Text } from '@metamask/design-system-react-native';
interface TitleProps extends React.ComponentPropsWithoutRef<typeof Text> {
  centered?: boolean;
  hero?: boolean;
}

const Title: React.FC<TitleProps> = ({
  centered,
  hero,
  style: externalStyle,
  ...props
}: TitleProps) => {
  const { colors } = useTheme();
  const style = styles(colors);

  return (
    <Text
      style={{
        ...style.text,
        ...(centered ? style.centered : {}),
        ...(hero ? style.hero : {}),
        ...(typeof externalStyle === 'object' ? externalStyle : {}),
      }}
      {...props}
    />
  );
};

export default Title;
