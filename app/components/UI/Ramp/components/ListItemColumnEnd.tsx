import React from 'react';
import ListItemColumn from '../../../../component-library/components/List/ListItemColumn';
import { ListItemColumnProps } from '../../../../component-library/components/List/ListItemColumn/ListItemColumn.types';

const ListItemColumnEnd: React.FC<ListItemColumnProps> = ({
  style,
  ...props
}) => {
  return (
    <ListItemColumn
      style={{
        ...(typeof style === 'object' ? style : {}),
        alignItems: 'flex-end',
      }}
      {...props}
    />
  );
};

export default ListItemColumnEnd;
