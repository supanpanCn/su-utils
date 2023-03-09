import { createContext, runInContext } from "node:vm";
import { getType } from './function'

function replaceAll(code: string, o: string, cb?: (o: string) => string) {
  const reg = new RegExp(o)
  const m = reg.exec(code)
  if(m){
    const start = m.index
    const end = start + m[0].length
    const mid = code.substring(start,end)
    let newCode = ''
    const list = code.split(mid)
    list.forEach((v,i)=>{
      newCode += v 
      if(i<list.length-1){
        newCode += getType(cb) === "F" ? cb!(m[0]) : "";
      }
    })
    code = newCode
  }
  
  return code;
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
  let i = initialIndex;
  let isBreak = false;
  if (start === code[initialIndex]) {
    i++;
    isBreak = true;
  }

  const cb = (v: string) => {
    if (v === start) {
      if (!isBreak) {
        isBreak = true;
        return;
      }
      range.push(v);
    }
    if (v === end) {
      range.shift();
    }
    if (range.length === 0) {
      return {
        start: initialIndex,
        end: i,
        text: code.substring(initialIndex, i + 1),
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

function checkIsClosed(value: string, flags: [string, string]) {
  const [flag1, flag2] = flags;
  let i = value.indexOf(flag1);
  let l = 0;
  while (i > -1) {
    l++;
    i = value.indexOf(flag1, i + 1);
  }
  i = value.lastIndexOf(flag2);
  let r = 0;
  while (i > -1) {
    r++;
    i = value.lastIndexOf(flag2, i - 1);
  }
  return {
    isClosed: l === r,
    miss: Math.abs(r - l),
  };
}

function toObject(code: string) {
  const vm = {
    block: {
      children: [],
    },
  };
  createContext(vm);
  let block = `block = ${code}`;
  if (block.includes("RouterView")) {
    block = replaceAll(block,'RouterView',()=>`"RouterView"`);
  }
  runInContext(block, vm);
  return vm.block;
}

export {
  replaceAll,
  extractBlockCode,
  checkIsClosed,
  toObject
}