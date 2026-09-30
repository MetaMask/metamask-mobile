import type {
  ContractRule,
  JsonObject,
  JsonValue,
} from './contract';
import type { EventPilotDefinition } from './quick-buy-pilot';

interface PropertyDefinition {
  readonly description?: string;
  readonly name: string;
  readonly required: boolean;
  readonly type: string;
}

interface VersionDefinition {
  readonly properties: readonly PropertyDefinition[];
  readonly version: number;
}

export interface GeneratedEventFiles {
  readonly source: string;
  readonly typeTests: string;
}

const SUPPORTED_PROPERTY_KEYS = new Set(['description', 'enum', 'type']);

const isJsonObject = (value: JsonValue | undefined): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readObject = (
  value: JsonValue | undefined,
  path: string,
): JsonObject => {
  if (!isJsonObject(value)) {
    throw new Error(`Expected object at ${path}`);
  }

  return value;
};

const readStringArray = (
  value: JsonValue | undefined,
  path: string,
): readonly string[] => {
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
    throw new Error(`Expected string array at ${path}`);
  }

  return value;
};

const readPropertyType = (
  schema: JsonObject,
  path: string,
): 'boolean' | 'integer' | 'number' | 'string' => {
  const rawType = schema.type;
  const type =
    typeof rawType === 'string'
      ? rawType
      : Array.isArray(rawType) && rawType.length === 1
        ? rawType[0]
        : undefined;

  if (
    type !== 'boolean' &&
    type !== 'integer' &&
    type !== 'number' &&
    type !== 'string'
  ) {
    throw new Error(`Unsupported JSON Schema type at ${path}.type`);
  }

  return type;
};

const readEnumType = (
  schema: JsonObject,
  primitiveType: 'boolean' | 'integer' | 'number' | 'string',
  path: string,
): string | undefined => {
  const enumValues = schema.enum;

  if (enumValues === undefined) {
    return undefined;
  }

  if (!Array.isArray(enumValues) || enumValues.length === 0) {
    throw new Error(`Expected non-empty enum at ${path}.enum`);
  }

  const isExpectedType = (value: JsonValue): boolean => {
    switch (primitiveType) {
      case 'boolean':
        return typeof value === 'boolean';
      case 'integer':
        return typeof value === 'number' && Number.isInteger(value);
      case 'number':
        return typeof value === 'number';
      case 'string':
        return typeof value === 'string';
      default:
        return false;
    }
  };

  if (!enumValues.every(isExpectedType)) {
    throw new Error(`Enum values do not match ${primitiveType} at ${path}.enum`);
  }

  return enumValues.map((value) => JSON.stringify(value)).join(' | ');
};

const toTypeScriptType = (schema: JsonObject, path: string): string => {
  const unsupportedKeys = Object.keys(schema).filter(
    (key) => !SUPPORTED_PROPERTY_KEYS.has(key),
  );

  if (unsupportedKeys.length > 0) {
    throw new Error(
      `Unsupported JSON Schema keys at ${path}: ${unsupportedKeys.join(', ')}`,
    );
  }

  const primitiveType = readPropertyType(schema, path);
  const enumType = readEnumType(schema, primitiveType, path);

  if (enumType) {
    return enumType;
  }

  return primitiveType === 'integer' ? 'number' : primitiveType;
};

const readDescription = (schema: JsonObject, path: string): string | undefined => {
  const description = schema.description;

  if (description === undefined) {
    return undefined;
  }

  if (typeof description !== 'string') {
    throw new Error(`Expected string at ${path}.description`);
  }

  return description.trim();
};

const readRuleProperties = (
  rule: ContractRule,
): {
  readonly properties: JsonObject;
  readonly required: readonly string[];
} => {
  const schemaProperties = readObject(
    rule.jsonSchema.properties,
    `rule v${rule.version}.jsonSchema.properties`,
  );
  const eventProperties = readObject(
    schemaProperties.properties,
    `rule v${rule.version}.jsonSchema.properties.properties`,
  );

  return {
    properties: readObject(
      eventProperties.properties,
      `rule v${rule.version}.properties`,
    ),
    required: readStringArray(
      eventProperties.required,
      `rule v${rule.version}.required`,
    ),
  };
};

const buildVersionDefinition = (
  rule: ContractRule,
  propertyAllowlist: readonly string[],
): VersionDefinition => {
  const { properties, required } = readRuleProperties(rule);
  const omittedRequiredProperties = required.filter(
    (property) => !propertyAllowlist.includes(property),
  );

  if (omittedRequiredProperties.length > 0) {
    throw new Error(
      `Pilot allowlist omits required v${rule.version} properties: ${omittedRequiredProperties.join(', ')}`,
    );
  }

  const definitions = [...propertyAllowlist]
    .sort()
    .map((name): PropertyDefinition => {
      const path = `rule v${rule.version}.properties.${name}`;
      const schema = readObject(properties[name], path);

      return {
        description: readDescription(schema, path),
        name,
        required: required.includes(name),
        type: toTypeScriptType(schema, path),
      };
    });

  return {
    properties: definitions,
    version: rule.version,
  };
};

