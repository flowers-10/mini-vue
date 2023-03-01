import { PublicInstanceProxyHandlers } from "./componentPublicInstance"
import { initProps } from "./componentProps"
import { shallowReadonly } from "../reactivity/reactive"

export function createComponentInstance(vnode) {
  const component = {
    vnode,
    type: vnode.type,
    setupState: {},
    props: {}
  }
  return component
}

export function setupComponent(instance) {
  // TODO
  initProps(instance,instance.vnode.props)
  // initSlots()

  setupStatefulComponent(instance)


}

function setupStatefulComponent(instance) {
  const Component = instance.type

  instance.proxy = new Proxy({_:instance}, PublicInstanceProxyHandlers)

  const { setup } = Component

  if (setup) {
    
    const setupResult = setup(shallowReadonly(instance.props))

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