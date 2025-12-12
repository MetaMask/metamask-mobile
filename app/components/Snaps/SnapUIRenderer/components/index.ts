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
import { selector } from './selector';
import { spinner } from './spinner';
import { skeleton } from './skeleton';
import { address } from './address';
import { avatar } from './avatar';
import { tooltip } from './tooltip';
import { addressInput } from './address-input';
import { assetSelector } from './asset-selector';
import { copyable } from './copyable';
import { accountSelector } from './account-selector';
import { dropdown } from './dropdown';
import { radioGroup } from './radioGroup';

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
  Selector: selector,
  Spinner: spinner,
  Skeleton: skeleton,
  Avatar: avatar,
  Address: address,
  Tooltip: tooltip,
  AssetSelector: assetSelector,
  Copyable: copyable,
  AccountSelector: accountSelector,
  Dropdown: dropdown,
  RadioGroup: radioGroup,
};
