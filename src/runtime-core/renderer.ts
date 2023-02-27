import { createComponentInstance,setupComponent } from "./component"

export function render(vnode, container) {
  // patch
  patch(vnode, container)
}

function patch(vnode, container) {
  // TODO 判断 vnode是不是element
  // 是 element就处理element
  // 思考：如何区分element类型和component类型？
  // processElement()
  // 判断是不是 element类型
  processComponent(vnode, container)
}

function processComponent(vnode, container) {
  mountComponent(vnode,container)
}

function mountComponent(vnode,container) {
  const instance = createComponentInstance(vnode)

  setupComponent(instance)
  setupRenderEffect(instance,container)
}

function setupRenderEffect(instance,container) {
  const  subTree = instance.render()

  // vnode-> patch
  // vnode -> element -> mountElement
  patch(subTree,container)
}