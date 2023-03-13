import { NodeTypes } from "./ast";

// 解析双花括号
export function baseParse(content: string) {
  // 创建上下文
  const context = createParserContext(content);
  // 根据当前上下文，生成ast数
  return createRoot(parseChildren(context));
}

// 解析子
function parseChildren(context) {
  // 新建一个nodes保存所有子
  const nodes: any = [];
  let node
  if(context.source.startsWith("{{")) {
    // 解析{{ }}插入值并返回ast
    node = parseInterpolation(context);
  }
  // 推入nodes
  nodes.push(node);
  // 返回ast树
  return nodes;
}

// 解析{{ }}插入值
function parseInterpolation(context) {
  // 开始差值
  const openDelimiter = "{{";
  // 结束差值
  const closeDelimiter = "}}";
  // 获取context去掉}}后的真实长度
  const closeIndex = context.source.indexOf(
    closeDelimiter,
    openDelimiter.length
  );
  // 获取context去掉{{}}的实际长度
  const rawContentLength = closeIndex - openDelimiter.length;

  // context去掉{{
  advanceBy(context, openDelimiter.length);
  //   context去掉}}后的内容
  const rawContent = context.source.slice(0, rawContentLength);
  // 给context去掉所有空格
  const content = rawContent.trim();

  // 给context.source清空
  // 因为后续还要处理div等标签内容，所以清空等待下个逻辑进入
  advanceBy(context, rawContentLength + closeDelimiter.length);

  return {
    type: NodeTypes.INTERPOLATION,
    content: {
      type: NodeTypes.SIMPLE_EXPRESSION,
      content: content,
    },
  };
}

// 字符串缩小，根据传入的length，截取并重新覆盖自身
function advanceBy(context, length: number) {
  context.source = context.source.slice(length);
}

// 创建根节点
function createRoot(children) {
  return { children };
}

// 创建解析器上下文
function createParserContext(content: string) {
  return {
    source: content,
  };
}