const escapeComment = (value: string): string =>
  value.replaceAll('*/', '*\\/').replaceAll('\n', ' ');

const renderProperty = (property: PropertyDefinition): string => {
  const comment = property.description
    ? `  /** ${escapeComment(property.description)} */\n`
    : '';
  const optional = property.required ? '' : '?';

  return `${comment}  readonly ${property.name}${optional}: ${property.type};`;
};

const renderInterface = (
  exportName: string,
  definition: VersionDefinition,
): string => `export interface ${exportName}V${definition.version}Properties {
${definition.properties.map(renderProperty).join('\n')}
}`;

const renderVersion = (
  exportName: string,
  definition: VersionDefinition,
): string => `    v${definition.version}: createEventVersion<
      ${exportName}V${definition.version}Properties
    >(transport, EVENT_NAME, ${definition.version}),`;

const renderValidProperties = (definition: VersionDefinition): string =>
  definition.properties
    .filter((property) => property.required)
    .map((property) => {
      const firstType = property.type.split(' | ')[0];
      const value =
        firstType.startsWith('"') ||
        /^-?\d+(?:\.\d+)?$/u.test(firstType) ||
        firstType === 'true' ||
        firstType === 'false'
          ? firstType
          : property.type === 'number'
          ? '1'
          : property.type === 'boolean'
            ? 'true'
            : "'value'";

      return `    ${property.name}: ${value},`;
    })
    .join('\n');

const renderTypeTests = (
  pilot: EventPilotDefinition,
  versions: readonly VersionDefinition[],
): string => {
  const [firstVersion, secondVersion] = versions;

  if (!firstVersion || !secondVersion) {
    throw new Error('The pilot type test requires two event versions');
  }

  return `import { create${pilot.exportName} } from './${pilot.exportName}';

declare const transport: Parameters<typeof create${pilot.exportName}>[0];

const event = create${pilot.exportName}(transport);

event.v${firstVersion.version}.track({
${renderValidProperties(firstVersion)}
});

event.v${secondVersion.version}.track({
${renderValidProperties(secondVersion)}
});

// @ts-expect-error source is required
event.v${secondVersion.version}.track({
  amount_selection_method: 'custom_input',
  amount_usd: 1,
});

event.v${secondVersion.version}.track({
${renderValidProperties(secondVersion)}
  // @ts-expect-error unknown properties are rejected
  unknown_property: true,
});

event.v${firstVersion.version}.track({
${renderValidProperties(firstVersion).replace(
  /amount_selection_method: [^,]+,/u,
  "// @ts-expect-error slider is not a v1 amount selection method\n    amount_selection_method: 'slider',",
)}
});

// @ts-expect-error only generated versions are available
event.v3.track({});
`;
};

/**
 * Generate a transport-neutral, versioned TypeScript analytics facade.
 *
 * @param rules - Verified rules selected from the deployed contract.
 * @param pilot - Reviewed caller-property boundary for the pilot event.
 * @returns Generated implementation and compile-time conformance tests.
 */
export const generateEventPilot = (
  rules: readonly ContractRule[],
  pilot: EventPilotDefinition,
): GeneratedEventFiles => {
  const versions = pilot.versions.map((versionDefinition) => {
    const rule = rules.find(
      (candidate) =>
        candidate.key === pilot.eventName &&
        candidate.type === 'TRACK' &&
        candidate.version === versionDefinition.version,
    );

    if (!rule) {
      throw new Error(
        `Missing verified rule for '${pilot.eventName}' v${versionDefinition.version}`,
      );
    }

    return buildVersionDefinition(rule, versionDefinition.properties);
  });

  const source = `/**
 * GENERATED FILE — DO NOT EDIT.
 *
 * Generated from the verified deployed Mobile analytics contract.
 */

export interface AnalyticsEventContext {
  readonly protocols: {
    readonly event_version: number;
  };
}

export interface AnalyticsEventTransport {
  track(
    eventName: string,
    properties: object,
    context: AnalyticsEventContext,
  ): void;
}

type ExactProperties<Expected, Actual extends Expected> = Actual &
  Record<Exclude<keyof Actual, keyof Expected>, never>;

interface EventVersion<Properties> {
  track<Actual extends Properties>(
    properties: ExactProperties<Properties, Actual>,
  ): void;
}

const createEventVersion = <Properties>(
  transport: AnalyticsEventTransport,
  eventName: string,
  version: number,
): EventVersion<Properties> => ({
  track: (properties) => {
    transport.track(eventName, properties as object, {
      protocols: {
        event_version: version,
      },
    });
  },
});

const EVENT_NAME = ${JSON.stringify(pilot.eventName)};

${versions.map((definition) => renderInterface(pilot.exportName, definition)).join('\n\n')}

export const create${pilot.exportName} = (
  transport: AnalyticsEventTransport,
) => ({
${versions.map((definition) => renderVersion(pilot.exportName, definition)).join('\n')}
});
`;

  return {
    source,
    typeTests: renderTypeTests(pilot, versions),
  };
};
