import { PublicInstanceProxyHandlers } from "./componentPublicInstance";
import { initProps } from "./componentProps";
import { shallowReadonly,proxyRefs } from "@guide-mini-vue/reactivity";
import { emit } from "./componentEmit";
import { initSlots } from "./componentSlots";

export function createComponentInstance(vnode, parent) {
  const component = {
    vnode, //当前的虚拟DOM
    type: vnode.type, //当前的组件类型，包含name: "App",render: ƒ render(),setup: ƒ setup()
    next: null,
    setupState: {}, // 存储 setup 的返回值
    props: {},
    slots: {}, // 存放插槽的数据
    provides: parent ? parent.provides : {}, //获取 parent 的 provides 作为当前组件的初始化值 这样就可以继承 parent.provides 的属性了
    parent, //父组件
    isMounted: false,
    subTree: {},
    emit: (evnet) => {}, //emit方法
  };
  // 用户只要传事件名即可，bind已经把实例绑定到组件内部去调用了
  component.emit = emit.bind(null, component);

  return component;
}

export function setupComponent(instance) {
  initProps(instance, instance.vnode.props);
  initSlots(instance, instance.vnode.children);

  setupStatefulComponent(instance);
}

function setupStatefulComponent(instance) {
  const Component = instance.type;
  instance.proxy = new Proxy({ _: instance }, PublicInstanceProxyHandlers);
  const { setup } = Component;

  if (setup) {
    setCurrentInstance(instance);
    const setupResult = setup(shallowReadonly(instance.props), {
      emit: instance.emit,
    });
    setCurrentInstance(null);
    handleSetupResult(instance, setupResult);
  }
}

function handleSetupResult(instance, setupResult) {
  if (typeof setupResult === "object") {
    instance.setupState = proxyRefs(setupResult);
  }

  finishComponentSetup(instance);
}

function finishComponentSetup(instance) {
  const Component = instance.type;
  if (compiler && !Component.render) {
    if (Component.template) {
      Component.render = compiler(Component.template);
    }
  }
  // template
  instance.render = Component.render;
}

let currentInstance = null;

export function getCurrentInstance() {
  return currentInstance;
}

export function setCurrentInstance(instance) {
  currentInstance = instance;
}

let compiler;

export function registerRuntimeCompiler(_compiler) {
  compiler = _compiler;
}
