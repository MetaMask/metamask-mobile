# TypeScript Guidelines

The TypeScript Guidelines establishes stylistic conventions and best practices for contributing TypeScript code to the MetaMask codebase.

## Introduction

This document is intended to complement linters and formatters. Emphasis is put on discussing underlying concepts and rationale, rather than listing rules and restrictions.

Type safety and maintainability are the highest priorities in these guidelines, even if that sometimes leads to unconventional or opinionated recommendations.

This document assumes that the reader has a high level of familiarity with TypeScript, and may omit explanations.

## Types

TypeScript provides a range of syntax for communicating type information with the compiler.

- The compiler performs **type inference** on all types and values in the code.
- The user can assign **type annotations** (`:`, `satisfies`) to override inferred types or add type constraints.
- The user can add **type assertions** (`as`, `!`) to force the compiler to accept user-supplied types even if they contradict the inferred types.
- Finally, there are **escape hatches** that let type checking be disabled (`@ts-expect-error`, `any`) for a certain scope of code.

The order of this list represents the general order of preference for using these features.

### Type Inference

TypeScript is very good at inferring types. Explicit type annotations and assertions are the exception rather than the rule in a well-managed TypeScript codebase.

Some fundamental type information must always be supplied by the user, such as function and class signatures, interfaces for interacting with external entities or data types, and types that express the domain model of the codebase.

However, for most types, inference should be preferred over annotations and assertions.

#### Prefer type inference over annotations and assertions

- Explicit type annotations (`:`) and type assertions (`as`, `!`) prevent inference-based narrowing of the user-supplied types.
  - The compiler errs on the side of trusting user input, which prevents it from utilizing additional type information that it is able to infer.
  - The `satisfies` operator is an exception to this rule.
- Type inferences are responsive to changes in code, always reflecting up-to-date type information, while annotations and assertions rely on hard-coding, making them brittle against code drift.
- The `as const` operator can be used to narrow an inferred abstract type into a specific literal type. When used on an object or array, it applies to each element.

#### Avoid unintentionally widening an inferred type with a type annotation

Enforcing a wider type defeats the purpose of adding an explicit type declaration, as it _loses_ type information instead of adding it. Double-check that the declared type is narrower than the inferred type.

