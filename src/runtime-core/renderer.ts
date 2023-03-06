import { ShapeFlags } from "../shared/ShapeFlags";
import { createComponentInstance, setupComponent } from "./component"
import { Fragment, Text } from "./vnode";


export function render(vnode, container) {
  // patch算法
  patch(vnode, container, null)
}

function patch(vnode, container, parentComponent) {
  const { type, shapeFlag } = vnode

  // Fragment -> 只渲染 children
  switch (type) {
    case Fragment:
      processFragment(vnode, container, parentComponent)
      break;
    case Text:
      processText(vnode, container)
      break;
    default:
      if (shapeFlag & ShapeFlags.ELEMENT) {
        processElement(vnode, container, parentComponent)
      } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
        processComponent(vnode, container, parentComponent)
      }
      break;
  }


}

function processText(vnode, container) {
  const { children } = vnode
  const textNode = (vnode.el = document.createTextNode(children))
  container.append(textNode)
}

function processFragment(vnode, container, parentComponent) {
  mountChildren(vnode, container, parentComponent)
}

function processElement(vnode, container, parentComponent) {
  // init -> update
  mountElement(vnode, container, parentComponent)
}

function mountElement(vnode, container, parentComponent) {
  // vnode -> element -> div
  const el = (vnode.el = document.createElement(vnode.type))
  // string or array
  const { children, shapeFlag } = vnode
  if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    el.textContent = children
  } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
    // vnode
    mountChildren(vnode, el, parentComponent)
  }

  // props
  const { props } = vnode
  for (const key in props) {
    const val = props[key]
    console.log(key);
    // on + Event name
    // onMousedown
    const isOn = (key: string) => /^on[A-Z]/.test(key)
    if (isOn(key)) {
      const event = key.slice(2).toLowerCase()
      el.addEventListener(event, val)
    } else {
      el.setAttribute(key, val)
    }
  }

  container.append(el)
}

function mountChildren(vnode, container, parentComponent) {
  vnode.children.forEach((v) => {
    patch(v, container, parentComponent)
  })
}

function processComponent(vnode, container, parentComponent) {
  mountComponent(vnode, container, parentComponent)
}

function mountComponent(initialVnode, container, parentComponent) {
  const instance = createComponentInstance(initialVnode, parentComponent)

  setupComponent(instance)
  setupRenderEffect(instance, initialVnode, container)
}

function setupRenderEffect(instance, initialVnode, container) {
  const { proxy } = instance
  const subTree = instance.render.call(proxy)

  // vnode-> patch
  // vnode -> element -> mountElement
  patch(subTree, container, instance)

  // element -> mount
  initialVnode.el = subTree.el
}