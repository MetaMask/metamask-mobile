import type { Entry, EntryFieldTypes } from 'contentful/dist/types';

export interface TypeLinkFields {
  fields: {
    linkText: EntryFieldTypes.Text;
    linkUrl: EntryFieldTypes.Text;
    isExternal: EntryFieldTypes.Boolean;
  };
  contentTypeId: 'link';
}

export type TypeLink = Entry<TypeLinkFields, 'WITHOUT_UNRESOLVABLE_LINKS'>;
