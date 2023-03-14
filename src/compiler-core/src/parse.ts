import { NodeTypes } from "./ast";

const enum TagType {
  Start,
  End,
}

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
  let node;
  const s = context.source;
  if (s.startsWith("{{")) {
    // 解析{{ }}插入值并返回ast
    node = parseInterpolation(context);
  } else if (s[0] === "<") {
    // 如果第一个字符是<,说明是一个标签
    if (/[a-z]/i.test(s[1])) {
      // console.log("parse element");
      node = parseElement(context);
    }
  }

  if (!node) {
    console.log("parse text");
    node = parseText(context);
  }
  // 推入node
  nodes.push(node);
  // 返回ast树
  return nodes;
}

function parseText(context: any) {
  // 1. 获取content
  const content = parseTextData(context, context.source.length);
  // 推进清空所有 source
  console.log("-----", context.source);

  return {
    type: NodeTypes.TEXT,
    content,
  };
}

//获取content,并且推进content的距离
function parseTextData(context: any, length) {
  const content = context.source.slice(0, length);
  advanceBy(context, length);
  return content;
}

// 解析Element
function parseElement(context: any) {
  // Implement
  // 1. 解析tag
  const element = parseTag(context, TagType.Start);

  parseTag(context, TagType.End);
  // console.log("-------", context.source);
  return element;
}

// 解析标签生成ast树
function parseTag(context: any, type: TagType) {
  // 正则匹配context.source 是 <div 或者 </div
  const match: any = /^<\/?([a-z]*)/i.exec(context.source);
  // console.log(match);
  // 拿到匹配的tag放入ast树
  const tag: any = match[1];
  // 2. 删除处理完成的代码
  advanceBy(context, match[0].length);
  advanceBy(context, 1);
  // 如果是处理结束标签就不用return ast树
  if (type === TagType.End) return;
  return {
    type: NodeTypes.ELEMENT,
    tag,
  };
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
  const rawContent = parseTextData(context, rawContentLength);
  // 给context去掉所有空格
  const content = rawContent.trim();

  // 给context.source清空
  // 因为后续还要处理div等标签内容，所以清空等待下个逻辑进入
  advanceBy(context, closeDelimiter.length);

  return {
    type: NodeTypes.INTERPOLATION,
    content: {
      type: NodeTypes.SIMPLE_EXPRESSION,
      content: content,
    },
  };
}

// 推进：字符串越来越缩小，根据传入的length，推进并重新覆盖自身
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
