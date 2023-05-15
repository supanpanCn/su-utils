import { resolveModule } from "local-pkg";
import parseCode from "./parse";
import { readdirSync,statSync } from "node:fs"
import { resolve } from 'node:path'

function _dirname(pkgName: string) {
  const entry = resolveModule(pkgName, {
    paths: [process.cwd()],
  });
  if (entry) {
    return entry;
  }
}

function scanDir(entry: string, res: string[]) {
  const files = readdirSync(entry);
  for (let file of files) {
    const full = resolve(entry, file);
    const stat = statSync(full);
    if (stat.isFile()) {
      res.push(full);
      continue;
    }
    scanDir(full, res);
  }
  return res;
}

export {
  parseCode,
  _dirname,
  scanDir
}