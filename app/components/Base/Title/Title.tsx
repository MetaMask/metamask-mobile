import React from 'react';
import Text from '../Text/Text';
import { useTheme } from '../../../util/theme';
import styles from './Title.styles';

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
      style={[
        style.text,
        centered && style.centered,
        hero && style.hero,
        externalStyle,
      ]}
      {...props}
    />
  );
};

export default Title;
