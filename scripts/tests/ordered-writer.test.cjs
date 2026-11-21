const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  createLoader,
  deferred,
  settle,
} = require("./helpers/load-typescript.cjs");

test("a rejected write does not poison the next snapshot for the same key", async () => {
  const { createOrderedWriter } = createLoader()(
    "services/storage/orderedWriter.ts",
  );
  const commits = [];
  const writer = createOrderedWriter(async (key, value) => {
    if (value === "old") throw new Error("disk failure");
    commits.push(value);
  });
  const failed = writer.write("key", "old");
  const next = writer.write("key", "new");
  await assert.rejects(failed, /disk failure/);
  await next;
  assert.deepEqual(commits, ["new"]);
});
test("an unrelated collection can persist while another key is waiting", async () => {
  const { createOrderedWriter } = createLoader()(
    "services/storage/orderedWriter.ts",
  );
  const pending = deferred();
  const commits = [];
  const writer = createOrderedWriter(async (key, value) => {
    if (key === "slow") await pending.promise;
    commits.push(key + ":" + value);
  });
  const slow = writer.write("slow", "old");
  await writer.write("fast", "new");
  assert.deepEqual(commits, ["fast:new"]);
  pending.resolve();
  await slow;
  assert.deepEqual(commits, ["fast:new", "slow:old"]);
});
