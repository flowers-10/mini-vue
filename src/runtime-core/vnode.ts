import { ShapFlags } from '../shared/ShapeFlags'

export function createVnode(type, props?, children?) {
  const vnode = {
    type,
    props,
    children,
    shapeFlag: getShapFlag(type),
    el: null
  }


  debugger
  // children
  if (typeof children === 'string') {
    vnode.shapeFlag |= ShapFlags.TEXT_CHILDREN
  }else if(Array.isArray(children)) {
    vnode.shapeFlag |=  ShapFlags.ARRAY_CHILDREN
  }
  return vnode
}

function getShapFlag(type) {
  return typeof type === 'string' ? ShapFlags.ELEMENT : ShapFlags.STATEFUL_COMPONENT
}