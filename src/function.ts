import type { AnyObj, OneOfKey, AtLastInObjectArray } from "./type";
import colors from "picocolors";
import diffArr from "./diffArr";
import unasynchrony from "./sync";
import parseCode from "./parse";
import prettier from "./prettier";
import { displaceComments } from "displace-comments";
import {
  replaceAll,
  extractBlockCode,
  checkIsClosed,
  toObject,
} from "./string";

type Types = "S" | "O" | "U" | "F" | "N" | "B" | "R" | "A";
type MessageType = "red" | "yellow" | "green";
type DfsItem = {
  children: any[];
};
type RunArrCb<T> = (
  m: T,
  i: number,
  isLast: boolean,
  parent?: any
) => "break" | "continue" | number | void | undefined;

function runArr<T>(m: any, cb: RunArrCb<T>): undefined | "break" | "continue" {
  let res = undefined;
  if (Array.isArray(m)) {
    for (let i = 0; i < m.length; i++) {
      if (getType(cb) === "F") {
        const fb = cb(m[i], i, i === m.length - 1);
        if (fb === "break") {
          res = fb;
          break;
        }
        if (fb === "continue") {
          res = fb;
          continue;
        }
        if (getType(fb) === "N") {
          i = fb as number;
        }
      }
    }
  }
  return res;
}

function createCustomType(type: string) {
  class Custom {}
  const t = Custom as any;
  t[Symbol.toStringTag] = type;
  return t;
}

function getLastItemOfArray(arr: any[]) {
  const res = arr[arr.length - 1];
  return res;
}

function doRegex(
  reg: RegExp,
  code: string,
  cb: (m: RegExpExecArray, reg: RegExp) => void,
  startIndex?: number,
  strip?: boolean
) {
  code = strip ? displaceComments(code) : code;
  reg.lastIndex = startIndex ? startIndex : 0;
  let m = reg.exec(code);
  while (m) {
    if (typeof cb === "function" && m) {
      cb(m as RegExpExecArray, reg);
    }
    m = reg.exec(code);
  }
}

function getType(p: any): Types {
  const type = Object.prototype.toString.call(p);
  switch (type) {
    case "[object Number]":
      return "N";
    case "[object Object]":
      return "O";
    case "[object String]":
      return "S";
    case "[object Boolean]":
      return "B";
    case "[object Function]":
      return "F";
    case "[object Array]":
      return "A";
    case "[object RegExp]":
      return "R";
  }
  return "U";
}

function waitFor(
  getHandler: (
    hanlers: [(value: unknown) => void, (reason?: any) => void]
  ) => void
): Promise<void>;
function waitFor(
  getHandler: (
    hanlers: [(value: unknown) => void, (reason?: any) => void]
  ) => void,
  conf?: {
    delay?: number;
    isAuto?: boolean;
  }
) {
  const { delay = 100, isAuto = false } = conf || {};
  let timer: any;
  return new Promise((resolve, reject) => {
    if (isAuto) {
      timer = setTimeout(() => {
        resolve(true);
        clearTimeout(timer);
      }, delay);
    } else {
      getHandler([resolve, reject]);
    }
  });
}

function createCleanObj<T extends AnyObj>(
  obj: T,
  conf?: {
    dels?: string[];
    skips?: string[];
  }
): T {
  const dels = conf?.dels || [];
  const skips = conf?.skips || [];
  if (getType(obj) === "O") {
    for (let key in obj) {
      if (skips.includes(key)) continue;
      if (
        obj[key] === null ||
        obj[key] === undefined ||
        (getType(obj[key]) === "S" && obj[key].trim() === "") ||
        (Array.isArray(obj[key]) && !obj[key].length) ||
        (getType(obj[key]) === "O" && Object.keys(obj[key]).length === 0)
      ) {
        delete obj[key];
      }
    }
    if (Array.isArray(dels)) {
      runArr<string>(dels, (v) => {
        if (skips.includes(v)) {
          return "continue";
        }
        delete obj[v];
      });
    }
  }
  return obj;
}

let parentNode: any = null;
let parentStack: any[] = [];
function dfsTree<T>(
  tree: AtLastInObjectArray<{}[], DfsItem>,
  cb: RunArrCb<T>,
  payload?: any,
  isNotReset?: boolean
) {
  if (!isNotReset) {
    parentNode = null;
    parentStack = [];
  }

  runArr<DfsItem & T>(tree, (v, i, isLast) => {
    const isDfs = Array.isArray(v.children) && v.children.length
    if (getType(cb) === "F") {
      const t = cb(v, i, isLast, parentNode);
      if (t === "continue" || t === "break" || typeof t === "number") {
        return t;
      }
    }
    if (isDfs) {
      parentNode = v;
      parentStack.push(v);
      dfsTree(v.children, cb, payload, true);
    }
    if (isLast) {
      parentStack.pop();
      parentNode = getLastItemOfArray(parentStack);
    }
  });
}

(dfsTree as any).getParentStack = () => parentStack

function createLog<T>(messages: Map<string, string | Function>, which: string) {
  return function (
    messageType: OneOfKey<T>,
    color: MessageType = "red",
    rest?: any
  ) {
    let msg = messages.get(messageType as string);
    if (typeof msg === "function") {
      msg = msg(rest);
    }
    console.log(colors[color](`[${which}]:${msg}`));
  };
}

let timer: any = null;
function debounce(cb: Function, t?: number, params?: any) {
  if (timer) clearInterval(timer);
  timer = setTimeout(() => {
    if (getType(cb) === "F") {
      cb(params);
    }
    clearTimeout(timer);
    timer = null;
  }, t || 200);
}

function parseTag (key: string, code: string) {
  const reg = new RegExp(`\\<\\/?[\\s]*${key}[^\\>]*?\\>`, "g");
  const m = code.match(reg);
  return m;
}

export {
  extractBlockCode,
  replaceAll,
  createLog,
  doRegex,
  createCleanObj,
  runArr,
  getType,
  checkIsClosed,
  dfsTree,
  waitFor,
  diffArr,
  getLastItemOfArray,
  debounce,
  toObject,
  parseCode,
  createCustomType,
  unasynchrony,
  prettier,
  parseTag
};
