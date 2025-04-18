import { box } from './box';
import { text } from './text';
import { row } from './row';
import { button } from './button';
import { banner } from './banner';
import { input } from './input';
import { bold } from './bold';
import { value } from './value';
import { card } from './card';
import { footer } from './footer';
import { container } from './container';
import { heading } from './heading';
import { link } from './link';
import { image } from './image';
import { form } from './form';
import { icon } from './icon';
import { field } from './field';
import { section } from './section';
import { spinner } from './spinner';
import { skeleton } from './skeleton';
import { address } from './address';
import { avatar } from './avatar';
import { tooltip } from './tooltip';
import { addressInput } from './address-input';

export const COMPONENT_MAPPING = {
  Box: box,
  Text: text,
  Row: row,
  Button: button,
  Banner: banner,
  AddressInput: addressInput,
  Input: input,
  Bold: bold,
  Value: value,
  Card: card,
  Footer: footer,
  Container: container,
  Heading: heading,
  Link: link,
  Image: image,
  Form: form,
  Field: field,
  Icon: icon,
  Section: section,
  Spinner: spinner,
  Skeleton: skeleton,
  Avatar: avatar,
  Address: address,
  Tooltip: tooltip,
};
