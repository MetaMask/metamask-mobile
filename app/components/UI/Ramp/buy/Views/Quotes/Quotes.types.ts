export type DeepPartial<BaseType> = {
  [key in keyof BaseType]?: DeepPartial<BaseType[key]>;
};
