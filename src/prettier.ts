// @ts-nocheck
import prettierApi from "prettier/standalone";
import parserBabel from "prettier/parser-babel";

export default function prettier(code:string) {
  return prettierApi.format(code, {
    parser: "babel",
    plugins: [parserBabel],
  });
}
