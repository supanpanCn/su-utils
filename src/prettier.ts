// @ts-ignore
import prettierApi from "prettier/standalone";
// @ts-ignore
import parserBabel from "prettier/parser-babel";

export default function prettier(code:string) {
  // @ts-ignore
  return prettierApi.format(code, {
    parser: "babel",
    plugins: [parserBabel],
  });
}
