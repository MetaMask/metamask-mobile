export type Sections = string | SectionShape | (string | SectionShape)[];

export interface SectionShape {
  element: string;
  key: string;
  props?: { [key: string]: any };
  children?: Sections;
}

export interface SafeComponentList {
  [key: string]: React.ComponentType<any>;
}
