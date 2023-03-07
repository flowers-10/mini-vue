import { ShapeFlags } from '../shared/ShapeFlags'

export const Fragment = Symbol("Fragment")
export const Text = Symbol("Text")

export function createVnode(type, props?, children?) {
  const vnode = {
    type,//用户传入的第一个参数，组件app 包含render和setup函数
    props,//用户传入的第二个参数，组件app 内部填充的 属性
    children,//用户传入的第三个参数，组件app 内部填充的 节点
    shapeFlag: getShapFlag(type),//判断初始化的节点类型
    el: null //初始化时是null
  }
  // console.log(vnode);
  
  // children
  if (typeof children === 'string') {
    vnode.shapeFlag |= ShapeFlags.TEXT_CHILDREN
  }else if(Array.isArray(children)) {
    vnode.shapeFlag |=  ShapeFlags.ARRAY_CHILDREN
  }

  if(vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
    if(typeof children === "object") {
      vnode.shapeFlag |= ShapeFlags.SOLT_CHILDREN
    }
  }
  return vnode
}

export function createTextVNode(text:string) {
  return createVnode(Text,{},text)
}

function getShapFlag(type) {
  return typeof type === 'string' ? ShapeFlags.ELEMENT : ShapeFlags.STATEFUL_COMPONENT
}