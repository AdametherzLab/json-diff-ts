import * as path from "path";
import type {
  Change,
  ChangeType,
  JsonValue,
  Patch,
  PatchOptions,
} from "./types.js";

/**
 * Parse a string path into an array of path segments.
 * Supports both dot notation (a.b.c) and bracket notation (a[0].b).
 * @param pathString - The path string to parse
 * @returns Array of path segments
 * @example
 * parsePath("a.b.c") // ["a", "b", "c"]
 * parsePath("a[0].b") // ["a", "0", "b"]
 * parsePath('a["0"].b') // ["a", "0", "b"]
 */
export function parsePath(pathString: string): readonly string[] {
  if (pathString === "") {
    return [];
  }

  const segments: string[] = [];
  let current = "";
  let inBracket = false;

  for (let i = 0; i < pathString.length; i++) {
    const char = pathString[i];

    if (inBracket) {
      if (char === "]") {
        inBracket = false;
        if (current.length > 0) {
          segments.push(current);
          current = "";
        }
      } else {
        current += char;
      }
    } else {
      if (char === ".") {
        if (current.length > 0) {
          segments.push(current);
          current = "";
        }
      } else if (char === "[") {
        if (current.length > 0) {
          segments.push(current);
          current = "";
        }
        inBracket = true;
      } else {
        current += char;
      }
    }
  }

  if (current.length > 0) {
    segments.push(current);
  }

  return segments;
}

/**
 * Build a path string from an array of segments.
 * @param segments - Array of path segments
 * @returns Dot/bracket notation path string
 * @example
 * buildPath(["a", "b", "c"]) // "a.b.c"
 * buildPath(["a", "0", "b"]) // "a[0].b"
 */
export function buildPath(segments: readonly string[]): string {
  if (segments.length === 0) {
    return "";
  }

  return segments
    .map((segment, index) => {
      if (index === 0) {
        return segment;
      }
      if (/^\d+$/.test(segment)) {
        return `[${segment}]`;
      }
      if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(segment)) {
        return `.${segment}`;
      }
      return `["${segment}"]`;
    })
    .join("");
}

/**
 * Deep equality comparison between two JsonValues.
 * @param a - First value to compare
 * @param b - Second value to compare
 * @returns True if values are structurally equal
 * @example
 * deepEqual({ a: 1 }, { a: 1 }) // true
 * deepEqual([1, 2], [1, 2]) // true
 * deepEqual({ a: 1 }, { a: 2 }) // false
 */
export function deepEqual(a: JsonValue, b: JsonValue): boolean {
  if (a === b) {
    return true;
  }

  if (a === null || b === null) {
    return a === b;
  }

  if (typeof a !== typeof b) {
    return false;
  }

  if (typeof a === "object") {
    const aIsArray = Array.isArray(a);
    const bIsArray = Array.isArray(b);

    if (aIsArray !== bIsArray) {
      return false;
    }

    if (aIsArray) {
      const aArr = a as readonly JsonValue[];
      const bArr = b as readonly JsonValue[];
      if (aArr.length !== bArr.length) {
        return false;
      }
      for (let i = 0; i < aArr.length; i++) {
        if (!deepEqual(aArr[i], bArr[i])) {
          return false;
        }
      }
      return true;
    }

    const aObj = a as Record<string, JsonValue>;
    const bObj = b as Record<string, JsonValue>;
    const aKeys = Object.keys(aObj);
    const bKeys = Object.keys(bObj);

    if (aKeys.length !== bKeys.length) {
      return false;
    }

    for (const key of aKeys) {
      if (!Object.prototype.hasOwnProperty.call(bObj, key)) {
        return false;
      }
      if (!deepEqual(aObj[key], bObj[key])) {
        return false;
      }
    }

    return true;
  }

  return a === b;
}

/**
 * Get a value at a given path within a JsonValue.
 * @param root - The root JsonValue to navigate
 * @param pathSegments - Array of path segments
 * @returns The value at the path, or undefined if not found
 */
