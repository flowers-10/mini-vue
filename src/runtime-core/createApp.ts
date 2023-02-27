import {creatVnode} from './vnode'
import { render} from './renderer'


export function creatApp(rootComponent) {
  return {
    mount(rootContainer) {
      // 先转换成vnode
      // Component转换成vnode
      // 所有逻辑操作都基于vnode

      const vnode = creatVnode(rootComponent)
      render(vnode,rootContainer)
    }
  }
}