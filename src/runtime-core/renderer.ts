import { effect } from "../reactivity/effect";
import { ShapeFlags } from "../shared/ShapeFlags";
import { createComponentInstance, setupComponent } from "./component"
import { createAppAPI } from "./createApp";
import { Fragment, Text } from "./vnode";
import { EMPTY_OBJ } from '../shared'


export function createRenderer(options) {
  const {
    createElement: hostCreateElement,
    patchProp: hostPatchProp,
    insert: hostInsert,
    remove: hostRemove,
    setElementText: hostSetElementText
  } = options
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
    mountChildren(n2.children, container, parentComponent)
  }

  function processElement(n1, n2, container, parentComponent) {
    // init -> update
    // 如果n1不存在说明没有更新
    if (!n1) {
      mountElement(n2, container, parentComponent)

      // 否则更新
    } else {
      // 对比新旧节点
      patchElement(n1, n2, container, parentComponent)
    }
  }

  // 这里对比新旧节点并且更新把旧dom删除或者替换成新节点的dom
  function patchElement(n1, n2, container, parentComponent) {
    console.log("patchElement");
    console.log("n1", n1);
    console.log("n2", n2);

    // 处理更新对比
    const oldProps = n1.props || EMPTY_OBJ
    const newProps = n2.props || EMPTY_OBJ

    const el = (n2.el = n1.el)

    // children
    patchChildren(n1, n2, el, parentComponent)
    // props
    patchProps(el, oldProps, newProps)
  }


  // 对比并且更新子节点
  function patchChildren(n1, n2, container, parentComponent) {
    const prevShapeFlag = n1.shapeFlag
    const c1 = n1.children
    const shapeFlag = n2.shapeFlag
    const c2 = n2.children

    // 说明新节点children是text
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      // 说明老节点children是数组
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        // 移除老节点
        unmountChildren(c1)
      }
      // 说明新老节点的text不同
      if (c1 !== c2) {
        // 替换新节点的text
        hostSetElementText(container, c2)
      }

      // 说明新节点是一个数组
    } else {
      // 说明老节点是text
      if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
        // 清空老节点的text
        hostSetElementText(container, "")
        // 渲染新节点数组内的所有子节点
        mountChildren(c2, container, parentComponent)

        // 说明老节点是Array
      }else {

      }
    }
  }

  // 移除所有子节点
  function unmountChildren(children) {
    // 获得老节点内的所有子节点
    // 移除这些子节点
    for (let i = 0; i < children.length; i++) {
      const el = children[i].el
      hostRemove(el)
    }
  }

  // 在这一步更新新节点的props属性
  function patchProps(el, oldProps, newProps) {
    // 只有两个节点不同时才需要对比具体的那些属性需要修改
    if (oldProps !== newProps) {
      for (const key in newProps) {
        const prevProp = oldProps[key]
        const nextProp = newProps[key]
        // 新老属性不同，说明用户修改了属性
        if (prevProp !== nextProp) {
          hostPatchProp(el, key, prevProp, nextProp)
        }
      }
      // 老节点是空的，新节点就不能删除属性了。所以要判断不空的老节点才可以删属性
      if (oldProps !== EMPTY_OBJ) {
        for (const key in oldProps) {
          // 老节点的key不在新节点内，说明新节点删除了属性
          if (!(key in newProps)) {
            hostPatchProp(el, key, oldProps[key], null)
          }
        }
      }

    }
  }

  function mountElement(vnode, container, parentComponent) {
    const el = (vnode.el = hostCreateElement(vnode.type))
    // string or array
    const { children, shapeFlag } = vnode
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      el.textContent = children

    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(vnode.children, el, parentComponent)
    }

    const { props } = vnode
    for (const key in props) {
      const val = props[key]
      hostPatchProp(el, key, null, val)
    }

    hostInsert(el, container)
  }

  function mountChildren(children, container, parentComponent) {
    children.forEach((v) => {
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