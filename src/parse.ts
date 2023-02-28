import stripComments from "displace-comments";
import { parse } from 'recast'
import { regex , FILL } from './const'
import { doRegex , replaceAll , getType , runArr } from './function'

interface Token{
  type:string;
  value:string;
  loc:{
    start:any;
    end:any;
  }
}

type Key = '{'|'('

const punctuatorMap = new Map<Key,[string,string]>([
  ['{',['{','}']],
  ['(',['(',')']]
])

function getLastArray(arr:any[]){
  const res =  arr[arr.length-1]
  return res
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
    const last = getLastArray(v)
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

function pushRange(target:any[],origin:any[],start:number,range:[string,string],groups?:any[]){
  const {da,index:index} = getRangeTokens(start,origin,range[0],range[1])
  target.push(...da)
  const nextItem = origin[index + 1] ? origin[index + 1] : {}
  if(groups && !['from'].find(v=>nextItem.value === v)){
    groups.push([])
  }
  return index
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
        const g = getLastArray(tokenGroups) || []
        const l = getLastArray(g)
        if(l && l.value === '='){
          return pushRange(g,tokens,pushRange(g,tokens,i+1,['(',')'])+1,['{','}'],tokenGroups)
        }
      }
      tokenGroups.push([v])
      return 'continue'
    }
    const lastGroups = getLastArray(tokenGroups) || []
    if(v.value === '{' || v.value === '('){
      return pushRange(lastGroups,tokens,i,punctuatorMap.get(v.value as Key)!,tokenGroups)
    }

    lastGroups.push(v)
  })

  runArr<Token[]>(tokenGroups.filter(v=>!!v.length),(v,i)=>{
    const astCode = extraCodeFromAst(v,i,ast.loc?.lines?.infos)
    if(getType(conf) === 'O'){
      const { visitor } = conf!
      if(getType(visitor) === 'F'){
        visitor(astCode,startIndex,v[0].value)
      }
    }
  })
}

export default parseCode