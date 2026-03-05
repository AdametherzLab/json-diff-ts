import { describe, it, expect } from "bun:test";
import { diff, patch, deepEqual, parsePath, buildPath, applyChanges } from "../src/index";

describe("diff", () => {
  it("detects added, removed, and changed keys in flat objects", () => {
    const oldObj = { a: 1, b: 2, c: 3 };
    const newObj = { a: 1, b: 5, d: 4 };

    const result = diff(oldObj, newObj);

    expect(result.hasChanges).toBe(true);
    expect(result.changes.length).toBeGreaterThanOrEqual(3);

    const changed = result.changes.find((c) => c.path.join(".") === "b");
    expect(changed).toBeDefined();
    expect(changed?.type).toBe("changed");
    expect(changed?.oldValue).toBe(2);
    expect(changed?.newValue).toBe(5);

    const removed = result.changes.find((c) => c.path.join(".") === "c");
    expect(removed).toBeDefined();
    expect(removed?.type).toBe("removed");
    expect(removed?.oldValue).toBe(3);

    const added = result.changes.find((c) => c.path.join(".") === "d");
    expect(added).toBeDefined();
    expect(added?.type).toBe("added");
    expect(added?.newValue).toBe(4);
  });

  it("produces correct dot-notation paths for nested objects", () => {
    const oldObj = { user: { name: "Alice", age: 30 }, active: true };
    const newObj = { user: { name: "Bob", age: 30 }, active: false };

    const result = diff(oldObj, newObj);

    expect(result.hasChanges).toBe(true);

    const nameChange = result.changes.find((c) => c.path.join(".") === "user.name");
    expect(nameChange).toBeDefined();
    expect(nameChange?.type).toBe("changed");
    expect(nameChange?.oldValue).toBe("Alice");
    expect(nameChange?.newValue).toBe("Bob");

    const activeChange = result.changes.find((c) => c.path.join(".") === "active");
    expect(activeChange).toBeDefined();
    expect(activeChange?.type).toBe("changed");
    expect(activeChange?.oldValue).toBe(true);
    expect(activeChange?.newValue).toBe(false);
  });

  it("produces correct bracket-notation paths for arrays", () => {
    const oldArr = [1, 2, 3];
    const newArr = [1, 5, 3, 4];

    const result = diff(oldArr, newArr);

    expect(result.hasChanges).toBe(true);

    const changed = result.changes.find((c) => c.path.join(".") === "1");
    expect(changed).toBeDefined();
    expect(changed?.type).toBe("changed");
    expect(changed?.oldValue).toBe(2);
    expect(changed?.newValue).toBe(5);

    const added = result.changes.find((c) => c.path.join(".") === "3");
    expect(added).toBeDefined();
    expect(added?.type).toBe("added");
    expect(added?.newValue).toBe(4);
  });

  it("patch applies diff changes to reconstruct target object", () => {
    const original = { a: 1, b: { c: 2 } };
    const target = { a: 10, b: { c: 2, d: 3 }, e: 5 };

    const result = diff(original, target);
    const patched = applyChanges(original, result.changes);

    expect(patched).toEqual(target);
  });

  it("deepEqual correctly compares nested structures", () => {
    expect(deepEqual({ a: 1, b: { c: 2 } }, { a: 1, b: { c: 2 } })).toBe(true);
    expect(deepEqual([1, 2, { a: 3 }], [1, 2, { a: 3 }])).toBe(true);
    expect(deepEqual({ a: 1 }, { a: 2 })).toBe(false);
    expect(deepEqual({ a: 1 }, [1])).toBe(false);
    expect(deepEqual(null, null)).toBe(true);
    expect(deepEqual(null, undefined)).toBe(false);
    expect(deepEqual({}, [])).toBe(false);
  });
});