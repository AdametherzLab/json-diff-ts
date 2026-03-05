# json-diff-ts

[![CI](https://github.com/AdametherzLab/json-diff-ts/actions/workflows/ci.yml/badge.svg)](https://github.com/AdametherzLab/json-diff-ts/actions) [![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org/) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

# 🔍 json-diff-ts

Compare, track, and patch JSON like a boss — TypeScript-first and zero dependencies.

## One-liner

A blazing-fast TypeScript utility that diffs any two JSON values, gives you a clean list of changes (added, removed, modified), and lets you apply those changes back — with full support for nested objects and arrays.

## Features

- ✅ **Deep diffing** — recursively compare nested objects and arrays
- ✅ **Type-safe** — full TypeScript support with strict mode
- ✅ **Patch application** — apply changes back to transform JSON
- ✅ **Array support** — diff arrays by index or identity keys
- ✅ **Zero deps** — no external packages, just pure TypeScript
- ✅ **ESM-first** — modern module system with CJS compatibility

## Installation

```bash
npm install @adametherzlab/json-diff-ts
```

Or with Bun:

```bash
bun add @adametherzlab/json-diff-ts
```

## Quick Start

```typescript
// REMOVED external import: import { diff, patch } from "@adametherzlab/json-diff-ts";

const before = { name: "Alice", age: 30, city: "NYC" };
const after = { name: "Alice", age: 31, city: "LA", country: "USA" };

const result = diff(before, after);
console.log(result.changes);
// [
//   { path: ["age"], type: "changed", oldValue: 30, newValue: 31 },
//   { path: ["city"], type: "changed", oldValue: "NYC", newValue: "LA" },
//   { path: ["country"], type: "added", newValue: "USA" }
// ]

// Apply changes to get the new state
const patched = patch(before, result.patches);
console.log(patched);
// { name: "Alice", age: 31, city: "LA", country: "USA" }
```

## API Reference

### Types

#### `ChangeType` (enum)
```typescript
enum ChangeType {
  Added = "added",
  Removed = "removed",
  Changed = "changed"
}
```

#### `Change` (type)
```typescript
type Change = AddedChange | RemovedChange | ChangedChange;
```

#### `AddedChange`
```typescript
interface AddedChange {
  readonly type: "added";
  readonly path: readonly string[];
  readonly newValue: JsonValue;
}
```

#### `RemovedChange`
```typescript
interface RemovedChange {
  readonly type: "removed";
  readonly path: readonly string[];
  readonly oldValue: JsonValue;
}
```

#### `ChangedChange`
```typescript
interface ChangedChange {
  readonly type: "changed";
  readonly path: readonly string[];
  readonly oldValue: JsonValue;
  readonly newValue: JsonValue;
}
```

#### `JsonValue` (type)
```typescript
type JsonValue = JsonPrimitive | JsonArray | JsonObject;
```

#### `JsonPrimitive` (type)
JSON primitive types.

```typescript
type JsonPrimitive = string | number | boolean | null;
```

#### `JsonArray` (interface)
JSON array type — array of JsonValue.

```typescript
interface JsonArray extends ReadonlyArray<JsonValue> {}
```

#### `JsonObject` (interface)
JSON object type — record with string keys and JsonValue values.

```typescript
interface JsonObject extends Readonly<Record<string, JsonValue>> {}
```

#### `DiffOptions` (interface)
```typescript
interface DiffOptions {
  /** Compare arrays by identity key instead of index. Default: false */
  readonly arrayIdentityKey?: string;
  /** Treat arrays as ordered (index-based). Default: true */
  readonly orderedArrays?: boolean;
  /** Max depth for comparison. Default: unlimited */
  readonly maxDepth?: number;
}
```

#### `PatchOptions` (interface)
```typescript
interface PatchOptions {
  /** Mutate the original object instead of returning a copy. Default: false */
  readonly mutate?: boolean;
}
```

#### `DiffResult` (interface)
```typescript
interface DiffResult {
  /** List of all changes detected */
  readonly changes: readonly Change[];
  /** List of patch operations derived from changes */
  readonly patches: readonly Patch[];
  /** Number of additions */
  readonly added: number;
  /** Number of removals */
  readonly removed: number;
  /** Number of modifications */
  readonly changed: number;
  /** Total number of changes */
  readonly total: number;
}
```

#### `Patch` (type)
A patch operation that can be applied to transform JSON.

```typescript
type Patch = AddPatch | RemovePatch | ReplacePatch;
```

#### `AddPatch`
```typescript
interface AddPatch {
  readonly op: "add";
  readonly path: readonly string[];
  readonly value: JsonValue;
}
```

#### `RemovePatch`
```typescript
interface RemovePatch {
  readonly op: "remove";
  readonly path: readonly string[];
}
```

#### `ReplacePatch`
```typescript
interface ReplacePatch {
  readonly op: "replace";
  readonly path: readonly string[];
  readonly value: JsonValue;
}
```

### Functions

#### `diff(oldVal, newVal, options?)`
```typescript
function diff(oldVal: JsonValue, newVal: JsonValue, options?: DiffOptions): DiffResult
```

**Parameters:**
- `oldVal` — The original JSON value
- `newVal` — The new JSON value to compare against
- `options` — Optional configuration for diff behavior

**Returns:** DiffResult containing all changes and statistics

**Example:**
```typescript
const result = diff({ a: 1 }, { a: 2 });
console.log(result.changes); // [{ path: ["a"], type: "changed", oldValue: 1, newValue: 2 }]
```

#### `diffObjects(oldObj, newObj, options?)`
Diff two objects, detecting added, removed, and changed properties.

```typescript
function diffObjects(oldObj: JsonObject, newObj: JsonObject, options?: DiffOptions): DiffResult
```

**Example:**
```typescript
const result = diffObjects({ x: 1 }, { x: 2, y: 3 });
```

#### `diffArrays(oldArr, newArr, options?)`
```typescript
function diffArrays(oldArr: JsonArray, newArr: JsonArray, options?: DiffOptions): DiffResult
```

**Example:**
```typescript
const result = diffArrays([1, 2], [1, 3]);
```

#### `parsePath(pathString)`
```typescript
function parsePath(pathString: string): readonly string[]
```

**Example:**
```typescript
parsePath("a.b.c") // ["a", "b", "c"]
parsePath("a[0].b") // ["a", "0", "b"]
parsePath('a["0"].b') // ["a", "0", "b"]
```

#### `buildPath(segments)`
```typescript
function buildPath(segments: readonly string[]): string
```

**Example:**
```typescript
buildPath(["a", "b", "c"]) // "a.b.c"
buildPath(["a", "0", "b"]) // "a[0].b"
```

#### `deepEqual(a, b)`
```typescript
function deepEqual(a: JsonValue, b: JsonValue): boolean
```

**Example:**
```typescript
deepEqual({ a: 1 }, { a: 1 }) // true
deepEqual([1, 2], [1, 2]) // true
deepEqual({ a: 1 }, { a: 2 }) // false
```

#### `patch(value, patches, options?)`
```typescript
function patch(value: JsonValue, patches: readonly Patch[], options?: PatchOptions): JsonValue
```

**Parameters:**
- `value` — The JsonValue to patch
- `patches` — Array of patches to apply
- `options` — Patch options

**Returns:** Patched JsonValue (new copy if mutate is false, same reference if true)

**Example:**
```typescript
const original = { a: 1 };
const patched = patch(original, [{ path: ["a"], op: "replace", value: 2 }]);
// original is unchanged, patched is { a: 2 }
```

#### `applyChanges(value, changes, options?)`
```typescript
function applyChanges(value: JsonValue, changes: readonly Change[], options?: PatchOptions): JsonValue
```

**Example:**
```typescript
const original = { a: 1 };
const changes = diff(original, { a: 2 });
const patched = applyChanges(original, changes);
```

## Advanced Usage

### Array Diffing by Identity

```typescript
// REMOVED external import: import { diff } from "@adametherzlab/json-diff-ts";

const usersBefore = [
  { id: 1, name: "Alice" },
  { id: 2, name: "Bob" }
];

const usersAfter = [
  { id: 1, name: "Alice Updated" },
  { id: 3, name: "Charlie" },
  { id: 2, name: "Bob" }
];

const result = diff(usersBefore, usersAfter, { arrayIdentityKey: "id" });
console.log(result.changes);
// Detects: name change for id=1, addition of id=3, keeps id=2 in same position
```

### Path Manipulation

```typescript
// REMOVED external import: import { parsePath, buildPath, patch } from "@adametherzlab/json-diff-ts";

const pathStr = "users[0].profile.settings.notifications";
const segments = parsePath(pathStr);
// ["users", "0", "profile", "settings", "notifications"]

const restored = buildPath(segments);
// "users[0].profile.settings.notifications"

// Use segments directly in patches
const data = { users: [{ profile: { settings: { notifications: true } } }] };
const patched = patch(data, [
  { op: "replace", path: segments, value: false }
]);
```

### Mutate In-Place

For performance-critical scenarios where memory allocation matters:

```typescript
// REMOVED external import: import { diff, patch } from "@adametherzlab/json-diff-ts";

const largeObject = { /* big data */ };
const updates = { /* changes */ };

const result = diff(largeObject, updates);
patch(largeObject, result.patches, { mutate: true });
// Modifies largeObject directly, no copy allocation
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md)

## License

MIT (c) [AdametherzLab](https://github.com/AdametherzLab)