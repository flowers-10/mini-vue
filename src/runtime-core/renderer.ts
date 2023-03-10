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
    patch(null, vnode, container, null, null)
  }

  // n1 oldVnode 老的虚拟节点
  // n2 newVnode 新的虚拟节点
  function patch(n1, n2, container, parentComponent, anchor) {

    const { type, shapeFlag } = n2

    switch (type) {

      case Fragment:
        processFragment(n1, n2, container, parentComponent, anchor)
        break;

      case Text:
        processText(n1, n2, container)
        break;
      default:
        if (shapeFlag & ShapeFlags.ELEMENT) {

          processElement(n1, n2, container, parentComponent, anchor)

        } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {

          processComponent(n1, n2, container, parentComponent, anchor)
        }
        break;
    }
  }

  function processText(n1, n2, container) {
    const { children } = n2
    const textNode = (n2.el = document.createTextNode(children))
    container.append(textNode)
  }

  function processFragment(n1, n2, container, parentComponent, anchor) {
    mountChildren(n2.children, container, parentComponent, anchor)
  }

  function processElement(n1, n2, container, parentComponent, anchor) {
    // init -> update
    // 如果n1不存在说明没有更新
    if (!n1) {
      mountElement(n2, container, parentComponent, anchor)

      // 否则更新
    } else {
      // 对比新旧节点
      patchElement(n1, n2, container, parentComponent, anchor)
    }
  }

  // 这里对比新旧节点并且更新把旧dom删除或者替换成新节点的dom
  function patchElement(n1, n2, container, parentComponent, anchor) {
    console.log("patchElement开始新旧节点对比");
    console.log("n1老节点s", n1);
    console.log("n2新节点", n2);

    // 处理更新对比
    const oldProps = n1.props || EMPTY_OBJ
    const newProps = n2.props || EMPTY_OBJ

    const el = (n2.el = n1.el)

    // children
    patchChildren(n1, n2, el, parentComponent, anchor)
    // props
    patchProps(el, oldProps, newProps)
  }


  // 对比并且更新子节点
  function patchChildren(n1, n2, container, parentComponent, anchor) {
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
        mountChildren(c2, container, parentComponent, anchor)

        // 说明老节点是Array
      } else {
        // array diff array
        patchKeyedChildren(c1, c2, container, parentComponent, anchor)
      }
    }
  }

  // c1:老的children
  // c2:新的children
  // container节点挂载位置
  // parentComponent 父组件
  // parentAnchor 需要挂载的父锚点
  function patchKeyedChildren(c1, c2, container, parentComponent, parentAnchor) {
    const l2 = c2.length
    let i = 0;
    let e1 = c1.length - 1
    let e2 = l2 - 1

    // 判断节点是否相同
    function isSomeVnodeType(n1, n2) {
      return n1.type === n2.type && n1.key === n2.key
    }

    // 1.左侧对比
    while (i <= e1 && i <= e2) {
      const n1 = c1[i]
      const n2 = c2[i]

      // 说明两个节点相同的type和key相同
      if (isSomeVnodeType(n1, n2)) {
        // 继续遍历内部是否相同
        // console.log('左侧对比：两个节点相同，开始深度遍历该节点内部是否相同');
        patch(n1, n2, container, parentComponent, parentAnchor)
      } else {
        // 跳出循环i就不会++了
        break
      }
      i++
    }

    // 2.右侧对比
    while (i <= e1 && i <= e2) {
      const n1 = c1[e1]
      const n2 = c2[e2]

      // 说明两个节点相同的type和key相同
      if (isSomeVnodeType(n1, n2)) {
        // 继续遍历内部是否相同
        // console.log('右侧对比：两个节点相同，开始深度遍历该节点内部是否相同');
        patch(n1, n2, container, parentComponent, parentAnchor)
      } else {
        // 跳出循环e1 e2 就不会--了
        break
      }
      e1--
      e2--
    }

    // 3.新的比老的多 创建
    if (i > e1) {
      if (i <= e2) {
        // 锚点就在c2（新节点内的children）上 + 1
        // 这样dom就在锚点上创建了
        const nextPos = e2 + 1
        const anchor = nextPos < l2 ? c2[nextPos].el : null
        while (i <= e2) {
          // 新节点根据锚点重新patch，最终挂载到dom上
          // console.log("新的节点比老的节点多，深度遍历把该dom树渲染");
          patch(null, c2[i], container, parentComponent, anchor)
          i++
        }
      }

      // 4.新的比老的少 删除
      // 如果i 大于 e2 说明新节点children的长度比 老节点children的长度少
    } else if (i > e2) {
      // 遍历老节点children
      while (i <= e1) {
        // 删除 大于新节点（比如新节点4个dom）又小于老节点（6个dom）的 dom（删掉多出来的一个dom）
        // console.log("新的节点比老的节点少，直接删除当前dom");
        hostRemove(c1[i].el)
        // i++ 再进入一次循环（下次就会又删除一个dom，直到删到新节点长度为止）
        i++
      }

      // 5.中间部分的 乱序 说明不知道节点顺序 
    } else {
      // 中间乱序部分的对比
      // console.log("双端对比结束！");
      // console.log("开始中间部分的乱序对比！");

      let s1 = i //记录老节点通过双端对比后，乱序开始的第一个child开始的位置
      let s2 = i //记录新节点通过双端对比后，乱序开始的第一个child开始的位置

      // 当前乱序部分新节点的总长度
      const toBePatched = e2 - s2 + 1
      // 老节点内child 出现在 新节点内的次数
      let patched = 0

      // 通过hash表保存新虚拟DOM数内child的位置 例如({'D'=>2,'C'=>3,'Y'=>4,'E'=>5})
      // 那么可以通过映射的key.get对比老节点key如果有说明 老节点的child出现在新节点里面了
      // 所以key可以减少vue3的一层循环,不写key只能每一个都去遍历了
      const keyToNewIndexMap = new Map()

      // 映射表初始化，根据新节点chilren的长度创建一个映射表
      const newIndexToOldIndexMap = new Array(toBePatched)
      // 确认移动
      let moved = false
      // 记录新老节点对比后，新节点移动到的最远的距离
      let maxNewIndexSoFar = 0
      for (let i = 0; i < toBePatched; i++) newIndexToOldIndexMap[i] = 0


      // 把新节点内children的key映射到map表中
      for (let i = s2; i <= e2; i++) {
        // 找到所有新节点的child
        const nextChild = c2[i]
        // 把所有新节点child的key全部存入hash表，值就是当前key的下标，用于给到newIndex，newIndex就可以记录新老节点相同child在新节点的下标了
        keyToNewIndexMap.set(nextChild.key, i)
      }

      //遍历老节点的DOM树 ,从老DOM树和新DOM树双端对比去掉两端相同后，老节点中间部分左侧开始遍历
      for (let i = s1; i <= e1; i++) {
        // 获得老DOM上第i个child
        const prevChild = c1[i]
        // console.log("当前老DOM树上要开始和新DOM树对比的节点！！", prevChild);

        // 如果老节点在新节点相同child出现次数 大于 新节点的chilren的数量，说明新节点内出现的相同的节点已经被遍历完了
        if (patched >= toBePatched) {
          // 那么直接删除老节点内多出来的child节点即可，因为他们不会出现在新节点内了
          // console.log("因为超出长度删除的节点!!!", prevChild.el);

          hostRemove(prevChild.el)
          // 跳过下面的逻辑，进入下一轮循环
          continue
        }

        // 定义一个下标，记录老节点的child是否出现在新节点children里面过，如果出现了这个下标就是新节点内child的下标
        let newIndex

        // 说明用户填了key，那么直接在map表里找（所以性能优化一定要填写key，否则只能进入else，又增加了一层遍历浪费性能）
        // 最终得到当前的下标，我们可以对这个下标处理是否删除还是移动还是添加
        if (prevChild.key !== null) {
          // 那么直接通过新节点的map表去查找有没有老节点的key，有就把新节点child的坐标保存下来
          newIndex = keyToNewIndexMap.get(prevChild.key)


        // 用户没填key那只能去新节点里遍历出每一个child和当前老节点的child全量对比了
        } else {
          for (let j = s2; j < e2; j++) {
            // 如果当前老节点的child 和 新节点children中的某个child 的type或者key相同
            if (isSomeVnodeType(prevChild, c2[j])) {
              // 说明出现在了新节点里，我们给他一个标记，并且退出当前循环即可
              newIndex = j
              break
            }
          }
        }

        // 说明当前老虚拟DOM树中的child没有出现在新虚拟DOM树里面过
        if (newIndex === undefined) {
          // 那么删除当前这个节点即可
          // console.log('对比中删除的节点', prevChild.el);
          hostRemove(prevChild.el)
          // 说明老节点的children中的child在新节点里出现了！
          // 那么继续深层的对比这两个child里面的children和props等是否也相同
        } else {
          // 如果这次循环中当前新DOM树的的child节点位置 大于 最远移动距离，那么当前移动的距离 就是 最远移动过的距离
          if (newIndex >= maxNewIndexSoFar) {
            maxNewIndexSoFar = newIndex

          // 如果这次循环中当前新DOM树的的child节点位置 小于 最远移动距离，说明当前节点对比老dom数中节点的位置 它的位置肯定 变化过了
          } else {
            // 标记这个节点移动过
            moved = true
          }
          // 老虚拟DOM树的child在新节点里出现
          // 给映射表存入
          // newIndex - s2 就是算出新DOM树中去掉双端后，在新DOM树中间部分的 下标位置
          // i+1 表示当前这个老的VNode节点在老DOM树的总长度下的 下标位置 再 + 1
          newIndexToOldIndexMap[newIndex - s2] = i + 1;
          // 继续深层递归调用patch算法对比当前新旧VNode
          patch(prevChild, c2[newIndex], container, parentComponent, null)
          // 给patched标记+1 ，说明对比新老节点的次数
          patched++
        }

      }

      // 生成最长递增子序列
      console.log(newIndexToOldIndexMap);
      // 举例:newIndexToOldIndexMap = [5,3,4] 
      // 代表老DOM树的第4个节点现在 在 新DOM树去掉双端后 中间部分 的第一个位置
      // 生成的最长递增子序列就是 [1,2]
      // 这里做了优化，如果没有移动过那就不用求最长子序列，直接创建多余的节点即可，如果移动过了，再求最长子序列
      const increasingNewIndexSequence = moved ? getSequence(newIndexToOldIndexMap) : []
      // 最长递增子序列的指针
      let j = increasingNewIndexSequence.length - 1
      // 新节点的序列 和 最长递增子序列进行对比，从右往左对比
      // 为什么要倒序对比？因为从最右侧开始对比可以保证锚点的正确性！
      // 双指针对比
      // i 新节点上的指针
      // j 最长递增子序列的指针
      for (let i = toBePatched - 1; i >= 0; i--) {
        // 获得当前新DOM树上 去掉双端乱序部分  开始的节点坐标位置
        const nextIndex = s2 + i
        // 获得新DOM树上的这个VNode
        const nextChild = c2[nextIndex]
        // nextIndex + 1 < l2 :如果当前新DOM树的右侧部分下标+1 < 新节点的length（数组内的最末尾坐标+1 === length）说明它在新DOM树的范围内，直接找到当前节点的后一位做锚点，然后插入到这个锚点上就可以了
        // nextIndex + 1 > l2 ：说明它当前的坐标超出了新DOM数的长度，那么就往直接在新DOM树最后面生成这个DOM
        const anchor = nextIndex + 1 < l2 ? c2[nextIndex + 1].el : parentAnchor

        // 如果等于0说明在老虚拟DOM中根本不存在，那么创建一个新的DOM
        if(newIndexToOldIndexMap[i] === 0) {
          patch(null,nextChild,container,parentComponent,anchor)
        }else if (moved) {
          // 如果j指针已经是负数，说明当前节点已经超出了子序列，那就肯定要移动位置了
          // 或者如果新节点上的指针不在最长递增子序列里说明这个节点肯定是要移动位置了
          // 如果当前节点在最长递增子序列里，我们就不能移动位置，要保持这个最长递增子序列顺序永远不变即可
          if (j < 0 || increasingNewIndexSequence[j] !== i) {
            console.log('移动位置');
            hostInsert(nextChild.el, container, anchor)
            // 否则最长子序列的指针向下移动一位
          } else {
            j--
          }
        }


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

  function mountElement(vnode, container, parentComponent, anchor) {
    const el = (vnode.el = hostCreateElement(vnode.type))
    // string or array
    const { children, shapeFlag } = vnode
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      el.textContent = children

    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(vnode.children, el, parentComponent, anchor)
    }

    const { props } = vnode
    for (const key in props) {
      const val = props[key]
      hostPatchProp(el, key, null, val)
    }

    hostInsert(el, container, anchor)
  }

  function mountChildren(children, container, parentComponent, anchor) {
    children.forEach((v) => {
      patch(null, v, container, parentComponent, anchor)
    })
  }

  function processComponent(n1, n2, container, parentComponent, anchor) {
    mountComponent(n2, container, parentComponent, anchor)
  }

  function mountComponent(initialVnode, container, parentComponent, anchor) {
    const instance = createComponentInstance(initialVnode, parentComponent)

    setupComponent(instance)

    setupRenderEffect(instance, initialVnode, container, anchor)
  }

  function setupRenderEffect(instance, initialVnode, container, anchor) {
    // 通过响应式副作用函数绑定整个更新的流程
    // 当响应触发set操作时，捕获器就会重新触发依赖执行effect内部的函数
    effect(() => {
      // 通过实例的isMounted判断 是初始化 还是更新
      if (!instance.isMounted) {
        // console.log('init');

        const { proxy } = instance
        // 修改：给实例添加一个subTree属性保存当前所有子虚拟节点
        // 下次更新时就可以通过实例中的subTree属性对比新的subTree属性
        const subTree = (instance.subTree = instance.render.call(proxy))
        // 初始化不存在老节点
        patch(null, subTree, container, instance, anchor)

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
        patch(prevSubTree, subTree, container, instance, anchor)

      }
    })

  }

  return {
    createApp: createAppAPI(render)
  }
}




// 最长递增子序列
function getSequence(arr: number[]): number[] {
  const p = arr.slice()
  const result = [0]
  let i, j, u, v, c
  const len = arr.length
  for (i = 0; i < len; i++) {
    const arrI = arr[i]
    if (arrI !== 0) {
      j = result[result.length - 1]
      if (arr[j] < arrI) {
        p[i] = j
        result.push(i)
        continue
      }
      u = 0
      v = result.length - 1
      while (u < v) {
        c = (u + v) >> 1
        if (arr[result[c]] < arrI) {
          u = c + 1
        } else {
          v = c
        }
      }
      if (arrI < arr[result[u]]) {
        if (u > 0) {
          p[i] = result[u - 1]
        }
        result[u] = i
      }
    }
  }
  u = result.length
  v = result[u - 1]
  while (u-- > 0) {
    result[u] = v
    v = p[v]
  }
  return result
}