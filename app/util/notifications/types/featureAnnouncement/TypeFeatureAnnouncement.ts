import type { Entry, EntryFieldTypes } from 'contentful/dist/types';
import type { TypeActionFields } from './TypeAction';
import type { TypeLinkFields } from './TypeLink';

interface ImageFields {
  fields: {
    title?: EntryFieldTypes.Text;
    description?: EntryFieldTypes.Text;
    file?: EntryFieldTypes.Object<{
      url: string;
      fileName: string;
      contentType: string;
      details: {
        size: number;
        image?: {
          width: number;
          height: number;
        };
      };
    }>;
  };
  contentTypeId: 'Image';
}

export interface TypeFeatureAnnouncementFields {
  fields: {
    title: EntryFieldTypes.Text;
    id: EntryFieldTypes.Symbol;
    category: EntryFieldTypes.Text; // E.g. Announcement, etc.
    shortDescription: EntryFieldTypes.Text;
    image: EntryFieldTypes.EntryLink<ImageFields>;
    longDescription: EntryFieldTypes.RichText;
    link?: EntryFieldTypes.EntryLink<TypeLinkFields>;
    action?: EntryFieldTypes.EntryLink<TypeActionFields>;
  };
  contentTypeId: 'productAnnouncement';
}

export type TypeFeatureAnnouncement = Entry<
  TypeFeatureAnnouncementFields,
  'WITHOUT_UNRESOLVABLE_LINKS'
>;
