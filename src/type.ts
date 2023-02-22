type AnyObj = {
  [other:string]:any
}

type OneOfKey<T> = keyof T 

type OneOf<T,U> = T extends keyof U ? U[T] : any

type Mixin<T,U> = T & U

export {
  AnyObj,
  OneOfKey,
  OneOf,
  Mixin
}