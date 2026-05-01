// Lightweight JSON Schema validator
// Supports draft-07 and 2020-12 for the most commonly used keywords.
// Not a full spec implementation — see UNSUPPORTED list at bottom.

export interface ValidationError {
  path: string; // JSON pointer style: /users/0/email
  schemaPath: string; // pointer into the schema where the failing rule lives
  keyword: string; // 'type' / 'required' / 'pattern' etc.
  message: string; // human-readable
  expected?: any;
  actual?: any;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  unsupportedKeywords: string[]; // keywords found in schema we did not validate
}

const SUPPORTED_KEYWORDS = new Set([
  '$schema',
  '$ref',
  '$defs',
  'definitions',
  'title',
  'description',
  'default',
  'examples',
  'type',
  'enum',
  'const',
  'properties',
  'required',
  'additionalProperties',
  'patternProperties',
  'items',
  'prefixItems',
  'minItems',
  'maxItems',
  'uniqueItems',
  'minimum',
  'maximum',
  'exclusiveMinimum',
  'exclusiveMaximum',
  'multipleOf',
  'minLength',
  'maxLength',
  'pattern',
  'format',
  'oneOf',
  'anyOf',
  'allOf',
  'not',
  'minProperties',
  'maxProperties',
  'nullable',
]);

const FORMAT_VALIDATORS: Record<string, (value: string) => boolean> = {
  email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
  uri: (v) => /^[a-zA-Z][a-zA-Z0-9+.\-]*:[^\s]*$/.test(v),
  url: (v) => /^https?:\/\/[^\s]+$/.test(v),
  date: (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v)),
  'date-time': (v) => !isNaN(Date.parse(v)),
  time: (v) => /^\d{2}:\d{2}:\d{2}/.test(v),
  uuid: (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v),
  ipv4: (v) => /^(\d{1,3}\.){3}\d{1,3}$/.test(v) && v.split('.').every((p) => parseInt(p, 10) <= 255),
  ipv6: (v) => /^[0-9a-f:]+$/i.test(v) && v.includes(':'),
  hostname: (v) =>
    /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(v),
};

interface ValidationContext {
  rootSchema: any;
  errors: ValidationError[];
  unsupported: Set<string>;
}

function jsonType(value: any): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'number';
  return typeof value;
}

function typeMatches(actual: string, expected: string | string[]): boolean {
  const types = Array.isArray(expected) ? expected : [expected];
  for (const t of types) {
    if (t === 'number' && actual === 'integer') return true;
    if (t === actual) return true;
  }
  return false;
}

function resolveRef(ref: string, rootSchema: any): any | null {
  // Only support local refs starting with #/
  if (!ref.startsWith('#/')) return null;
  const path = ref.substring(2).split('/');
  let cursor: any = rootSchema;
  for (const segment of path) {
    if (cursor === null || cursor === undefined) return null;
    cursor = cursor[decodeURIComponent(segment.replace(/~1/g, '/').replace(/~0/g, '~'))];
  }
  return cursor;
}

function pushError(
  ctx: ValidationContext,
  path: string,
  schemaPath: string,
  keyword: string,
  message: string,
  expected?: any,
  actual?: any
) {
  ctx.errors.push({ path, schemaPath, keyword, message, expected, actual });
}

function checkUnsupportedKeywords(schema: any, ctx: ValidationContext) {
  if (typeof schema !== 'object' || schema === null) return;
  for (const key of Object.keys(schema)) {
    if (!SUPPORTED_KEYWORDS.has(key) && !key.startsWith('x-')) {
      ctx.unsupported.add(key);
    }
  }
}

