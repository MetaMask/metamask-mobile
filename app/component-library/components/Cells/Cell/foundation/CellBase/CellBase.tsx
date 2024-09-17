/* eslint-disable react/prop-types */

// Third library dependencies.
import React from 'react';

// External dependencies
import { useStyles } from '../../../../../hooks';
import Tag from '../../../../Tags/Tag';
import Avatar from '../../../../Avatars/Avatar';

// External dependencies
import ListItem from '../../../../List/ListItem';
import ListItemColumn, { WidthType } from '../../../../List/ListItemColumn';
import renderStringOrNode from '../../../../../utility/renderStringOrNode';

// Internal dependencies
import {
  DEFAULT_CELLBASE_AVATAR_SIZE,
  DEFAULT_CELLBASE_TITLE_TEXTVARIANT,
  DEFAULT_CELLBASE_TITLE_TEXTCOLOR,
  DEFAULT_CELLBASE_SECONDARYTEXT_TEXTVARIANT,
  DEFAULT_CELLBASE_SECONDARYTEXT_TEXTCOLOR,
  DEFAULT_CELLBASE_TERTIARYTEXT_TEXTVARIANT,
  DEFAULT_CELLBASE_TERTIARYTEXT_TEXTCOLOR,
  DEFAULT_CELLBASE_LISTITEM_GAP,
  DEFAULT_CELLBASE_LISTITEM_VERTICALALIGNMENT,
} from './CellBase.constants';
import styleSheet from './CellBase.styles';
import { CellBaseProps } from './CellBase.types';
import { CellModalSelectorsIDs } from '../../../../../../../e2e/selectors/Modals/CellModal.selectors';

const CellBase = ({
  style,
  avatarProps,
  title,
  secondaryText,
  tertiaryText,
  tagLabel,
  children,
}: CellBaseProps) => {
  const { styles } = useStyles(styleSheet, { style });

  return (
    <ListItem
      style={styles.cellBase}
      gap={DEFAULT_CELLBASE_LISTITEM_GAP}
      verticalAlignment={DEFAULT_CELLBASE_LISTITEM_VERTICALALIGNMENT}
    >
      {/* DEV Note: Account Avatar should be replaced with Avatar with Badge whenever available */}
      <ListItemColumn>
        <Avatar
          testID={CellModalSelectorsIDs.BASE_AVATAR}
          size={DEFAULT_CELLBASE_AVATAR_SIZE}
          {...avatarProps}
        />
      </ListItemColumn>
      <ListItemColumn widthType={WidthType.Fill}>
        {renderStringOrNode(title, {
          numberOfLines: 1,
          variant: DEFAULT_CELLBASE_TITLE_TEXTVARIANT,
          color: DEFAULT_CELLBASE_TITLE_TEXTCOLOR,
          testID: CellModalSelectorsIDs.BASE_TITLE,
        })}
        {secondaryText &&
          renderStringOrNode(secondaryText, {
            numberOfLines: 1,
            variant: DEFAULT_CELLBASE_SECONDARYTEXT_TEXTVARIANT,
            color: DEFAULT_CELLBASE_SECONDARYTEXT_TEXTCOLOR,
          })}
        {tertiaryText &&
          renderStringOrNode(tertiaryText, {
            numberOfLines: 1,
            variant: DEFAULT_CELLBASE_TERTIARYTEXT_TEXTVARIANT,
            color: DEFAULT_CELLBASE_TERTIARYTEXT_TEXTCOLOR,
          })}
        {!!tagLabel && <Tag label={tagLabel} style={styles.tagLabel} />}
      </ListItemColumn>
      {children && <ListItemColumn>{children}</ListItemColumn>}
    </ListItem>
  );
};

export default CellBase;
