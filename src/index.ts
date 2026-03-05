import type {
  Change,
  ChangeType,
  AddedChange,
  RemovedChange,
  ChangedChange,
  JsonValue,
  JsonPrimitive,
  JsonArray,
  JsonObject,
  DiffOptions,
  PatchOptions,
  DiffResult,
  Patch,
  AddPatch,
  RemovePatch,
  ReplacePatch,
} from "./types";

export { ChangeType } from "./types";
export type {
  Change,
  AddedChange,
  RemovedChange,
  ChangedChange,
  JsonValue,
  JsonPrimitive,
  JsonArray,
  JsonObject,
  DiffOptions,
  PatchOptions,
  DiffResult,
  Patch,
  AddPatch,
  RemovePatch,
  ReplacePatch,
};

export { diff, diffObjects, diffArrays } from "./diff";
export type { DiffResult as DiffResult } from "./diff";

export {
  parsePath,
  buildPath,
  deepEqual,
  patch,
  applyChanges,
} from "./utils";