import type { Change, DiffOptions, DiffResult, JsonArray, JsonObject, JsonValue } from "./types";
import { ChangeType } from "./types";

/**
 * Check if a path should be excluded from comparison.
 */
function isPathExcluded(path: readonly string[], excludePaths?: readonly string[]): boolean {
	if (!excludePaths || excludePaths.length === 0) return false;
	const pathStr = path.join(".");
	return excludePaths.some(
		(excluded) => pathStr === excluded || pathStr.startsWith(excluded + ".")
	);
}

/**
 * Compare two values for equality, respecting the strict option.
 */
function areValuesEqual(oldVal: JsonValue, newVal: JsonValue, strict?: boolean): boolean {
	if (strict) {
		return oldVal === newVal;
	}
	return JSON.stringify(oldVal) === JSON.stringify(newVal);
}

/**
 * Recursively diff two values and populate the changes array.
 */
function diffValues(
	oldVal: JsonValue,
	newVal: JsonValue,
	path: readonly string[],
	changes: Change[],
	options?: DiffOptions
): void {
	if (isPathExcluded(path, options?.excludePaths)) return;

	if (areValuesEqual(oldVal, newVal, options?.strict)) return;

	const oldIsObj = oldVal !== null && typeof oldVal === "object";
	const newIsObj = newVal !== null && typeof newVal === "object";

	if (!oldIsObj || !newIsObj || Array.isArray(oldVal) !== Array.isArray(newVal)) {
		changes.push({
			path,
			type: ChangeType.Changed,
			oldValue: oldVal,
			newValue: newVal,
		});
		return;
	}

	if (Array.isArray(oldVal) && Array.isArray(newVal)) {
		diffArrays(oldVal, newVal, path, changes, options);
	} else {
		diffObjects(oldVal as JsonObject, newVal as JsonObject, path, changes, options);
	}
}

/**
 * Diff two objects, detecting added, removed, and changed properties.
 */
export function diffObjects(
	oldObj: JsonObject,
	newObj: JsonObject,
	path: readonly string[],
	changes: Change[],
	options?: DiffOptions
): void {
	const oldKeys = Object.keys(oldObj);
	const newKeys = Object.keys(newObj);
	const allKeys = new Set([...oldKeys, ...newKeys]);

	for (const key of allKeys) {
		const currentPath = [...path, key];
		if (isPathExcluded(currentPath, options?.excludePaths)) continue;

		const oldHas = key in oldObj;
		const newHas = key in newObj;

		if (!oldHas && newHas) {
			changes.push({
				path: currentPath,
				type: ChangeType.Added,
				newValue: newObj[key],
			});
		} else if (oldHas && !newHas) {
			changes.push({
				path: currentPath,
				type: ChangeType.Removed,
				oldValue: oldObj[key],
			});
		} else {
			diffValues(oldObj[key], newObj[key], currentPath, changes, options);
		}
	}
}

/**
 * Diff two arrays using index matching or identity key matching.
 */
export function diffArrays(
	oldArr: JsonArray,
	newArr: JsonArray,
	path: readonly string[],
	changes: Change[],
	options?: DiffOptions
): void {
	if (options?.compareArraysByIndex) {
		diffArraysByIndex(oldArr, newArr, path, changes, options);
		return;
	}

	if (options?.arrayIdentityKey) {
		diffArraysByIdentity(oldArr, newArr, path, changes, options);
		return;
	}

	diffArraysByIndex(oldArr, newArr, path, changes, options);
}

/**
 * Diff arrays by index position.
 */
function diffArraysByIndex(
	oldArr: JsonArray,
	newArr: JsonArray,
	path: readonly string[],
	changes: Change[],
	options?: DiffOptions
): void {
	const maxLen = Math.max(oldArr.length, newArr.length);

	for (let i = 0; i < maxLen; i++) {
		const currentPath = [...path, String(i)];

		if (i >= oldArr.length) {
			changes.push({
				path: currentPath,
				type: ChangeType.Added,
				newValue: newArr[i],
			});
		} else if (i >= newArr.length) {
			changes.push({
				path: currentPath,
				type: ChangeType.Removed,
				oldValue: oldArr[i],
			});
		} else {
			diffValues(oldArr[i], newArr[i], currentPath, changes, options);
		}
	}
}

/**
 * Diff arrays by identity key matching.
 */
function diffArraysByIdentity(
	oldArr: JsonArray,
	newArr: JsonArray,
	path: readonly string[],
	changes: Change[],
	options?: DiffOptions
): void {
	const identityKey = options!.arrayIdentityKey!;
	const oldMap = new Map<JsonValue, { index: number; value: JsonValue }>();
	const newMap = new Map<JsonValue, { index: number; value: JsonValue }>();

	for (let i = 0; i < oldArr.length; i++) {
		const item = oldArr[i];
		if (item !== null && typeof item === "object" && identityKey in item) {
			const id = (item as JsonObject)[identityKey];
			oldMap.set(id, { index: i, value: item });
		}
	}

	for (let i = 0; i < newArr.length; i++) {
		const item = newArr[i];
		if (item !== null && typeof item === "object" && identityKey in item) {
			const id = (item as JsonObject)[identityKey];
			newMap.set(id, { index: i, value: item });
		}
	}

	const allIds = new Set([...oldMap.keys(), ...newMap.keys()]);

	for (const id of allIds) {
		const oldItem = oldMap.get(id);
		const newItem = newMap.get(id);

		if (!oldItem && newItem) {
			changes.push({
				path: [...path, String(newItem.index)],
				type: ChangeType.Added,
				newValue: newItem.value,
			});
		} else if (oldItem && !newItem) {
			changes.push({
				path: [...path, String(oldItem.index)],
				type: ChangeType.Removed,
				oldValue: oldItem.value,
			});
		} else if (oldItem && newItem) {
			diffValues(oldItem.value, newItem.value, [...path, String(newItem.index)], changes, options);
		}
	}
}

/**
 * Compare two JSON values and produce a list of changes.
 * @param oldVal - The original JSON value
 * @param newVal - The new JSON value to compare against
 * @param options - Optional configuration for diff behavior
 * @returns DiffResult containing all changes and statistics
 * @example
 * const result = diff({ a: 1 }, { a: 2 });
 * console.log(result.changes); // [{ path: ["a"], type: "changed", oldValue: 1, newValue: 2 }]
 */
export function diff(oldVal: JsonValue, newVal: JsonValue, options?: DiffOptions): DiffResult {
	const changes: Change[] = [];

	diffValues(oldVal, newVal, [], changes, options);

	const addedCount = changes.filter((c) => c.type === ChangeType.Added).length;
	const removedCount = changes.filter((c) => c.type === ChangeType.Removed).length;
	const changedCount = changes.filter((c) => c.type === ChangeType.Changed).length;

	return {
		changes,
		hasChanges: changes.length > 0,
		addedCount,
		removedCount,
		changedCount,
	};
}