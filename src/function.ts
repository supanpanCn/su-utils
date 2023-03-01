import stripComments from "displace-comments";
import colors from "picocolors";
import parseCode from './parse'
import { resolveModule } from "local-pkg";
import type { AnyObj , OneOfKey , AtLastInObjectArray } from "./type";

type Types = "S" | "O" | "U" | "F" | "N" | "B" | "R" | "A";
type MessageType = "red" | "yellow" | "green";
type DfsItem = {
  children:any[]
}

function runArr<T>(
  m: any,
  cb: (
    m: T,
    i: number,
    isLast: boolean
  ) => "break" | "continue" | number | void | undefined
): undefined | "break" | "continue" {
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
        if(getType(fb) === 'N'){
          i = fb as number
        }
      }
    }
  }
  return res;
}

function checkIsClosed(value:string,flags:[string,string]){
  const [flag1,flag2] = flags
  let i = value.indexOf(flag1)
  let l = 0
  while(i>-1){
    l++
    i = value.indexOf(flag1,i+1)
  }
  i = value.lastIndexOf(flag2)
  let r = 0
  while(i>-1){
    r++
    i = value.lastIndexOf(flag2,i-1)
  }
  return {
    isClosed:l === r,
    miss:Math.abs(r-l)
  }
}

function extractBlockCode(params: {
  code: string;
  start: string;
  end: string;
  initialIndex?: number;
  dir?: "l" | "r";
}) {
  const { code, start, end, initialIndex = 0, dir = "r" } = params;
  const range = [start];
  let i = initialIndex
  let isBreak = false
  if(start === code[initialIndex]){
    i++
    isBreak = true
  }
  
  const cb = (v: string) => {
    if (v === start) {
      if(!isBreak){
        isBreak = true
        return
      }
      range.push(v);
    }
    if (v === end) {
      range.shift();
    }
    if (range.length === 0 ) {
      return {
        start: initialIndex,
        end: i ,
        text:code.substring(initialIndex,i+1)
      };
    }
  };
  if (dir === "l" && i > 0) {
    for (i; i > 0; i--) {
      const res = cb(code[i]);
      if (getType(res) === "O") {
        return res;
      }
    }
  }

  for (i; i < code.length; i++) {
    const res = cb(code[i]);
    if (getType(res) === "O") {
      return res;
    }
  }
}

function replaceAll(code: string, o: string, cb?:(o:string)=>string) {
  while (code.includes(o)) {
    code = code.replace(o, getType(cb) === 'F' ? cb!(o) : "");
  }
  return code;
}



function doRegex(reg: RegExp, code: string, cb: (m: RegExpExecArray,reg:RegExp) => void,startIndex?:number) {
  code = stripComments(code);
  reg.lastIndex = startIndex ? startIndex : 0
  let m = reg.exec(code);
  while (m) {
    if (typeof cb === "function" && m) {
      cb(m as RegExpExecArray,reg);
    }
    m = reg.exec(code);
  }
}

function _dirname(pkgName:string) {
  const entry = resolveModule(pkgName, {
    paths: [process.cwd()],
  });
  if (entry) {
    return entry;
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

function dfsTree(tree:AtLastInObjectArray<{}[],DfsItem>,cb:Function,payload:any){
  runArr<DfsItem>(tree,(v,i,isLast)=>{
    if(getType(cb) === 'F'){
      const t = cb(v,i,isLast)
      if(t === 'continue' || t === 'break' || typeof t === 'number'){
        return t
      }
    }
    if(Array.isArray(v.children)){
      dfsTree(v.children,cb,payload)
    }
  })
}

function createLog<T>(messages: Map<string, string | Function>,which:string) {
  return function(
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

export {
  extractBlockCode,
  replaceAll,
  createLog,
  doRegex,
  createCleanObj,
  runArr,
  getType,
  _dirname,
  checkIsClosed,
  parseCode,
  dfsTree
};