**Example <a id="example-aba42b65-1cb9-4df0-881e-c2e0e79db0bd"></a> ([🔗 permalink](#example-aba42b65-1cb9-4df0-881e-c2e0e79db0bd)):**

🚫 Type declarations

```typescript
const name: string = 'METAMASK'; // Type 'string'

const chainId: string = this.messagingSystem(
  'NetworkController:getProviderConfig',
).chainId; // Type 'string'

const BUILT_IN_NETWORKS = new Map<string, `0x${string}`>([
  ['mainnet', '0x1'],
  ['sepolia', '0xaa36a7'],
]); // Type 'Map<string, `0x${string}`>'
```

✅ Type inferences

```typescript
const name = 'METAMASK'; // Type 'METAMASK'

const chainId = this.messagingSystem(
  'NetworkController:getProviderConfig',
).chainId; // Type '`0x${string}`'

const BUILT_IN_NETWORKS = {
  mainnet: '0x1',
  sepolia: '0xaa36a7',
} as const; // Type { readonly mainnet: '0x1'; readonly sepolia: '0xaa36a7'; }
```

**Example <a id="example-e9b0d703-032d-428b-a232-f5aa56a94470"></a> ([🔗 permalink](#example-e9b0d703-032d-428b-a232-f5aa56a94470)):**

```typescript
type TransactionMeta = TransactionBase &
  (
    | {
        status: Exclude<TransactionStatus, TransactionStatus.failed>;
      }
    | {
        status: TransactionStatus.failed;
        error: TransactionError;
      }
  );

const updatedTransactionMeta = {
  ...transactionMeta,
  status: TransactionStatus.rejected,
};

this.messagingSystem.publish(
  `${controllerName}:transactionFinished`,
  updatedTransactionMeta, // Expected type: 'TransactionMeta'
);
// Property 'error' is missing in type 'typeof updatedTransactionMeta' but required in type '{ status: TransactionStatus.failed; error: TransactionError; }'.ts(2345)
```

🚫 Widen to `TransactionMeta`

Adding a type annotation _does_ prevent the error above from being produced:

```typescript
// Type 'TransactionMeta'
const updatedTransactionMeta: TransactionMeta = {
  ...transactionMeta,
  status: TransactionStatus.rejected,
};
```

✅ Narrow to the correct type signature

However, `TransactionMeta` is a [discriminated union](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions) of two separate types — "not failed" and "failed" — and the property that acts as the discriminator is `status`. Instead of using `TransactionMeta`, which specifies that a `error` property _could_ be present, it would be better to get TypeScript to infer the first of the two types ("not failed"), which guarantees that `error` is not present. We can do this by adding `as const` after `TransactionStatus.rejected`:

```typescript
const updatedTransactionMeta = {
  ...transactionMeta,
  status: TransactionStatus.rejected as const,
};
```

### Type Annotations

An explicit type annotation may be used to override an inferred type if:

1. It can further narrow the inferred type, supplying type information that the compiler cannot infer or does not have access to.
2. It is being used to enforce a wider type constraint, not to assign a specific type definition. For this use case, `satisfies` is preferred over `:`.

Compared to type assertions, type annotations are more responsive to code drift. If the assignee's type becomes incompatible with the assigned type annotation, the compiler will raise a type error, whereas in most cases a type assertion will still suppress the error.

#### Prefer `satisfies` annotation over `:` annotation for enforcing type constraints

Introduced in [TypeScript 4.9](https://devblogs.microsoft.com/typescript/announcing-typescript-4-9/), the `satisfies` operator can be used to enforce a type constraint, while also allowing the compiler to fully narrow the assigned type through inference.

**Example <a id="example-21ed5949-8d34-4754-b806-412de1696f46"></a> ([🔗 permalink](#example-21ed5949-8d34-4754-b806-412de1696f46)):**

(continued from [previous example](#example-e9b0d703-032d-428b-a232-f5aa56a94470))

🚫 Use a type annotation for type validation.

- `updatedTransactionMeta` is widened to `TransactionMeta`.
- The error message enumerates all members of the `Exclude<TransactionStatus, TransactionStatus.failed>` union as the correct type for `status`.
- While this means that `updatedTransactionMeta` has been correctly narrowed to the first member in the `TransactionMeta` discriminated union, it is still not assigned the most specific type that could be inferred.

```typescript
const updatedTransactionMeta: TransactionMeta = {
  ...transactionMeta,
  status: TransactionStatus.rejected,
  // Object literal may only specify known properties, and 'nonTransactionMetaProperty' does not exist in type 'TransactionMeta'.ts(1360)
  nonTransactionMetaProperty: null,
};

// Property 'error' does not exist on type '{ status: TransactionStatus.approved | TransactionStatus.cancelled | TransactionStatus.confirmed | TransactionStatus.dropped | TransactionStatus.rejected | TransactionStatus.signed | TransactionStatus.submitted | TransactionStatus.unapproved; ... }'.(2339)
updatedTransactionMeta.error;
```

✅ Use the `satisfies` operator for type validation.

- `updatedTransactionMeta` is narrowed to its most specific type signature.
- The expected `status` property is not a union.

```typescript
const updatedTransactionMeta = {
  ...transactionMeta,
  status: TransactionStatus.rejected as const,
  // Object literal may only specify known properties, and 'nonTransactionMetaProperty' does not exist in type 'TransactionMeta'.ts(1360)
  nonTransactionMetaProperty: null,
} satisfies TransactionMeta;

// // Property 'error' does not exist on type '{ status: TransactionStatus.rejected; ... }'.(2339)
updatedTransactionMeta.error;
```

#### Provide a type annotation (`:`) when instantiating an empty composite data-type value

This is a special case where type inference cannot be expected to reach a useful conclusion without user-provided information.

The compiler doesn't have any values to use for inferring a type, and it cannot arbitrarily restrict the range of types that could be inserted into the collection. Given these restrictions, it has to assume the widest type, which is often `any`.

It's up to the user to appropriately narrow down this type by adding an explicit annotation that provides information about the user's intentions.

**Example <a id="example-b5a1175c-919f-4822-b92b-53a3d9dcd2e7"></a> ([🔗 permalink](#example-b5a1175c-919f-4822-b92b-53a3d9dcd2e7)):**

🚫

```typescript
const tokens = []; // Type 'any[]'
const tokensMap = new Map(); // Type 'Map<any, any>'
```

✅

```typescript
const tokens: string[] = []; // Type 'string[]'
const tokensMap = new Map<string, Token>(); // Type 'Map<string, Token>'
```

#### Prefer a type annotation (`:`) over `satisfies` when typing an extensible data type

The reason type inference and the `satisfies` operator are generally preferred over type annotations is that they provide us with the narrowest applicable type signature.

When typing an extensible data type, however, this becomes a liability, because the narrowest type signature by definition doesn't include any newly assigned properties or elements. Therefore, when declaring or instantiating an object, array, or class, explicitly assign a type annotation, unless it is intended to be immutable.

**Example <a id="example-a5fc6e57-2609-41c2-8315-558824bfffed"></a> ([🔗 permalink](#example-a5fc6e57-2609-41c2-8315-558824bfffed)):**

🚫 Type inference, `satisfies` operator

```typescript
// const SUPPORTED_CHAIN_IDS: ("0x1" | "0x38" | "0xa" | "0x2105" | "0x89" | "0xa86a" | "0xa4b1" | "0xaa36a7" | "0xe708")[]
export const SUPPORTED_CHAIN_IDS = [ // inference
  CHAIN_IDS.ARBITRUM,
  CHAIN_IDS.AVALANCHE,
  ...
  CHAIN_IDS.SEPOLIA,
];
export const SUPPORTED_CHAIN_IDS = [ // `satisfies` operator
  ...
] satisfies `0x${string}`[];

const { chainId } = networkController.state.providerConfig // Type of 'chainId': '`0x${string}`';
SUPPORTED_CHAIN_IDS.includes(chainId) // Argument of type '`0x${string}`' is not assignable to parameter of type '"0x1" | "0x38" | "0xa" | "0x2105" | "0x89" | "0xa86a" | "0xa4b1" | "0xaa36a7" | "0xe708"'.ts(2345)
```

✅ Type annotation

```typescript
export const SUPPORTED_CHAIN_IDS: `0x${string}`[] = [ // type annotation
  ...
];
const { chainId } = networkController.state.providerConfig // Type of 'chainId': '`0x${string}`';
SUPPORTED_CHAIN_IDS.includes(chainId) // No error
```

### Type Assertions

Type assertions are inherently unsafe and should only be used if the accurate type is unreachable through other means.

- Type assertions overwrite type-checked and compiler-inferred types with unverified user-supplied types.
- Type assertions can be used to suppress valid compiler errors by asserting to an incorrect type.
- Type assertions are erased at compile time without being validated against runtime code. If the type assertion is wrong, it will fail silently without generating an exception or null.
- Type assertions make the codebase brittle against changes.

  - As changes accumulate in the codebase, type assertions may continue to enforce type assignments that have become incorrect, or keep silencing errors that have changed. This can cause dangerous silent failures.
  - Type assertions will also provide no indication when they become unnecessary or redundant due to changes in the code.

    **Example <a id="example-3675ab71-bcd6-4325-ac18-8ba4dd8ec03c"></a> ([🔗 permalink](#example-3675ab71-bcd6-4325-ac18-8ba4dd8ec03c)):**

    ```typescript
    enum Direction {
      Up = 'up',
      Down = 'down',
      Left = 'left',
      Right = 'right',
    }
    const directions = Object.values(Direction);

    // Error: Element implicitly has an 'any' type because index expression is not of type 'number'.(7015)
    // Only one of the two `as` assertions necessary to fix error, but neither are flagged as redundant.
    for (const key of Object.keys(directions) as (keyof typeof directions)[]) {
      const direction = directions[key as keyof typeof directions];
    }
    ```

#### Avoid type assertions by using type guards to improve type inference

**Example <a id="example-50c3fbc9-c2d7-4140-9f75-be5f0a56d541"></a> ([🔗 permalink](#example-50c3fbc9-c2d7-4140-9f75-be5f0a56d541)):**

```typescript
type SomeInterface = { name: string; length: number };
type SomeOtherInterface = { value: boolean };

function isSomeInterface(x: unknown): x is SomeInterface {
  return (
    'name' in x &&
    typeof x.name === 'string' &&
    'length' in x &&
    typeof x.length === 'number'
  );
}
```

🚫 Type assertion

```typescript
function f(x: SomeInterface | SomeOtherInterface) {
  console.log((x as SomeInterface).name);
}
```

✅ Narrowing with type guard

```typescript
function f(x: SomeInterface | SomeOtherInterface) {
  if (isSomeInterface(x)) {
    console.log(x.name); // Type of x: 'SomeInterface'. Type of x.name: 'string'.
  }
}
```

**Example <a id="example-f7ff4b0d-e5e9-4568-b916-5153ddd2095b"></a> ([🔗 permalink](#example-f7ff4b0d-e5e9-4568-b916-5153ddd2095b)):**

```typescript
const nftMetadataResults = await Promise.allSettled(...);

nftMetadataResults
  .filter((promise) => promise.status === 'fulfilled')
  .forEach((elm) =>
    this.updateNft(
      elm.value.nft, // Property 'value' does not exist on type 'PromiseRejectedResult'.ts(2339)
      ...
    ),
  );
```

🚫 Type assertion

```typescript
(nftMetadataResults.filter(
    (promise) => promise.status === 'fulfilled',
  ) as { status: 'fulfilled'; value: NftUpdate }[])
  .forEach((elm) =>
    this.updateNft(
      elm.value.nft,
      ...
    ),
  );
```

✅ Use a type guard as the predicate for the filter operation, enabling TypeScript to narrow the filtered results to `PromiseFulfilledResult` at the type level

```typescript
nftMetadataResults.filter(
    (result): result is PromiseFulfilledResult<NftUpdate> =>
      result.status === 'fulfilled',
  )
  .forEach((elm) =>
    this.updateNft(
      elm.value.nft,
      ...
    ),
  );
```

> Note: The `is` type predicate in this example [is unnecessary as of TypeScript v5.5](https://github.com/microsoft/TypeScript/pull/57465).

#### Determine the target type for a type assertion by examining compiler error messages

Often, the compiler will tell us exactly what the target type for an assertion needs to be.

**Example <a id="example-2ee8f56a-e3be-417b-a2c0-260c1319b755"></a> ([🔗 permalink](#example-2ee8f56a-e3be-417b-a2c0-260c1319b755)):**

🚫 Compiler specifies that the target type should be `keyof NftController`

```typescript
// Error: Argument of type '"getNftInformation"' is not assignable to parameter of type 'keyof NftController'.ts(2345)
// 'getNftInformation' is a private method of class 'NftController'
sinon.stub(nftController, 'getNftInformation');
```

✅ `as` assertion to type specified by compiler

```typescript
sinon.stub(nftController, 'getNftInformation' as keyof typeof nftController);
```

#### Use `as unknown as` to force a type assertion to an incompatible type, or to perform runtime property access, assignment, or deletion

- TypeScript only allows type assertions that narrow or widen a type. Type assertions that fall outside of this category generate the following error:
  > **Error:** Conversion of type 'string' to type 'number' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.(2352)
- `as unknown as` enables type coercions to structurally incompatible types.
- `as unknown as` should only be used as a last resort for a very good reason, and not as a convenient way to force types into incorrect shapes that will temporarily silence errors.

- `as unknown as` can also resolve type errors arising from runtime property access, assignment, or deletion.

**Example <a id="example-03d4fc8b-73a3-478a-a986-df89c9b80775"></a> ([🔗 permalink](#example-03d4fc8b-73a3-478a-a986-df89c9b80775)):**

🚫 `any`

```typescript
for (const key of getKnownPropertyNames(this.internalConfig)) {
  (this as any)[key] = this.internalConfig[key];
}

delete addressBook[chainId as any];
// Element implicitly has an 'any' type because expression of type 'string' can't be used to index type '{ [chainId: `0x${string}`]: { [address: string]: AddressBookEntry; }; }'.
//  No index signature with a parameter of type 'string' was found on type '{ [chainId: `0x${string}`]: { [address: string]: AddressBookEntry; }; }'.ts(7053)
```

✅ `as unknown as`

```typescript
for (const key of getKnownPropertyNames(this.internalConfig)) {
  (this as unknown as typeof this.internalConfig)[key] =
    this.internalConfig[key];
}

delete addressBook[chainId as unknown as `0x${string}`];
```

#### Always prefer type assertions over "escape hatches"

- With type assertions, we still get working intellisense, autocomplete, and other IDE and compiler features using the asserted type.
- Type assertions also provide an indication of what the author intends or expects the type to be.
- Even an assertion to a wrong type still allows the compiler to show us warnings and errors as the code changes.

#### For safe or necessary type assertions, document the reasoning behind its usage with a comment

- A type assertion may be necessary to satisfy constraints. To be used safely, it must also be supported by runtime validations.

  **Example <a id="example-81737669-75fb-46d6-b2ce-c09acd5b89ab"></a> ([🔗 permalink](#example-81737669-75fb-46d6-b2ce-c09acd5b89ab)):**

  ```typescript
  handle<Params extends JsonRpcParams, Result extends Json>(
    request: JsonRpcRequest<Params>,
    callback: (error: unknown, response: JsonRpcResponse<Result>) => void,
  ): void;

  handle<Params extends JsonRpcParams, Result extends Json>(
    requests: (JsonRpcRequest<Params> | JsonRpcNotification<Params>)[],
    callback: (error: unknown, responses: JsonRpcResponse<Result>[]) => void,
  ): void;

  handle<Params extends JsonRpcParams, Result extends Json>(
    requests: (JsonRpcRequest<Params> | JsonRpcNotification<Params>)[],
  ): Promise<JsonRpcResponse<Result>[]>;
  ```

  ✅

  ```typescript
  handle(
    req:
      | (JsonRpcRequest | JsonRpcNotification)[]
      | JsonRpcRequest
      | JsonRpcNotification,
    callback?: (error: unknown, response: never) => void,
  ) {
    ...
    if (Array.isArray(req) && callback) {
      return this.#handleBatch(
        req,
        // This assertion is safe because of the runtime checks validating that `req` is an array and `callback` is defined.
        // There is only one overload signature that satisfies both conditions, and its `callback` type is the one that's being asserted.
        callback as (
          error: unknown,
          responses?: JsonRpcResponse<Json>[],
        ) => void,
      );
    }
    ...
  }
  ```

- A type assertion may be necessary to align with a type which is verified to be accurate by an external source of truth. To be used safely, it must also be supported by runtime validations.

  **Example <a id="example-05558b5e-527e-46b0-8b40-918f28d05156"></a> ([🔗 permalink](#example-05558b5e-527e-46b0-8b40-918f28d05156)):**

  ✅

  ```typescript
  import contractMap from '@metamask/contract-metadata';

  type LegacyToken = {
    name: string;
    logo: `${string}.svg`;
    symbol: string;
    decimals: number;
    erc20?: boolean;
    erc721?: boolean;
  };

  export const STATIC_MAINNET_TOKEN_LIST = Object.entries(
    // This type assertion is to the known schema of the JSON object `contractMap`.
    contractMap as Record<Hex, LegacyToken>,
  ).reduce((acc, [base, contract]) => {
    const { name, symbol, decimals, logo, erc20, erc721 } = contract;
    // The required properties are validated at runtime
    if ([name, symbol, decimals, logo].some((e) => !e)) {
      return;
    }
    ...
  }, {});
  ```

- Rarely, a type assertion may be necessary to resolve or suppress a type error caused by a bug or limitation of an external library, or even the TypeScript language itself.

  **Example <a id="example-3d77c689-2bec-48d6-8c2e-c38b7b2079ea"></a> ([🔗 permalink](#example-3d77c689-2bec-48d6-8c2e-c38b7b2079ea)):**

  ✅

  ```typescript
  import { produceWithPatches } from 'immer';

  protected update(
    callback: (state: Draft<ControllerState>) => void | ControllerState,
  ): {
    nextState: ControllerState;
    patches: Patch[];
    inversePatches: Patch[];
  } {
    // We run into ts2589, "infinite type depth", if we don't assert `produceWithPatches` here.
    const [nextState, patches, inversePatches] = (
      produceWithPatches as unknown as (
        state: ControllerState,
        cb: typeof callback,
      ) => [ControllerState, Patch[], Patch[]]
    )(this.#internalState, callback);
    ...
  }
  ```

#### `as` is always acceptable to use in TypeScript syntax that does not involve type assertions

- `as const` assertions.

- Key remapping in mapped types uses the `as` keyword.

  **Example <a id="example-6ffd8c99-4768-42e1-8cb7-5710d14f8552"></a> ([🔗 permalink](#example-6ffd8c99-4768-42e1-8cb7-5710d14f8552)):**

  ```typescript
  type MappedTypeWithNewProperties<Type> = {
    [Properties in keyof Type as NewKeyType]: Type[Properties];
  };
  ```

### Escape Hatches

TypeScript provides several escape hatches that disable compiler type checks altogether and suppress compiler errors. Using these to ignore typing issues is dangerous and reduces the effectiveness of TypeScript.

- `@ts-expect-error`

  - Applies to a single line, which may contain multiple variables and errors.
  - **It alerts users if an error it was suppressing is resolved by changes in the code:**

    > **Error:** Unused '@ts-expect-error' directive.

    This feature makes `@ts-expect-error` a safer alternative to type assertions by mitigating false positives.

  - `@ts-expect-error` usage should generally be reserved to situations where an error is the intended or expected result of an operation, not to silence errors when the correct typing solution is difficult to find.
  - Allowed by the `@typescript-eslint/ban-ts-comment` rule, although a description comment is required.

- `any`
  - Applies to all instances of the target variable or type throughout the entire codebase, and in downstream code as well.
    - `as any` only applies to a single instance of a single variable without propagating to other instances.
  - Banned by the `@typescript-eslint/no-explicit-any` rule.

#### Use `@ts-expect-error` to force runtime execution of a branch for validation or testing

Sometimes, there is a need to force a branch to execute at runtime for security or testing purposes, even though that branch has correctly been inferred as being inaccessible by the TypeScript compiler.

This is often the case when downstream consumers of the code are using JavaScript and do not have access to compile-time guardrails.

**Example <a id="example-76b145a7-89bf-4f19-914b-d1c02e2db185"></a> ([🔗 permalink](#example-76b145a7-89bf-4f19-914b-d1c02e2db185)):**

🚫

> **Error:** This comparison appears to be unintentional because the types '\`0x${string}\`' and '"\_\_proto\_\_"' have no overlap.ts(2367)

```typescript
function exampleFunction(chainId: `0x${string}`) {
    if (chainId === '__proto__') {
      return;
    }
    ...
}
```

🚫

> **Error:** Argument of type '"\_\_proto\_\_"' is not assignable to parameter of type '\`0x${string}\`'.ts(2345)

```typescript
exampleFunction('__proto__');
```

✅

```typescript
function exampleFunction(chainId: `0x${string}`) {
    // @ts-expect-error Suppressing to perform runtime check
    if (chainId === '__proto__') {
      return;
    }
    ...
}
```

✅

```typescript
// @ts-expect-error Suppressing to perform runtime check
exampleFunction('__proto__');
```

#### `@ts-expect-error` may be acceptable to use in tests, to intentionally break features

**Example <a id="example-e299e95d-1c41-4251-85b6-f8064b22f577"></a> ([🔗 permalink](#example-e299e95d-1c41-4251-85b6-f8064b22f577)):**

✅

```typescript
// @ts-expect-error Suppressing to test runtime error handling

// @ts-expect-error Intentionally testing invalid state

// @ts-expect-error We are intentionally passing bad input.
```

#### If accompanied by a TODO comment, `@ts-expect-error` is acceptable to use for marking errors that have clear plans of being resolved

**Example <a id="example-43313247-4393-4966-b78e-378f636fedec"></a> ([🔗 permalink](#example-43313247-4393-4966-b78e-378f636fedec)):**

✅

```typescript
// @ts-expect-error TODO: remove this annotation once the `Eip1193Provider` class is released, resolving thi provider misalignment issue.
return new Web3Provider(provider);

// TODO: Fix this by handling or eliminating the undefined case
// @ts-expect-error This variable can be `undefined`, which would break here.
```

This recommendation applies to any disruptive change that creates many errors at once (e.g. dependency update, upstream refactor, package migration).

See [this entry](https://github.com/MetaMask/core/blob/main/docs/package-migration-process-guide.md#4-resolve-or-todo-downstream-errors) in the core repo "package migration process guide," which recommends that complex or blocked errors should be annotated with a `// @ts-expect-error TODO:` comment, and then revisited once the disruptive change has been completed.

#### Avoid `any`

`any` is the most dangerous form of explicit type declaration, and should be completely avoided.

Unfortunately, when confronted with nontrivial typing issues, there's a very strong incentive to use `any` to bypass the TypeScript type system.

It's very easy for teams to fall into a pattern of unblocking feature development using `any`, with the intention of fixing it later. This is a major source of tech debt, and the destructive influence of `any` usage on the type safety of a codebase cannot be understated.

To prevent `any` instances from being introduced into the codebase, it is not enough to rely on the `@typescript-eslint/no-explicit-any` ESLint rule. It's also necessary for all contributors to share a common understanding of exactly why `any` is dangerous, and how it can be avoided.

- `any` does not represent the widest type. In fact, it is not a type at all. `any` is a compiler directive for _disabling_ type checking for the value or type to which it's assigned.
- `any` suppresses all error messages about its assignee.

  - The suppressed errors still affect the code, but `any` makes it impossible to assess and counteract their influence.
  - `any` has the same effect as going through the entire codebase to apply `@ts-ignore` to every single instance of the target variable or type.
  - Much like type assertions, code with `any` usage becomes brittle against changes, since the compiler is unable to update its feedback even if the suppressed error has been altered, or entirely new type errors have been added.
  <!-- TODO: Add example -->

- `any` subsumes all other types it comes into contact with. Any type that is in a union, intersection, is a property of, or has any other relationship with an `any` type or value becomes an `any` type itself. This represents an unmitigated loss of type information.

  **Example <a id="example-1fb5b0ad-61a9-4ad8-9d84-e29b78d88325"></a> ([🔗 permalink](#example-1fb5b0ad-61a9-4ad8-9d84-e29b78d88325)):**

  ```typescript
  // Type of 'payload_0': 'any'
  const handler:
    | ((payload_0: ComposableControllerState, payload_1: Patch[]) => void)
    | ((payload_0: any, payload_1: Patch[]) => void);

  function returnsAny(): any {
    return { a: 1, b: true, c: 'c' };
  }
  // Types of a, b, c are all `any`
  const { a, b, c } = returnsAny();
  ```

- `any` infects all surrounding and downstream code with its directive to suppress errors. This is the most dangerous characteristic of `any`, as it causes the encroachment of unsafe code that have no guarantees about type safety or runtime behavior.

  **Example <a id="example-02188a9c-836f-47c0-95a7-9495c15ec653"></a> ([🔗 permalink](#example-02188a9c-836f-47c0-95a7-9495c15ec653)):**

  🚫 A single type, `InferWithParams`, is set to `any` in `@metamask/utils`

  ```typescript
  export declare type InferWithParams<
    Type extends Struct<any>,
    Params extends JsonRpcParams,
  > = any;

  export declare type JsonRpcRequest<
    Params extends JsonRpcParams = JsonRpcParams,
  > = InferWithParams<typeof JsonRpcRequestStruct, Params>; // Resolves to 'any'

  export declare type JsonRpcResponse<Result extends Json> =
    | JsonRpcSuccess<Result>
    | JsonRpcFailure; // Resolves to 'any'
  ```

  🚫 A downstream package is polluted with a large number of `any`s.

  The valid error messages shown in the comments are suppressed by the `any` types.

  ```typescript
  import type {
    JsonRpcRequest,
    JsonRpcResponse
  } from '@metamask/utils'

  function sendMetadataHandler<Params extends JsonRpcParams, Result extends Json>(
    req: JsonRpcRequest<Params> // any,
    res: JsonRpcResponse<Result> // any,
    _next: JsonRpcEngineNextCallback,
    end: JsonRpcEngineEndCallback,
    { addSubjectMetadata, subjectType }: SendMetadataOptionsType,
  ): void {
    // Error: Property 'origin' does not exist on type 'JsonRpcRequest<Params>'.ts(2339)
    const { origin, params } = req;
    //      'any' , 'any'
    if (params && typeof params === 'object' && !Array.isArray(params)) {
      const { icon = null, name = null, ...remainingParams } = params;

      addSubjectMetadata({
        ...remainingParams // 'any',
        iconUrl: icon // 'any',
        name,
        subjectType,
        origin,
      });
    } else {
      return end(ethErrors.rpc.invalidParams({ data: params }));
                                                  // 'any'
    }
    // Error: Property 'result' does not exist on type 'JsonRpcResponse<Result>'.
      // Property 'result' does not exist on type '{ error: JsonRpcError; id: string | number; jsonrpc: "2.0"; }'.ts(2339)
    res.result = true;
    // `res`, `res.result` are both 'any'
    return end();
  }
  ```

All of this makes `any` a prominent cause of dangerous **silent failures**, where the code fails at runtime but the compiler does not provide any prior warning, which defeats the purpose of using a statically-typed language.

#### If `any` is being used as the _assignee_ type, try `unknown` first, and then narrowing to an appropriate supertype of the _assigned_ type

`any` usage is often motivated by a need to find a placeholder type that could be anything. `unknown` is a likely type-safe substitute for `any` in these cases.

- `unknown` is the universal supertype i.e. the widest possible type, equivalent to the universal set(U).
- Every type is assignable to `unknown`, but `unknown` is not assignable to any type but itself.
- When typing the _assignee_, `any` and `unknown` are completely interchangeable since every type is assignable to both.

**Example <a id="example-2e5889f6-110a-4c62-b659-20cfcc7c8916"></a> ([🔗 permalink](#example-2e5889f6-110a-4c62-b659-20cfcc7c8916)):**

🚫 `any`

```typescript
type ExampleFunction = () => any;
const exampleArray: any[] = ['a', 1, true];
```

✅ `unknown`

```typescript
type ExampleFunction = () => unknown;
const exampleArray: unknown[] = ['a', 1, true];
```

#### If `any` is being used as the _assigned_ type, try `never` first, and then widening to an appropriate subtype of the _assignee_ type

Unfortunately, when typing the _assigned_ type, `unknown` cannot substitute `any` in most cases, because:

- `unknown` is only assignable to `unknown`.
- The type of the _assigned_ must be a subtype of the _assignee_, but `unknown` can only be a subtype of `unknown`.

However, `never` is assignable to all types.

**Example <a id="example-56165606-17db-479d-a2f7-cc95250f2129"></a> ([🔗 permalink](#example-56165606-17db-479d-a2f7-cc95250f2129)):**

```typescript
function f1(arg1: string) { ... }
```

🚫 `any`

In the function call `f1(arg2)`, the argument `arg2` is the _assigned_ type and the parameter `arg1` is the _assignee_ type.

```typescript
function f2(arg2: any) {
  f1(arg2);
}
```

🚫 `unknown`

> **Error:** Argument of type 'unknown' is not assignable to parameter of type 'string'.(2345)

```typescript
function f2(arg2: unknown) {
  f1(arg2); // Error
}
```

✅ `never`

> **Note:** While `never` itself is rarely the correct type, trying `never` as a substitute for `any` is a useful test.

The fact that **`never` works while `unknown` doesn't** is a very useful piece of information that lets us narrow down the search space to subtypes of the _assignee_ type.

In this case, that means `arg2` could be widened to any type that is a subtype of `string`.

```typescript
function f2(arg2: never) {
  f1(arg2); // No error
}
```

✅ Subtype of `string`, the assignee type

```typescript
function f2(arg2: `0x${string}`) {
  f1(arg2); // No error
}
```

#### Always supply a type argument if a generic type parameter has a default type of `any`

Some generic types use `any` as a generic parameter default. If not actively avoided, this can silently introduce an `any` type into the code, causing unexpected behavior and suppressing useful errors.

**Example <a id="example-c64ed0da-01f1-4b61-a28a-ff8e8ab3c8b5"></a> ([🔗 permalink](#example-c64ed0da-01f1-4b61-a28a-ff8e8ab3c8b5)):**

🚫

```typescript
const mockGetNetworkConfigurationByNetworkClientId = jest.fn(); // Type 'jest.Mock<any, any>'
mockGetNetworkConfigurationByNetworkClientId.mockImplementation(
  (origin, type) => {},
); // No error!
// Even though 'mockImplementation' should only accept callbacks with a signature of '(networkClientId: string) => NetworkConfiguration | undefined'
```

✅

```typescript
const mockGetNetworkConfigurationByNetworkClientId = jest.fn<
  ReturnType<NetworkController['getNetworkConfigurationByNetworkClientId']>,
  Parameters<NetworkController['getNetworkConfigurationByNetworkClientId']>
>(); // Type 'jest.Mock<NetworkConfiguration | undefined, [networkClientId: string]>'
mockGetNetworkConfigurationByNetworkClientId.mockImplementation(
  (origin, type) => {},
);
// Argument of type '(origin: any, type: any) => void' is not assignable to parameter of type '(networkClientId: string) => NetworkConfiguration | undefined'.
// Target signature provides too few arguments. Expected 2 or more, but got 1.ts(2345)
```

> **Note:** This is an issue with `@types/jest` v27. Jest v29 no longer uses `any` as the default type for its generic parameters.

#### `any` may be acceptable to use within generic constraints

**Example <a id="example-706045b1-1f01-4e24-ae02-d9a3a8e81615"></a> ([🔗 permalink](#example-706045b1-1f01-4e24-ae02-d9a3a8e81615)):**

✅ `messenger` is not polluted by `any`

```typescript
class BaseController<
  ...,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  messenger extends RestrictedControllerMessenger<N, any, any, string, string>
> ...
```

✅ `ComposableControllerState` is not polluted by `any`

```typescript
export class ComposableController<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ComposableControllerState extends { [name: string]: Record<string, any> },
> extends BaseController<
  typeof controllerName,
  // (type parameter) ComposableControllerState in ComposableController<ComposableControllerState extends ComposableControllerStateConstraint>
  ComposableControllerState,
  ComposableControllerMessenger<ComposableControllerState>
>
```

- In general, using `any` in this context is not harmful in the same way that it is in other contexts, as the `any` types only are not directly assigned to any specific variable, and only function as constraints.
- More specific constraints provide better type safety and intellisense, and should be preferred wherever possible.
- This only applies to generic _constraints_. It does not apply to passing in `any` as a generic _argument_.

  **Example <a id="example-7b9781b4-0f33-4619-ba50-a90b2594e23f"></a> ([🔗 permalink](#example-7b9781b4-0f33-4619-ba50-a90b2594e23f)):**

  🚫

  ```typescript
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const controllerMessenger = ControllerMessenger<any, any>;
  ```

## Generic Types

#### Constrain generic types if necessary

It may not be enough just to have a type or a function take another type — you might have to constrain it if it's not allowed to be anything (e.g. extends Json)

```typescript
// before
function createExampleMiddleware<Params, Result>(exampleParam);
// after
function createExampleMiddleware<
  Params extends JsonRpcParams,
  Result extends Json,
>(exampleParam);
```

#### Use `Omit` to reduce requirements

`Omit<T, K>` takes two generic types: `T` representing the original object type and `K` representing the property keys you want to remove. It returns a new type that has all the properties of T except for the ones specified in K. Here are some cases to use omit:

- Removing Unnecessary Properties:
  Imagine you have a user interface with optional email and phone number fields. However, your API call only cares about the `username`. You can use Omit to reduce the required properties:

```typescript
interface User {
  username: string;
  email?: string;
  phoneNumber?: string;
}

// Type for API call payload
type ApiPayload = Omit<User, 'email' | 'phoneNumber'>;

const payload: ApiPayload = { username: 'johndoe' };
// Now `payload` only has the `username` property, satisfying the API requirements.
```

- Conditional Omission:
  Sometimes, you might want to remove properties based on a condition. `Omit` can still be helpful:

```typescript
interface CartItem {
  productId: number;
  quantity: number;
  color?: string; // Optional color

// Omit color if quantity is 1
const singleItemPayload = Omit<CartItem, "color" extends string ? "color" : never>;

// Omit color for all items if quantity is always 1
const cartPayload: singleItemPayload[] = [];
```

## Interfaces

#### Always prefer type aliases over the `interface` keyword

We enforce consistent and exclusive usage of type aliases over the `interface` keyword to declare types for several reasons:

- The capabilities of type aliases is a strict superset of those of interfaces.
  - Crucially, `extends`, `implements` are also supported by type aliases.
  - Declaration merging is the only exception, but we have no use case for this feature that cannot be substituted by using type intersections.
- Unlike interfaces, type aliases extend `Record` and have an index signature of `string` by default, which makes them compatible with our Json-serializable types (most notably `Record<string, Json>`).
- Type aliases can be freely merged using the intersection (`&`) operator, like interfaces which can implement multiple inheritance.

#### `implements` keyword

The `implements` keyword enables us to define and enforce interfaces, i.e. strict contracts consisting of expected object and class properties and abstract method signatures.
Writing an interface to establish the specifications of a class that external code can interact while without being aware of internal implementation details is encouraged as sound OOP development practice.
Here's an abbreviated example from `@metamask/polling-controller` of an interface being used to define one of our most important constructs.

```typescript
export type IPollingController = {
...
}

export function AbstractPollingControllerBaseMixin<TBase extends Constructor>(
    Base: TBase,
) {
    abstract class AbstractPollingControllerBase
        extends Base
        implements IPollingController
    { ... }
    return AbstractPollingControllerBase
}
```

The concept of the interface as discussed in this section is not to be confused with interface syntax as opposed to type alias syntax. Note that in the above example, the `IPollingController` interface is defined as a type alias, not using the `interface` keyword.

## Enums

TypeScript offers several tools for crafting clear data definitions, with enumerations and unions standing as popular choices.

#### Consider using enums over union types for situations with a fixed set of known values.

Inevitably you will want to refer to the values of a union type somewhere (perhaps as the argument to a function). You can of course just use a literal which represents a member of that union — but if you have an enum, then all of the values are special, and any time you use a value then anyone can see where that value comes from.

🚫

```typescript
type UserRole = 'admin' | 'editor' | 'subscriber';
```

✅

```typescript
enum AccountType {
  Admin = 'admin',
  User = 'user',
  Guest = 'guest',
}
```

#### Don't use numeric enums

Numeric enums are misleading because it creates a reverse mapping from value to property name, and when using `Object.values` to access member names, it will return the numerical values instead of the member names, potentially causing unexpected behavior.
🚫

```typescript
enum Direction {
  Up = 0,
  Down = 1,
  Left = 2,
  Right = 3,
}

const directions = Object.values(Direction); // [0, 1, 2, 3]
```

✅

```typescript
enum Direction {
  Up = 'Up',
  Down = 'Down',
  Left = 'Left',
  Right = 'Right',
}

const directions = Object.values(Direction); // ["Up", "Down", "Left", "Right"]
```

## Functions

#### For functions and methods, provide explicit return types

Although TypeScript is capable of inferring return types, adding them explicitly makes it much easier for the reader to see the API from the code alone and prevents unexpected changes to the API from emerging.

**Example <a id="example-a88b18ef-b066-4aa7-8106-bc244298f9e6"></a> ([🔗 permalink](#example-a88b18ef-b066-4aa7-8106-bc244298f9e6)):**

🚫

```typescript
async function removeAccount(address: Hex) {
  const keyring = await this.getKeyringForAccount(address);

  if (!keyring.removeAccount) {
    throw new Error(KeyringControllerError.UnsupportedRemoveAccount);
  }
  keyring.removeAccount(address);
  this.emit('removedAccount', address);

  await this.persistAllKeyrings();
  return this.fullUpdate();
}
```

✅

```typescript
async function removeAccount(address: Hex): Promise<KeyringControllerState> {
  const keyring = await this.getKeyringForAccount(address);

  if (!keyring.removeAccount) {
    throw new Error(KeyringControllerError.UnsupportedRemoveAccount);
  }
  keyring.removeAccount(address);
  this.emit('removedAccount', address);

  await this.persistAllKeyrings();
  return this.fullUpdate();
}
```
