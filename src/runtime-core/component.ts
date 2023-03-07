import { PublicInstanceProxyHandlers } from "./componentPublicInstance"
import { initProps } from "./componentProps"
import { shallowReadonly } from "../reactivity/reactive"
import { emit } from './componentEmit'
import { initSlots } from "./componentSlots"

// 创建一个组件实例
// vnode：虚拟节点
// parent：父组件（因为组件会有嵌套关系，所以要记录保存的父组件）
export function createComponentInstance(vnode, parent) {
  // console.log("createComponentInstance", parent);

  // 初始化组价
  const component = {
    vnode, //当前的虚拟DOM
    type: vnode.type, //当前的组件类型，包含name: "App",render: ƒ render(),setup: ƒ setup()
    setupState: {}, // 存储 setup 的返回值
    props: {},
    slots: {},// 存放插槽的数据
    provides: parent ? parent.provides : {},//获取 parent 的 provides 作为当前组件的初始化值 这样就可以继承 parent.provides 的属性了
    parent,//父组件
    emit: (evnet) => { }//emit方法
  }
  // 用户只要传事件名即可，bind已经把实例绑定到组件内部去调用了
  component.emit = emit.bind(null, component)

  return component
}

// setup组件，初始化props和slots，代理实例对象
export function setupComponent(instance) {
  // 初始化props，进入componentProps.ts
  // 取出vnode上的props给组件实例添加props属性
  initProps(instance, instance.vnode.props)
  // 初始化插槽
  initSlots(instance, instance.vnode.children)

  // 源码里面有两种类型的 component
  // 一种是基于 options 创建的
  // 还有一种是 function 的
  // 这里处理的是 options 创建的
  // 叫做 stateful 类型
  setupStatefulComponent(instance)
}

// 初始化一个有状态的组件
// 代理组件实例，执行setup，返回CurrentInstance当前组件实例
function setupStatefulComponent(instance) {
  // 这一步是为了找到setup
  const Component = instance.type

  // 代理组件实例返回一个当前的实例
  instance.proxy = new Proxy({ _: instance }, PublicInstanceProxyHandlers)
  // 取出组件中的setup
  const { setup } = Component

  // 拿到setup的返回值
  if (setup) {
    // 返回currentInstance即当前组件的实例
    setCurrentInstance(instance)
    // 获得setup的返回值，setup: ƒ setup()
    // 调用setup就能得到返回值，它接收2个参数，props和emit，我们把当前实例的props和emit传入即可
    const setupResult = setup(shallowReadonly(instance.props), {
      emit: instance.emit,
    })
    // 变null及时释放掉，减少内存压力
    setCurrentInstance(null)
    // 因为setupResult可以返回函数也可以返回object
    // 所以要判断setupResult是不是对象，是就存入到实例中
    handleSetupResult(instance, setupResult)
  }

}

// 判断setupResult结果是否是对象，是对象就把返回值赋值给实例
function handleSetupResult(instance, setupResult) {
  // function object
  // TODO funciton

  if (typeof setupResult === "object") {
    instance.setupState = setupResult
  }

  // 最后组件设置
  finishComponentSetup(instance)
}

// 给组件实例添加一个render属性
function finishComponentSetup(instance) {
  const Component = instance.type
  // 判断是否有render属性
  if (Component.render) {
    // 给实例添加render属性
    // console.log("finishComponentSetup:", Component.render);
    instance.render = Component.render
  }
}

let currentInstance = {};

// 获取CurrentInstance
export function getCurrentInstance() {
  return currentInstance
}

// 设置CurrentInstance
export function setCurrentInstance(instance) {
  currentInstance = instance;
}