function getAtPath(
  root: JsonValue,
  pathSegments: readonly string[]
): JsonValue | undefined {
  let current: JsonValue = root;

  for (const segment of pathSegments) {
    if (current === null || typeof current !== "object") {
      return undefined;
    }

    if (Array.isArray(current)) {
      const index = parseInt(segment, 10);
      if (isNaN(index) || index < 0 || index >= current.length) {
        return undefined;
      }
      current = current[index];
    } else {
      const obj = current as Record<string, JsonValue>;
      if (!(segment in obj)) {
        return undefined;
      }
      current = obj[segment];
    }
  }

  return current;
}

/**
 * Set a value at a given path within a JsonValue.
 * Creates missing parent objects/arrays if option is enabled.
 * @param root - The root JsonValue to modify
 * @param pathSegments - Array of path segments
 * @param value - Value to set
 * @param createMissing - Whether to create missing parent paths
 * @throws {Error} If path cannot be resolved and createMissing is false
 */
function setAtPath(
  root: JsonValue,
  pathSegments: readonly string[],
  value: JsonValue,
  createMissing: boolean
): void {
  if (pathSegments.length === 0) {
    return;
  }

  let current: JsonValue = root;

  for (let i = 0; i < pathSegments.length - 1; i++) {
    const segment = pathSegments[i];

    if (current === null || typeof current !== "object") {
      if (createMissing) {
        const newObj: Record<string, JsonValue> = {};
        if (Array.isArray(current)) {
          const index = parseInt(segment, 10);
          current[index] = newObj as JsonValue;
        } else {
          (current as Record<string, JsonValue>)[segment] = newObj as JsonValue;
        }
        current = newObj;
      } else {
        throw new Error(`Cannot set path: parent is not an object at segment "${segment}"`);
      }
    } else if (Array.isArray(current)) {
      const index = parseInt(segment, 10);
      if (isNaN(index) || index < 0 || index >= current.length) {
        if (createMissing) {
          current[index] = {} as JsonValue;
          current = current[index];
        } else {
          throw new Error(`Cannot set path: array index ${index} out of bounds`);
        }
      } else {
        current = current[index];
      }
    } else {
      const obj = current as Record<string, JsonValue>;
      if (!(segment in obj) && createMissing) {
        obj[segment] = {} as JsonValue;
      }
      current = obj[segment];
    }
  }

  const lastSegment = pathSegments[pathSegments.length - 1];

  if (Array.isArray(current)) {
    const index = parseInt(lastSegment, 10);
    if (isNaN(index)) {
      throw new Error(`Invalid array index: ${lastSegment}`);
    }
    if (index < 0 || index > current.length) {
      if (createMissing) {
        current[index] = value;
      } else {
        throw new Error(`Cannot set path: array index ${index} out of bounds`);
      }
    } else {
      current[index] = value;
    }
  } else if (current !== null && typeof current === "object") {
    (current as Record<string, JsonValue>)[lastSegment] = value;
  } else {
    throw new Error(`Cannot set value at path: final segment "${lastSegment}" is not an object`);
  }
}

/**
 * Delete a value at a given path within a JsonValue.
 * @param root - The root JsonValue to modify
 * @param pathSegments - Array of path segments
 * @throws {Error} If path doesn't exist
 */
function deleteAtPath(root: JsonValue, pathSegments: readonly string[]): void {
  if (pathSegments.length === 0) {
    return;
  }

  const parentPath = pathSegments.slice(0, -1);
  const lastSegment = pathSegments[pathSegments.length - 1];
  const parent = getAtPath(root, parentPath);

  if (parent === undefined) {
    throw new Error(`Cannot delete: path does not exist`);
  }

  if (Array.isArray(parent)) {
    const index = parseInt(lastSegment, 10);
    if (isNaN(index) || index < 0 || index >= parent.length) {
      throw new Error(`Cannot delete: array index ${index} out of bounds`);
    }
    parent.splice(index, 1);
  } else if (parent !== null && typeof parent === "object") {
    if (!(lastSegment in (parent as Record<string, JsonValue>))) {
      throw new Error(`Cannot delete: property "${lastSegment}" does not exist`);
    }
    delete (parent as Record<string, JsonValue>)[lastSegment];
  } else {
    throw new Error(`Cannot delete: parent is not an object`);
  }
}

