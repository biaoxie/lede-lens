function describePath(path) {
  return path || "$";
}

function resolveRef(rootSchema, ref) {
  if (!ref.startsWith("#/")) {
    throw new Error(`Unsupported schema reference: ${ref}`);
  }

  return ref
    .slice(2)
    .split("/")
    .map((part) => part.replaceAll("~1", "/").replaceAll("~0", "~"))
    .reduce((value, key) => value?.[key], rootSchema);
}

function matchesType(value, type) {
  switch (type) {
    case "array":
      return Array.isArray(value);
    case "integer":
      return Number.isInteger(value);
    case "null":
      return value === null;
    case "number":
      return typeof value === "number" && Number.isFinite(value);
    case "object":
      return value !== null && typeof value === "object" && !Array.isArray(value);
    default:
      return typeof value === type;
  }
}

function validateNode(value, schema, rootSchema, path, errors) {
  if (schema.$ref) {
    const resolved = resolveRef(rootSchema, schema.$ref);
    if (!resolved) {
      errors.push(`${describePath(path)} uses an unresolved schema reference.`);
      return;
    }
    validateNode(value, resolved, rootSchema, path, errors);
    return;
  }

  if (Object.hasOwn(schema, "const") && value !== schema.const) {
    errors.push(`${describePath(path)} must equal ${JSON.stringify(schema.const)}.`);
  }

  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`${describePath(path)} must be one of: ${schema.enum.join(", ")}.`);
  }

  const allowedTypes = Array.isArray(schema.type) ? schema.type : [schema.type];
  if (schema.type && !allowedTypes.some((type) => matchesType(value, type))) {
    errors.push(`${describePath(path)} has an invalid type.`);
    return;
  }

  if (typeof value === "string") {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push(`${describePath(path)} is shorter than ${schema.minLength} character(s).`);
    }
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
      errors.push(`${describePath(path)} does not match ${schema.pattern}.`);
    }
  }

  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push(`${describePath(path)} must contain at least ${schema.minItems} item(s).`);
    }
    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      errors.push(`${describePath(path)} must contain no more than ${schema.maxItems} item(s).`);
    }
    value.forEach((item, index) => {
      if (schema.items) {
        validateNode(item, schema.items, rootSchema, `${path}[${index}]`, errors);
      }
    });
  }

  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    const properties = schema.properties || {};
    for (const requiredKey of schema.required || []) {
      if (!Object.hasOwn(value, requiredKey)) {
        errors.push(`${describePath(path)} is missing required field ${requiredKey}.`);
      }
    }

    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        if (!Object.hasOwn(properties, key)) {
          errors.push(`${describePath(path)} contains undeclared field ${key}.`);
        }
      }
    }

    for (const [key, propertySchema] of Object.entries(properties)) {
      if (Object.hasOwn(value, key)) {
        validateNode(value[key], propertySchema, rootSchema, path ? `${path}.${key}` : key, errors);
      }
    }
  }
}

export function validateJsonSchema(value, schema) {
  const errors = [];
  validateNode(value, schema, schema, "$", errors);
  return { valid: errors.length === 0, errors };
}

export function validateAnalysisResult(result, schema, paragraphIds = []) {
  const validation = validateJsonSchema(result, schema);
  const errors = [...validation.errors];
  if (errors.length) return { valid: false, errors };

  const knownParagraphs = new Set(paragraphIds);
  const referencedParagraphs = [
    ...Object.values(result.article_metrics).flatMap((metric) => metric.paragraph_ids),
    ...result.issues.flatMap((issue) => issue.paragraph_ids),
  ];
  for (const paragraphId of referencedParagraphs) {
    if (!knownParagraphs.has(paragraphId)) {
      errors.push(`Unknown paragraph reference: ${paragraphId}.`);
    }
  }

  return { valid: errors.length === 0, errors };
}
