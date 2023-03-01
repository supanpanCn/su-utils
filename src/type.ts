type AnyObj = {
  [other:string]:any
}

type OneOfKey<T> = keyof T 

type OneOf<T,U> = T extends keyof U ? U[T] : any

type Mixin<T,U> = T & U

type AtLastInObjectArray<T,U> = T extends AnyObj[] ? (T[number] & U)[] : never;

type AtLastAnyArray<T,I,U> = T extends I[] ? T[number] extends U ? T[number][] : never : never

export {
  AnyObj,
  OneOfKey,
  OneOf,
  Mixin,
  AtLastInObjectArray,
  AtLastAnyArray
}