function validateValue(value: any, schema: any, path: string, schemaPath: string, ctx: ValidationContext): void {
  if (schema === true) return; // accept anything
  if (schema === false) {
    pushError(ctx, path, schemaPath, 'schema', 'Schema is `false`; nothing is valid here.');
    return;
  }
  if (typeof schema !== 'object' || schema === null) return;

  checkUnsupportedKeywords(schema, ctx);

  // $ref resolution
  if (schema.$ref) {
    const resolved = resolveRef(schema.$ref, ctx.rootSchema);
    if (!resolved) {
      pushError(ctx, path, schemaPath + '/$ref', '$ref', `Cannot resolve reference: ${schema.$ref}`);
      return;
    }
    validateValue(value, resolved, path, schema.$ref, ctx);
    return;
  }

  // const
  if ('const' in schema) {
    if (JSON.stringify(value) !== JSON.stringify(schema.const)) {
      pushError(ctx, path, schemaPath + '/const', 'const', `Value must equal const`, schema.const, value);
    }
  }

  // enum
  if (Array.isArray(schema.enum)) {
    const matches = schema.enum.some((e: any) => JSON.stringify(e) === JSON.stringify(value));
    if (!matches) {
      pushError(
        ctx,
        path,
        schemaPath + '/enum',
        'enum',
        `Value must be one of: ${schema.enum.map((v: any) => JSON.stringify(v)).join(', ')}`,
        schema.enum,
        value
      );
    }
  }

  // type
  if (schema.type !== undefined) {
    const actualType = jsonType(value);
    if (!typeMatches(actualType, schema.type)) {
      pushError(
        ctx,
        path,
        schemaPath + '/type',
        'type',
        `Expected type ${Array.isArray(schema.type) ? schema.type.join(' or ') : schema.type}, got ${actualType}`,
        schema.type,
        actualType
      );
      return; // don't run further checks if type is wrong
    }
  }

  // nullable (OpenAPI extension)
  if (schema.nullable === true && value === null) {
    return; // explicit null is allowed
  }

  // String constraints
  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      pushError(
        ctx,
        path,
        schemaPath + '/minLength',
        'minLength',
        `String shorter than minLength (${schema.minLength})`,
        schema.minLength,
        value.length
      );
    }
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      pushError(
        ctx,
        path,
        schemaPath + '/maxLength',
        'maxLength',
        `String longer than maxLength (${schema.maxLength})`,
        schema.maxLength,
        value.length
      );
    }
    if (schema.pattern) {
      try {
        const re = new RegExp(schema.pattern);
        if (!re.test(value)) {
          pushError(ctx, path, schemaPath + '/pattern', 'pattern', `String does not match pattern: ${schema.pattern}`, schema.pattern, value);
        }
      } catch {
        pushError(ctx, path, schemaPath + '/pattern', 'pattern', `Invalid regex pattern: ${schema.pattern}`);
      }
    }
    if (schema.format && FORMAT_VALIDATORS[schema.format]) {
      if (!FORMAT_VALIDATORS[schema.format](value)) {
        pushError(ctx, path, schemaPath + '/format', 'format', `String is not a valid ${schema.format}`, schema.format, value);
      }
    }
  }

  // Number constraints
  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) {
      pushError(ctx, path, schemaPath + '/minimum', 'minimum', `Value less than minimum (${schema.minimum})`, schema.minimum, value);
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      pushError(ctx, path, schemaPath + '/maximum', 'maximum', `Value greater than maximum (${schema.maximum})`, schema.maximum, value);
    }
    if (schema.exclusiveMinimum !== undefined) {
      if (typeof schema.exclusiveMinimum === 'number') {
        if (value <= schema.exclusiveMinimum) {
          pushError(
            ctx,
            path,
            schemaPath + '/exclusiveMinimum',
            'exclusiveMinimum',
            `Value not greater than exclusiveMinimum (${schema.exclusiveMinimum})`,
            schema.exclusiveMinimum,
            value
          );
        }
      } else if (schema.exclusiveMinimum === true && schema.minimum !== undefined && value <= schema.minimum) {
        pushError(
          ctx,
          path,
          schemaPath + '/exclusiveMinimum',
          'exclusiveMinimum',
          `Value not greater than minimum (${schema.minimum})`,
          schema.minimum,
          value
        );
      }
    }
    if (schema.exclusiveMaximum !== undefined) {
      if (typeof schema.exclusiveMaximum === 'number') {
        if (value >= schema.exclusiveMaximum) {
          pushError(
            ctx,
            path,
            schemaPath + '/exclusiveMaximum',
            'exclusiveMaximum',
            `Value not less than exclusiveMaximum (${schema.exclusiveMaximum})`,
            schema.exclusiveMaximum,
            value
          );
        }
      } else if (schema.exclusiveMaximum === true && schema.maximum !== undefined && value >= schema.maximum) {
        pushError(
          ctx,
          path,
          schemaPath + '/exclusiveMaximum',
          'exclusiveMaximum',
          `Value not less than maximum (${schema.maximum})`,
          schema.maximum,
          value
        );
      }
    }
    if (schema.multipleOf !== undefined && schema.multipleOf > 0) {
      const div = value / schema.multipleOf;
      if (Math.abs(div - Math.round(div)) > 1e-10) {
        pushError(ctx, path, schemaPath + '/multipleOf', 'multipleOf', `Value not a multiple of ${schema.multipleOf}`, schema.multipleOf, value);
      }
    }
  }

  // Array constraints
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      pushError(ctx, path, schemaPath + '/minItems', 'minItems', `Array shorter than minItems (${schema.minItems})`, schema.minItems, value.length);
    }
    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      pushError(ctx, path, schemaPath + '/maxItems', 'maxItems', `Array longer than maxItems (${schema.maxItems})`, schema.maxItems, value.length);
    }
    if (schema.uniqueItems === true) {
      const seen = new Set<string>();
      for (let i = 0; i < value.length; i++) {
        const key = JSON.stringify(value[i]);
        if (seen.has(key)) {
          pushError(ctx, path + '/' + i, schemaPath + '/uniqueItems', 'uniqueItems', `Duplicate item in array (uniqueItems is true)`);
          break;
        }
        seen.add(key);
      }
    }
    // prefixItems (2020-12) — items at specific positions
    if (Array.isArray(schema.prefixItems)) {
      for (let i = 0; i < schema.prefixItems.length && i < value.length; i++) {
        validateValue(value[i], schema.prefixItems[i], path + '/' + i, schemaPath + '/prefixItems/' + i, ctx);
      }
    }
    // items
    if (schema.items !== undefined) {
      if (Array.isArray(schema.items)) {
        // draft-07 tuple validation
        for (let i = 0; i < schema.items.length && i < value.length; i++) {
          validateValue(value[i], schema.items[i], path + '/' + i, schemaPath + '/items/' + i, ctx);
        }
      } else {
        const startIdx = Array.isArray(schema.prefixItems) ? schema.prefixItems.length : 0;
        for (let i = startIdx; i < value.length; i++) {
          validateValue(value[i], schema.items, path + '/' + i, schemaPath + '/items', ctx);
        }
      }
    }
  }

  // Object constraints
  if (jsonType(value) === 'object') {
    if (schema.minProperties !== undefined && Object.keys(value).length < schema.minProperties) {
      pushError(
        ctx,
        path,
        schemaPath + '/minProperties',
        'minProperties',
        `Object has fewer properties than minProperties (${schema.minProperties})`,
        schema.minProperties,
        Object.keys(value).length
      );
    }
    if (schema.maxProperties !== undefined && Object.keys(value).length > schema.maxProperties) {
      pushError(
        ctx,
        path,
        schemaPath + '/maxProperties',
        'maxProperties',
        `Object has more properties than maxProperties (${schema.maxProperties})`,
        schema.maxProperties,
        Object.keys(value).length
      );
    }
    // required
    if (Array.isArray(schema.required)) {
      for (const requiredKey of schema.required) {
        if (!(requiredKey in value)) {
          pushError(ctx, path, schemaPath + '/required', 'required', `Missing required property: "${requiredKey}"`, requiredKey, undefined);
        }
      }
    }
    // properties
    if (schema.properties && typeof schema.properties === 'object') {
      for (const propName of Object.keys(schema.properties)) {
        if (propName in value) {
          validateValue(value[propName], schema.properties[propName], path + '/' + propName, schemaPath + '/properties/' + propName, ctx);
        }
      }
    }
    // patternProperties
    if (schema.patternProperties && typeof schema.patternProperties === 'object') {
      for (const pattern of Object.keys(schema.patternProperties)) {
        try {
          const re = new RegExp(pattern);
          for (const key of Object.keys(value)) {
            if (re.test(key)) {
              validateValue(value[key], schema.patternProperties[pattern], path + '/' + key, schemaPath + '/patternProperties/' + pattern, ctx);
            }
          }
        } catch {
          /* ignore bad regex */
        }
      }
    }
    // additionalProperties
    if (schema.additionalProperties === false || (typeof schema.additionalProperties === 'object' && schema.additionalProperties !== null)) {
      const knownKeys = new Set(schema.properties ? Object.keys(schema.properties) : []);
      const patternKeys = schema.patternProperties
        ? Object.keys(schema.patternProperties)
            .map((p) => {
              try {
                return new RegExp(p);
              } catch {
                return null;
              }
            })
            .filter((r): r is RegExp => r !== null)
        : [];
      for (const key of Object.keys(value)) {
        if (knownKeys.has(key)) continue;
        if (patternKeys.some((re) => re.test(key))) continue;
        if (schema.additionalProperties === false) {
          pushError(ctx, path + '/' + key, schemaPath + '/additionalProperties', 'additionalProperties', `Property "${key}" is not allowed (additionalProperties is false)`);
        } else {
          validateValue(value[key], schema.additionalProperties, path + '/' + key, schemaPath + '/additionalProperties', ctx);
        }
      }
    }
  }

  // oneOf
  if (Array.isArray(schema.oneOf)) {
    let matchCount = 0;
    for (let i = 0; i < schema.oneOf.length; i++) {
      const subCtx: ValidationContext = { rootSchema: ctx.rootSchema, errors: [], unsupported: ctx.unsupported };
      validateValue(value, schema.oneOf[i], path, schemaPath + '/oneOf/' + i, subCtx);
      if (subCtx.errors.length === 0) matchCount++;
    }
    if (matchCount === 0) {
      pushError(ctx, path, schemaPath + '/oneOf', 'oneOf', `Value does not match any of the oneOf branches`);
    } else if (matchCount > 1) {
      pushError(ctx, path, schemaPath + '/oneOf', 'oneOf', `Value matches more than one oneOf branch (${matchCount})`);
    }
  }

  // anyOf
  if (Array.isArray(schema.anyOf)) {
    let matched = false;
    for (let i = 0; i < schema.anyOf.length && !matched; i++) {
      const subCtx: ValidationContext = { rootSchema: ctx.rootSchema, errors: [], unsupported: ctx.unsupported };
      validateValue(value, schema.anyOf[i], path, schemaPath + '/anyOf/' + i, subCtx);
      if (subCtx.errors.length === 0) matched = true;
    }
    if (!matched) {
      pushError(ctx, path, schemaPath + '/anyOf', 'anyOf', `Value does not match any of the anyOf branches`);
    }
  }

  // allOf
  if (Array.isArray(schema.allOf)) {
    for (let i = 0; i < schema.allOf.length; i++) {
      validateValue(value, schema.allOf[i], path, schemaPath + '/allOf/' + i, ctx);
    }
  }

  // not
  if (schema.not !== undefined) {
    const subCtx: ValidationContext = { rootSchema: ctx.rootSchema, errors: [], unsupported: ctx.unsupported };
    validateValue(value, schema.not, path, schemaPath + '/not', subCtx);
    if (subCtx.errors.length === 0) {
      pushError(ctx, path, schemaPath + '/not', 'not', `Value matches the "not" schema (it should not)`);
    }
  }
}

