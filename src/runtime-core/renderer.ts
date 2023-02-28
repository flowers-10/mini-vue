import { isObject } from "../shared";
import { createComponentInstance, setupComponent } from "./component"
import { createVnode } from "./vnode";

export function render(vnode, container) {
  // patch
  patch(vnode, container)
}

function patch(vnode, container) {
  // TODO 判断 vnode是不是element
  // 是 element就处理element
  // 思考：如何区分element类型和component类型？
  console.log(vnode.type);
  if (typeof vnode.type === 'string') {
    processElement(vnode, container)
  } else if (isObject(vnode.type)) {
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
  const { children } = vnode
  if (typeof children === "string") {
    el.textContent = children
  } else if (Array.isArray(children)) {
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
  setupRenderEffect(instance,initialVnode, container)
}

function setupRenderEffect(instance,initialVnode, container) {
  const { proxy } = instance
  const subTree = instance.render.call(proxy)

  // vnode-> patch
  // vnode -> element -> mountElement
  patch(subTree, container)

  // element -> mount
  initialVnode.el = subTree.el 
}