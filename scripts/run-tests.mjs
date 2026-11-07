import { rmSync } from "node:fs";
import { resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";

// 每次先删除本项目的测试编译目录，防止已移除的测试仍以旧 JavaScript 文件参与执行。
const projectRoot = resolve(import.meta.dirname, "..");
const temporaryRoot = resolve(projectRoot, "node_modules", ".tmp");
const outputDirectory = resolve(temporaryRoot, "api-response-tests");
if (!outputDirectory.startsWith(temporaryRoot + sep))
  throw new Error("测试输出目录越界");
rmSync(outputDirectory, { recursive: true, force: true });

const compilation = spawnSync(
  process.execPath,
  [
    resolve(projectRoot, "node_modules/typescript/bin/tsc"),
    "-p",
    "tsconfig.test.json",
  ],
  { cwd: projectRoot, stdio: "inherit" },
);
if (compilation.error) throw compilation.error;
if (compilation.status !== 0) process.exit(compilation.status ?? 1);
const tests = spawnSync(process.execPath, ["--test"], {
  cwd: outputDirectory,
  stdio: "inherit",
});
if (tests.error) throw tests.error;
process.exitCode = tests.status ?? 1;
