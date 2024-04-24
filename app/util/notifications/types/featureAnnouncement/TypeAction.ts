import type { Entry, EntryFieldTypes } from 'contentful/dist/types';

export interface TypeActionFields {
  fields: {
    actionText: EntryFieldTypes.Text;
    actionUrl: EntryFieldTypes.Text;
    isExternal: EntryFieldTypes.Boolean;
  };
  contentTypeId: 'action';
}

export type TypeAction = Entry<TypeActionFields, 'WITHOUT_UNRESOLVABLE_LINKS'>;
