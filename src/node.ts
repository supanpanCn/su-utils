import { resolveModule } from "local-pkg";
import parseCode from "./parse";

function _dirname(pkgName: string) {
  const entry = resolveModule(pkgName, {
    paths: [process.cwd()],
  });
  if (entry) {
    return entry;
  }
}

export {
  parseCode,
  _dirname
}