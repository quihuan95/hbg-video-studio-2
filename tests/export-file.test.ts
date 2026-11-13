import { test } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import { publishExport } from "../electron/export-file";

test("xuất trùng tên tạo file mới, giữ bản cũ và bản render hoàn chỉnh", async () => {
  const dir = await fs.mkdtemp(path.resolve(".local/export-test-"));
  const source = path.join(dir, "rendered.mp4"),
    destination = path.join(dir, "hbg-short.mp4");
  await fs.writeFile(source, "new complete video");
  await fs.writeFile(destination, "previous video");
  const result = await publishExport(source, destination);
  assert.equal(result.renamed, true);
  assert.notEqual(result.filePath, destination);
  assert.equal(await fs.readFile(destination, "utf8"), "previous video");
  assert.equal(
    await fs.readFile(result.filePath, "utf8"),
    "new complete video",
  );
  assert.equal(await fs.readFile(source, "utf8"), "new complete video");
});
test("đích không ghi được vẫn giữ nguyên bản đã render để lưu lại", async () => {
  const dir = await fs.mkdtemp(path.resolve(".local/export-test-"));
  const source = path.join(dir, "rendered.mp4");
  await fs.writeFile(source, "complete video");
  await assert.rejects(
    publishExport(source, path.join(dir, "missing-folder", "output.mp4")),
  );
  assert.equal(await fs.readFile(source, "utf8"), "complete video");
  const retry = await publishExport(source, path.join(dir, "retry.mp4"));
  assert.equal(retry.renamed, false);
  assert.equal(await fs.readFile(retry.filePath, "utf8"), "complete video");
});
