import { promises as fs, constants } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

/** Publish without replacing an existing video (which may be playing in preview). */
export async function publishExport(
  source: string,
  requested: string,
): Promise<{ filePath: string; renamed: boolean }> {
  if (
    path.resolve(source).toLowerCase() === path.resolve(requested).toLowerCase()
  )
    return { filePath: source, renamed: false };
  try {
    await fs.copyFile(source, requested, constants.COPYFILE_EXCL);
    return { filePath: requested, renamed: false };
  } catch (error) {
    if (
      !["EEXIST", "EPERM", "EACCES", "EBUSY"].includes(
        (error as NodeJS.ErrnoException).code || "",
      )
    )
      throw error;
    const parsed = path.parse(requested);
    const alternative = path.join(
      parsed.dir,
      `${parsed.name}-${Date.now()}-${randomUUID().slice(0, 6)}${parsed.ext || ".mp4"}`,
    );
    await fs.copyFile(source, alternative, constants.COPYFILE_EXCL);
    return { filePath: alternative, renamed: true };
  }
}