export function validateAgainstSchema(value: any, schema: any): ValidationResult {
  const ctx: ValidationContext = {
    rootSchema: schema,
    errors: [],
    unsupported: new Set(),
  };
  try {
    validateValue(value, schema, '', '', ctx);
  } catch (err: any) {
    ctx.errors.push({
      path: '',
      schemaPath: '',
      keyword: 'internal',
      message: `Validator error: ${err?.message || String(err)}`,
    });
  }
  return {
    valid: ctx.errors.length === 0,
    errors: ctx.errors,
    unsupportedKeywords: Array.from(ctx.unsupported),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Schema-from-sample inference
// Infers a starter JSON Schema from an example JSON value.
// The output is a useful baseline; users will typically tighten it manually.
// ─────────────────────────────────────────────────────────────────────────────

function inferSchema(value: any): any {
  if (value === null) return { type: 'null' };
  if (typeof value === 'boolean') return { type: 'boolean' };
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { type: 'integer' } : { type: 'number' };
  }
  if (typeof value === 'string') {
    // Try to detect common formats
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return { type: 'string', format: 'email' };
    if (/^https?:\/\//.test(value)) return { type: 'string', format: 'uri' };
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return { type: 'string', format: 'date' };
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return { type: 'string', format: 'date-time' };
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) return { type: 'string', format: 'uuid' };
    return { type: 'string' };
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return { type: 'array' };
    // Merge schemas from all items to infer a union-ish item schema
    const itemSchemas = value.map(inferSchema);
    const first = JSON.stringify(itemSchemas[0]);
    const allSame = itemSchemas.every((s) => JSON.stringify(s) === first);
    if (allSame) return { type: 'array', items: itemSchemas[0] };
    // For mixed arrays, pick the union of types
    return { type: 'array', items: { anyOf: itemSchemas } };
  }
  // Object
  const properties: Record<string, any> = {};
  const required: string[] = [];
  for (const key of Object.keys(value)) {
    properties[key] = inferSchema(value[key]);
    required.push(key);
  }
  return {
    type: 'object',
    properties,
    required,
  };
}

export function generateSchemaFromSample(parsed: any): any {
  const inferred = inferSchema(parsed);
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    title: 'Generated Schema',
    description: 'Generated by DoItSwift JSON Formatter from a sample. Tighten manually as needed.',
    ...inferred,
  };
}

// UNSUPPORTED (non-exhaustive): $dynamicRef, if/then/else, dependentRequired, contains, unevaluatedProperties, unevaluatedItems, $vocabulary, etc.