/**
 * Apply a patch to a JsonValue.
 * @param value - The JsonValue to patch
 * @param patches - Array of patches to apply
 * @param options - Patch options
 * @returns Patched JsonValue (new copy if mutate is false, same reference if true)
 * @example
 * const original = { a: 1 };
 * const patched = patch(original, [{ path: ["a"], op: "replace", value: 2 }]);
 * // original is unchanged, patched is { a: 2 }
 */
export function patch(
  value: JsonValue,
  patches: readonly Patch[],
  options?: PatchOptions
): JsonValue {
  const opts: Required<PatchOptions> = {
    strict: options?.strict ?? true,
    createMissingPaths: options?.createMissingPaths ?? false,
  };

  const result = JSON.parse(JSON.stringify(value)) as JsonValue;

  for (const p of patches) {
    let pathSegments = p.path;

    if (p.op === "add") {
      if (opts.strict) {
        const existing = getAtPath(result, pathSegments);
        if (existing !== undefined) {
          throw new Error(`Path already exists: ${buildPath(pathSegments)}`);
        }
      }
      setAtPath(result, pathSegments, p.value, opts.createMissingPaths);
    } else if (p.op === "remove") {
      if (opts.strict) {
        const existing = getAtPath(result, pathSegments);
        if (existing === undefined) {
          throw new Error(`Path does not exist: ${buildPath(pathSegments)}`);
        }
      }
      deleteAtPath(result, pathSegments);
    } else if (p.op === "replace") {
      if (opts.strict) {
        const existing = getAtPath(result, pathSegments);
        if (existing === undefined) {
          throw new Error(`Path does not exist: ${buildPath(pathSegments)}`);
        }
      }
      setAtPath(result, pathSegments, p.value, opts.createMissingPaths);
    } else if (p.op === "move") {
      const fromValue = getAtPath(result, p.from);
      
      if (opts.strict && fromValue === undefined) {
        throw new Error(`From path does not exist: ${buildPath(p.from)}`);
      }

      deleteAtPath(result, p.from);
      setAtPath(result, pathSegments, fromValue!, opts.createMissingPaths);
    } else if (p.op === "copy") {
      const fromValue = getAtPath(result, p.from);

      if (opts.strict && fromValue === undefined) {
        throw new Error(`From path does not exist: ${buildPath(p.from)}`);
      }

      setAtPath(result, pathSegments, fromValue!, opts.createMissingPaths);
    } else if (p.op === "test") {
      const currentValue = getAtPath(result, pathSegments);

      if (opts.strict && currentValue === undefined) {
        throw new Error(`Test path does not exist: ${buildPath(pathSegments)}`);
      }

      if (!deepEqual(currentValue, p.value)) {
        throw new Error(`Test failed at path ${buildPath(pathSegments)}: Expected '${
          JSON.stringify(p.value)}' but found '${JSON.stringify(currentValue)}'`);
      }
    }
  }

  return result;
}

/**
 * Apply a list of Change objects to a JsonValue.
 * This is a convenience function that converts Change objects to Patch operations.
 * @param value - The JsonValue to patch
 * @param changes - Array of Change objects from diff
 * @param options - Patch options
 * @returns Patched JsonValue
 * @example
 * const original = { a: 1 };
 * const changes = diff(original, { a: 2 });
 * const patched = applyChanges(original, changes);
 */
export function applyChanges(
  value: JsonValue,
  changes: readonly Change[],
  options?: PatchOptions
): JsonValue {
  const patches: Patch[] = [];

  for (const change of changes) {
    if (change.type === ChangeType.Added) {
      patches.push({
        path: change.path,
        op: "add",
        value: change.newValue,
      });
    } else if (change.type === ChangeType.Removed) {
      patches.push({
        path: change.path,
        op: "remove",
      });
    } else if (change.type === ChangeType.Changed) {
      patches.push({
        path: change.path,
        op: "replace",
        value: change.newValue,
      });
    }
  }

  return patch(value, patches, options);
}
