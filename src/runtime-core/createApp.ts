import { createVnode } from './vnode'
import { render } from './renderer'


export function createApp(rootComponent) {
  // debugger
  return {
    mount(rootContainer) {
      // 先转换成vnode
      // Component转换成vnode
      // 所有逻辑操作都基于vnode

      const vnode = createVnode(rootComponent)
      render(vnode, rootContainer)
    }
  }
}