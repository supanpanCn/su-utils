const result = {
  status:'pending',
  data:null,
  err:null
}
function unasynchrony(tar:Promise<void>,userHandler?:Function){
  if(tar instanceof Promise){
    const cb = typeof userHandler === 'function' ? userHandler : (da:any)=>da
    const t = tar as any
    const origin = t.then 
    t.then = ()=>{
      if(result.status === 'fullfilled'){
        return result.data
      }
      throw origin.then((data:any)=>{
        result.status = 'fullfilled'
        result.data = cb!(data)
      },(err:any)=>{
        result.err = err
      })
    }
    function exec(){
      try {
        return t.then()
       } catch (error) {
         if(error instanceof Promise){
           t.then(exec,exec)
         }else{
           throw error
         }
       }
    }
    exec()
  }
}


export default unasynchrony