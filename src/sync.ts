import { createCustomType   } from './function'
const result = {
  status:'pending',
  data:null,
  err:null
}
const TYPE_NAME = 'SU_UTILS_TYPE'
const TYPE = createCustomType(TYPE_NAME)
let handling = false
function unasynchrony(tar:Promise<void>,userHandler?:Function){
  if(handling) return
  if(tar instanceof Promise){
    const cb = typeof userHandler === 'function' ? userHandler : (da:any)=>da
    handling = true
    const t = tar as any
    const origin = t.then 
    t.then = ()=>{
      if(result.status === 'fullfilled'){
        handling = false
        return result.data
      }
      origin.then((data:any)=>{
        result.status = 'fullfilled'
        result.data = cb!(data)
      },(err:any)=>{
        result.err = err
      })
      throw TYPE
    }
    try {
     return t.then()
    } catch (error) {
      if(Object.prototype.toString.call(error) === `[object ${TYPE_NAME}]`){
        t.then()
      }
    }
  }
}


export default unasynchrony