import { NodeTypes } from "./ast";

const enum TagType {
  Start,
  End,
}

// 解析双花括号
export function baseParse(content: string) {
  // 创建上下文
  const context = createParserContext(content);
  // 根据当前上下文，生成ast树
  // 传入一个[]做栈
  return createRoot(parseChildren(context, []));
}

// 解析子
function parseChildren(context, ancestors) {
  // 新建一个nodes保存所有子
  const nodes: any = [];

  // feat3:循环去解析子内部的chidren
  // 判断是否结束，没有结束就死循环下去
  while (!isEnd(context, ancestors)) {
    let node;
    const s = context.source;
    if (s.startsWith("{{")) {
      // 解析{{ }}插入值并返回ast
      node = parseInterpolation(context);
    } else if (s[0] === "<") {
      // 如果第一个字符是<,说明是一个标签
      if (/[a-z]/i.test(s[1])) {
        // console.log("parse element");
        node = parseElement(context, ancestors);
      }
    }

    if (!node) {
      // console.log("parse text");
      node = parseText(context);
    }
    // 推入node
    nodes.push(node);
  }
  // 返回ast树
  return nodes;
}

// feat4:判断是否循环解析
function isEnd(context, ancestors) {
  const s = context.source;
  // 2.当遇到结束标签的时候,该结束解析了
  if (s.startsWith("</")) {
    // 遍历 ancestors
    for (let i = ancestors.length - 1; i >= 0; --i) {
      // 获取ancestors栈中的tag
      const tag = ancestors[i].tag;
      // 如果当前的标签值，命中ancestors中的tag说明该结束循环了
      if (startsWithEndTagOpen(s, tag)) {
        return true;
      }
    }
  }

  // if (parentTag && s.startsWith(`</${parentTag}>`)) {
  //   return true;
  // }

  // 1.source有值的时候,说明isEnd应该是false，不能停止继续解析
  return !s;
}

function parseText(context: any) {
  // feat2:判断截取之后的内容是否会遇到{{，如果遇到花括号就要停止截取，转而解析双花括号
  let endIndex = context.source.length;
  //  feat5:不止是{{,也可能遇到<标签,所以便利去查找
  let endTokens = ["{{", "<"];
  for (let i = 0; i < endTokens.length; i++) {
    const index = context.source.indexOf(endTokens[i]);
    // 指针尽可能的靠左停止
    if (index !== -1 && endIndex > index) {
      endIndex = index;
    }
  }

  // 判断当前字符串是否包含{{，找到就可以给endIndex赋值，截取到这个index即可

  // 1. 获取content
  // 推进清空所有 source
  const content = parseTextData(context, endIndex);

  // console.log("content -------", content);

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
function parseElement(context: any, ancestors) {
  // Implement
  // 1. 解析tag
  const element: any = parseTag(context, TagType.Start);
  // 收集element推入ancestors栈中
  ancestors.push(element);
  // feat1:这边要开始解析children内容了
  element.children = parseChildren(context, ancestors);
  // ancestors栈中弹出element
  ancestors.pop();

  // console.log("----", element.tag);
  // console.log("----", context.source);
  // 如果对比的标签和当前的标签相同就解析Tag否则就报错
  if (startsWithEndTagOpen(context.source, element.tag)) {
    parseTag(context, TagType.End);
  } else {
    throw new Error(`缺少结束标签：${element.tag}`);
  }

  // 解析标签生成ast树
  // console.log("-------", context.source);
  return element;
}

function startsWithEndTagOpen(source, tag) {
  return (
    source.startsWith("</") &&
    source.slice(2, 2 + tag.length).toLowerCase() === tag
  );
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
  return { children, type: NodeTypes.ROOT };
}

// 创建解析器上下文
function createParserContext(content: string) {
  return {
    source: content,
  };
}
