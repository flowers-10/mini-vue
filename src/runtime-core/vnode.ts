import { ShapeFlags } from '../shared/ShapeFlags'

export function createVnode(type, props?, children?) {
  const vnode = {
    type,
    props,
    children,
    shapeFlag: getShapFlag(type),
    el: null
  }

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

function getShapFlag(type) {
  return typeof type === 'string' ? ShapeFlags.ELEMENT : ShapeFlags.STATEFUL_COMPONENT
}