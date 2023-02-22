const regex = {
  multilineCommentsRE:/\/\*[^\1]*?(\*\/)/g,
  singlelineCommentsRE:/\/\/[^\1]*?(\n)/g,
  htmlCommentsRE:/\<\!\-\-[^\1]*?(\-\-\>)/g,
  importRE:/import([\s])+((\{([^}]*)?\}|.*?)\1from\1+)?('|")(.*)?\5;?/g,
  scriptBodyRE:/(\<script.*?\>)([^\3]*?)(\<\/script[\s]*\>)/g,
  quoteBodyOfEqRE:/(?<=\=[\s]*)('|")([^\1]*?)\1/g
}

const FILL = " "

export {
  regex,
  FILL
}

