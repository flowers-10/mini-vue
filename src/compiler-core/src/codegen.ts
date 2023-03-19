import { NodeTypes } from "./ast";

export function generate(ast) {
  const context = createCodegenContext();
  const { push } = context;

  genFunctionPreamble(ast, context);

  const functionName = "render";
  const args = ["_ctx", "_cache"];
  const signature = args.join(", ");
  console.log(ast);

  push(`function ${functionName}(${signature}){`);

  push("return ");
  genNode(ast.codegenNode, context);
  push("}");

  return {
    code: context.code,
  };
}

function genFunctionPreamble(ast, context) {
  const { push } = context;
  const VueBinging = "Vue";
  const aliasHelper = (s) => `${s}:_${s}`;
  if (ast.helpers.length > 0) {
    push(
      `const { ${ast.helpers.map(aliasHelper).join(", ")} } = ${VueBinging}`
    );
  }
  push("\n");
  push("return ");
}

function createCodegenContext() {
  const context = {
    code: "",
    push(source) {
      context.code += source;
    },
  };
  return context;
}

function genNode(node, context) {
  // text类型
  switch (node.type) {
    case NodeTypes.TEXT:
      genText(node, context);
      break;
    case NodeTypes.INTERPOLATION:
      genInterPolation(node, context);
      break;
    case NodeTypes.SIMPLE_EXPRESSION:
      genExpression(node, context);
      break;
    default:
      break;
  }
}

function genText(node, context) {
  const { push } = context;
  push(`'${node.content}'`);
}

function genInterPolation(node, context) {
  const { push } = context;
  console.log(node);

  push(`_toDisplayString(`);
  genNode(node.content, context);
  push(")");
}

function genExpression(node, context) {
  const { push } = context;

  push(`${node.content}`);
}
