import stripComments from "displace-comments";
import colors from "picocolors";
import { parse } from 'recast'
import { resolveModule } from "local-pkg";
import { regex , FILL } from './const'
import type { AnyObj , OneOfKey } from "./type";

type Types = "S" | "O" | "U" | "F" | "N" | "B" | "R" | "A";
type MessageType = "red" | "yellow" | "green";
interface Token{
  type:string;
  value:string;
  loc:{
    start:any;
    end:any;
  }
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

let s = -1
function extraScriptBody(code:string){
  code = stripComments(code)
  let scriptCode = ''
  if(regex.scriptBodyRE.test(code)){
    doRegex(regex.quoteBodyOfEqRE,code,(m)=>code = replaceAll(code,m[2],(o)=>FILL.repeat(o.length)))
    doRegex(regex.scriptBodyRE,code,(m)=>{
      if(m && m[2]){
        scriptCode += m[2]
        if(s === -1){
          s = m.index + m[1].length
        }
      }
    })
  }
  code = scriptCode ? scriptCode : code
  return {code,s:s===-1?0:s}
}

function extraCodeFromAst(v:Token[],i:number,infos:any[]){
  let text = ''
  if(getType(infos) === 'A' && getType(v) === 'A'){
    function _append(line:string){
      text += line
      text += '\n'
    }
    const first = v[0]
    const last = v[v.length-1]
    const s = first.loc.start.line - 1
    const e = last.loc.end.line
    if(i===0 && s!==0){
      const range = infos.slice(0,i+1)
      runArr(range,(v:any)=>_append(v.line))
    }
    const range = infos.slice(s,e)
    runArr(range,(v:any)=>_append(v.line))
  }
  
  return text
}

function getRangeTokens(i:number,vs:Token[],start:string,end:string){
  let initialIndex = i
  const range = []
  for(i;i<vs.length;i++){
    const v = vs[i].value
    if(v === start){
      range.push(start)
    }
    if(v === end){
      range.shift()
    }
    if(range.length === 0){
      break
    }
  }
  return {
    da:vs.slice(initialIndex,i+1),
    index:i
  }
}

function parseCode(code:string,conf?:{
  visitor:(c:string,s:number,type:string)=>void
}){
  s = -1
  const {code:scriptCode,s:startIndex} = extraScriptBody(code)
  code = scriptCode
  const ast = parse(code)
  let {tokens=[]} = ast
  const tokenGroups:Token[][] = []
  runArr<Token>(tokens,(v,i)=>{
    if(v.type === 'Keyword'){
      if(v.value === "function"){
        const g = tokenGroups[tokenGroups.length-1] || []
        const l = g[g.length-1]
        if(l && l.value === '='){
          const {da,index:index} = getRangeTokens(i+1,tokens,'(',')')
          const {da:da2,index:index2} = getRangeTokens(index+1,tokens,'{','}')
          g.push(...da,...da2)
          return index2
        }
      }
      tokenGroups.push([v])
      return 'continue'
    }
    const lastGroups = tokenGroups[tokenGroups.length-1]
    if(v.value === '{'){
      const {da,index} = getRangeTokens(i,tokens,'{','}')
      lastGroups.push(...da)
      return index
    }

    lastGroups.push(v)
  })
  runArr<Token[]>(tokenGroups,(v,i)=>{
    const astCode = extraCodeFromAst(v,i,ast.loc?.lines?.infos)
    if(getType(conf) === 'O'){
      const { visitor } = conf!
      if(getType(visitor) === 'F'){
        visitor(astCode,startIndex,v[0].value)
      }
    }
  })
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
  parseCode
};
