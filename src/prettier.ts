// @ts-nocheck
import prettierApi from 'prettier'

export default function prettier(code:string) {
  return prettierApi.format(code, {
    parser: "typescript",
  });
}
