import { isObject } from "../shared";
import { ShapFlags } from "../shared/ShapeFlags";
import { createComponentInstance, setupComponent } from "./component"


export function render(vnode, container) {
  // patch
  patch(vnode, container)
}

function patch(vnode, container) {
  const { shapeFlag } = vnode
  if (shapeFlag & ShapFlags.ELEMENT) {
    processElement(vnode, container)
  } else if (shapeFlag & ShapFlags.STATEFUL_COMPONENT) {
    processComponent(vnode, container)
  }
}

function processElement(vnode, container) {
  // init -> update
  mountElement(vnode, container)
}

function mountElement(vnode, container) {
  // vnode -> element -> div
  const el = (vnode.el = document.createElement(vnode.type))
  // string or array
  const { children, shapeFlag } = vnode
  if (shapeFlag & ShapFlags.TEXT_CHILDREN) {
    el.textContent = children
  } else if (shapeFlag & ShapFlags.ARRAY_CHILDREN) {
    // vnode
    mountChildren(children, el)
  }

  // props
  const { props } = vnode
  for (const key in props) {
    const val = props[key]
    el.setAttribute(key, val)
  }

  container.append(el)
}

function mountChildren(vnode, container) {
  vnode.forEach((v) => {
    patch(v, container)
  })
}

function processComponent(vnode, container) {
  mountComponent(vnode, container)
}

function mountComponent(initialVnode, container) {
  const instance = createComponentInstance(initialVnode)

  setupComponent(instance)
  setupRenderEffect(instance, initialVnode, container)
}

function setupRenderEffect(instance, initialVnode, container) {
  const { proxy } = instance
  const subTree = instance.render.call(proxy)

  // vnode-> patch
  // vnode -> element -> mountElement
  patch(subTree, container)

  // element -> mount
  initialVnode.el = subTree.el
}