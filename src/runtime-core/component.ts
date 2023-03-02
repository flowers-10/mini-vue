import { PublicInstanceProxyHandlers } from "./componentPublicInstance"
import { initProps } from "./componentProps"
import { shallowReadonly } from "../reactivity/reactive"
import {emit} from './componentEmit'
import { initSlots } from "./componentSlots"

export function createComponentInstance(vnode) {
  // 初始化组价
  const component = {
    vnode,
    type: vnode.type,
    setupState: {},
    props: {},
    slots:{},
    emit: (evnet) => {}
  }
  // 用户只要传事件名即可，bind已经把实例绑定到内部去调用了
  component.emit = emit.bind(null,component)

  return component
}

export function setupComponent(instance) {
  // TODO
  initProps(instance,instance.vnode.props)
  // 初始化插槽
  initSlots(instance,instance.vnode.children)
  setupStatefulComponent(instance)


}

function setupStatefulComponent(instance) {
  const Component = instance.type

  instance.proxy = new Proxy({_:instance}, PublicInstanceProxyHandlers)

  const { setup } = Component

  if (setup) {
    
    const setupResult = setup(shallowReadonly(instance.props),{
      emit:instance.emit,
    })

    handleSetupResult(instance, setupResult)
  }

}

function handleSetupResult(instance, setupResult) {
  // function object
  // TODO funciton

  if (typeof setupResult === "object") {
    instance.setupState = setupResult
  }

  finishComponentSetup(instance)
}

function finishComponentSetup(instance) {
  const Component = instance.type

  // if(Component.render) {
  instance.render = Component.render
  // }
}