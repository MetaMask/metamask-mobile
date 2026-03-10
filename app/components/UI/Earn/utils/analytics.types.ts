type CamelToSnakeCase<S extends string> = S extends `${infer T}${infer U}`
  ? U extends Uncapitalize<U>
    ? `${Lowercase<T>}${CamelToSnakeCase<U>}`
    : `${Lowercase<T>}_${CamelToSnakeCase<U>}`
  : S;

export type DeepSnakeCaseKeys<T> = T extends readonly (infer U)[]
  ? DeepSnakeCaseKeys<U>[]
  : T extends object
    ? {
        [K in keyof T as CamelToSnakeCase<K & string>]: DeepSnakeCaseKeys<T[K]>;
      }
    : T;
