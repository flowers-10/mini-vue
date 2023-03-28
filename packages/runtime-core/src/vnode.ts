import { ShapeFlags } from '@guide-mini-vue/shared'

export const Fragment = Symbol("Fragment")
export const Text = Symbol("Text")

export {
  createVNode as createElementVNode
}

export function createVNode(type, props?, children?) {
  const vnode = {
    type,//用户传入的第一个参数，组件app 包含render和setup函数
    props,//用户传入的第二个参数，组件app 内部填充的 属性
    key:props && props.key , //用户传入的key，帮助diff算法遍历
    children,//用户传入的第三个参数，组件app 内部填充的 节点
    component:null,//保存当前的组件实例
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
  return createVNode(Text,{},text)
}

function getShapFlag(type) {
  return typeof type === 'string' ? ShapeFlags.ELEMENT : ShapeFlags.STATEFUL_COMPONENT
}