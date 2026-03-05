// REMOVED external import: import type { Readonly } from "util/types";

/**
 * Represents the type of change detected during JSON comparison.
 * @enum {string}
 */
export enum ChangeType {
  /** A new value was added */
  Added = "added",
  /** An existing value was removed */
  Removed = "removed",
  /** An existing value was modified */
  Changed = "changed",
}

/**
 * Represents a single change between two JSON values.
 * Uses a discriminated union for type-safe handling.
 */
export type Change =
  | AddedChange
  | RemovedChange
  | ChangedChange;

/**
 * Change representing a newly added value.
 */
export interface AddedChange {
  readonly path: readonly string[];
  readonly type: ChangeType.Added;
  readonly newValue: JsonValue;
}

/**
 * Change representing a removed value.
 */
export interface RemovedChange {
  readonly path: readonly string[];
  readonly type: ChangeType.Removed;
  readonly oldValue: JsonValue;
}

/**
 * Change representing a modified value.
 */
export interface ChangedChange {
  readonly path: readonly string[];
  readonly type: ChangeType.Changed;
  readonly oldValue: JsonValue;
  readonly newValue: JsonValue;
}

/**
 * Recursive type representing all valid JSON values.
 * Includes primitives, arrays, and objects.
 */
export type JsonValue =
  | JsonPrimitive
  | JsonArray
  | JsonObject;

/**
 * JSON primitive types.
 */
export type JsonPrimitive =
  | string
  | number
  | boolean
  | null;

/**
 * JSON array type - array of JsonValue.
 */
export interface JsonArray extends ReadonlyArray<JsonValue> {}

/**
 * JSON object type - record with string keys and JsonValue values.
 */
export interface JsonObject extends Readonly<Record<string, JsonValue>> {}

/**
 * Configuration options for the diff operation.
 */
export interface DiffOptions {
  /**
   * Property name to use as identity key when comparing array elements.
   * When specified, array elements are matched by this key instead of position.
   * @example "id" for arrays of objects with an "id" property
   */
  readonly arrayIdentityKey?: string;

  /**
   * When true, treats numbers as strings for comparison (strict equality).
   * Useful when numeric precision matters.
   * @default false
   */
  readonly strict?: boolean;

  /**
   * Property names to exclude from comparison.
   * Supports nested paths using dot notation.
   * @example ["password", "metadata.createdAt"]
   */
  readonly excludePaths?: readonly string[];

  /**
   * When true, compares arrays by index instead of trying to match elements.
   * @default false
   */
  readonly compareArraysByIndex?: boolean;
}

/**
 * Configuration options for applying patches.
 */
export interface PatchOptions {
  /**
   * When true, throws an error if a path in the patch doesn't exist.
   * @default true
   */
  readonly strict?: boolean;

  /**
   * When true, creates missing parent objects/arrays in the path.
   * @default false
   */
  readonly createMissingPaths?: boolean;
}

/**
 * Result of a diff operation containing all detected changes.
 */
export interface DiffResult {
  /** List of all changes detected */
  readonly changes: readonly Change[];
  /** True if any differences were found */
  readonly hasChanges: boolean;
  /** Number of additions */
  readonly addedCount: number;
  /** Number of removals */
  readonly removedCount: number;
  /** Number of modifications */
  readonly changedCount: number;
}

/**
 * A patch operation that can be applied to transform JSON.
 */
export type Patch =
  | AddPatch
  | RemovePatch
  | ReplacePatch;

/**
 * Patch operation to add a value at a path.
 */
export interface AddPatch {
  readonly path: readonly string[];
  readonly op: "add";
  readonly value: JsonValue;
}

/**
 * Patch operation to remove a value at a path.
 */
export interface RemovePatch {
  readonly path: readonly string[];
  readonly op: "remove";
}

/**
 * Patch operation to replace a value at a path.
 */
export interface ReplacePatch {
  readonly path: readonly string[];
  readonly op: "replace";
  readonly value: JsonValue;
}