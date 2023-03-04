import { AnyObj } from "./type";
export interface DiffResult<T> {
  deletes: T[];
  adds: T[];
}
type NoObject<T> = T extends object ? never : T;

function checkEqual(x: any, y: any, key?: string) {
  if (key) {
    return x[key] === y[key];
  }
  return x === y;
}

function diffArr<T>(x: NoObject<T>[], y: NoObject<T>[]): DiffResult<T>;
function diffArr<T>(x: AnyObj[], y: AnyObj[], k: string): DiffResult<T>;
function diffArr<T>(x: T[], y: T[], k?: string): DiffResult<T> {
  const response: DiffResult<T> = {
    deletes: [],
    adds: [],
  };
  const list1 = x;
  const list2 = y;
  let l1 = list1.length - 1;
  let l2 = list2.length - 1;
  let i = 0;

  // i->length
  while (i <= l1 && i <= l2) {
    if (!checkEqual(list1[i], list2[i], k)) {
      break;
    }
    i++;
  }
  if (i > l1 && i > l2) {
    return response;
  }

  // length->i
  while (l1 >= i && l2 >= i) {
    if (!checkEqual(list1[l1], list2[l2], k)) {
      break;
    }
    l1--;
    l2--;
  }

  // the two "while" only execute one or the other at a time
  if (i > l2) {
    while (i <= l1) {
      list1.splice(i, 1);
      response.deletes.push(list1[i]);
      i++;
    }
    return response;
  }
  if (i > l1) {
    while (i <= l2) {
      list1.push(list2[i]);
      response.adds.push(list2[i]);
      i++;
    }
    return response;
  }

  /**
   * to this point means that the remaining nodes have been moved, deleted, or added
   * list1[j,l1]:the remaining list1 of undetected items
   */

  let restIndexOfNewListMap = new Map(); // record the position of the remaining nodes in the list2

  for (let j = i; j <= l2; j++) {
    restIndexOfNewListMap.set(list2[j], j);
  }

  // deleted
  for (let j = i; j <= l1; j++) {
    let index = restIndexOfNewListMap.get(list1[j]);
    if (index === undefined) { 
      response.deletes.push(list1[j]);
      list1.splice(j, 1);
      j--
      l1--
      continue;
    }
    restIndexOfNewListMap.delete(list1[j])
  }

  // added
  if(restIndexOfNewListMap.size > 0){
    for(let key of restIndexOfNewListMap.keys()){
      response.adds.push(key)
    }
  }

  return response;
}

export default diffArr;
