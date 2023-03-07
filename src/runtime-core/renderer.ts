import { effect } from "../reactivity/effect";
import { ShapeFlags } from "../shared/ShapeFlags";
import { createComponentInstance, setupComponent } from "./component"
import { createAppAPI } from "./createApp";
import { Fragment, Text } from "./vnode";


export function createRenderer(options) {
  const { createElement: hostCreateElement, patchProp: hostPatchProp, insert: hostInsert } = options
  function render(vnode, container) {
    patch(null, vnode, container, null)
  }

  // n1 oldVnode 老的虚拟节点
  // n2 newVnode 新的虚拟节点
  function patch(n1, n2, container, parentComponent) {

    const { type, shapeFlag } = n2

    switch (type) {

      case Fragment:
        processFragment(n1, n2, container, parentComponent)
        break;

      case Text:
        processText(n1, n2, container)
        break;
      default:
        if (shapeFlag & ShapeFlags.ELEMENT) {

          processElement(n1, n2, container, parentComponent)

        } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {

          processComponent(n1, n2, container, parentComponent)
        }
        break;
    }
  }

  function processText(n1, n2, container) {
    const { children } = n2
    const textNode = (n2.el = document.createTextNode(children))
    container.append(textNode)
  }

  function processFragment(n1, n2, container, parentComponent) {
    mountChildren(n2, container, parentComponent)
  }

  function processElement(n1, n2, container, parentComponent) {
    // init -> update
    // 如果n1不存在说明没有更新
    if (!n1) {
      mountElement(n2, container, parentComponent)

      // 否则更新
    } else {
      patchElement(n1, n2, container)
    }
  }

  function patchElement(n1, n2, container) {
    console.log("patchElement");
    console.log("n1", n1);
    console.log("n2", n2);
    // 处理更新对比
    // props
    // children
  }


  function mountElement(vnode, container, parentComponent) {
    const el = (vnode.el = hostCreateElement(vnode.type))
    // string or array
    const { children, shapeFlag } = vnode
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      el.textContent = children

    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(vnode, el, parentComponent)
    }

    const { props } = vnode
    for (const key in props) {
      const val = props[key]
      hostPatchProp(el, key, val)
    }

    hostInsert(el, container)
  }

  function mountChildren(vnode, container, parentComponent) {
    vnode.children.forEach((v) => {
      patch(null, v, container, parentComponent)
    })
  }

  function processComponent(n1, n2, container, parentComponent) {
    mountComponent(n2, container, parentComponent)
  }

  function mountComponent(initialVnode, container, parentComponent) {
    const instance = createComponentInstance(initialVnode, parentComponent)

    setupComponent(instance)

    setupRenderEffect(instance, initialVnode, container)
  }

  function setupRenderEffect(instance, initialVnode, container) {
    // 通过响应式副作用函数绑定整个更新的流程
    // 当响应触发set操作时，捕获器就会重新触发依赖执行effect内部的函数
    effect(() => {
    // 通过实例的isMounted判断 是初始化 还是更新
      if (!instance.isMounted) {
        console.log('init');

        const { proxy } = instance
        // 修改：给实例添加一个subTree属性保存当前所有子虚拟节点
        // 下次更新时就可以通过实例中的subTree属性对比新的subTree属性
        const subTree = (instance.subTree = instance.render.call(proxy))
        // 初始化不存在老节点
        patch(null, subTree, container, instance)

        initialVnode.el = subTree.el

        instance.isMounted = true
      } else {
        // 更新阶段
        console.log('uptade');
        const { proxy } = instance
        // 本次新的虚拟节点
        const subTree = instance.render.call(proxy)
        // 上次老的虚拟节点
        const prevSubTree = instance.subTree
        instance.subTree = subTree
        // 交给patch算法去对比两个节点，只更新数据变化的节点
        patch(prevSubTree, subTree, container, instance)

      }
    })

  }

  return {
    createApp: createAppAPI(render)
  }
}