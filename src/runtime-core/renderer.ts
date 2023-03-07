import { ShapeFlags } from "../shared/ShapeFlags";
import { createComponentInstance, setupComponent } from "./component"
import { createAppAPI } from "./createApp";
import { Fragment, Text } from "./vnode";


// 自定义渲染器：通过用户传递的options解构出三个函数传参,利用闭包的特性返回一个render函数，而render函数会解析最后生成真实DOM
// ！！为什么要自定义渲染器？这样做可以在js生成元素时解耦html的节点操作，列如普通的element添加到父元素下用的是el.append()而el.append()是通过addChild添加的，所以自定义渲染器可以在自定义渲染的条件
// vue3默认通过runtime-dom中的createElement，patchProp，insert方法自定义了一个默认的渲染器
export function createRenderer(options) {
  // createElement: 生成element，通过传入的tag例如"div"生成一个dom
  // patchProp: 判断用户传入的props，然后给dom添加用户传入的这些属性和添加监听器listener
  // insert：渲染真实的DOM到父节点上
  const { createElement: hostCreateElement, patchProp: hostPatchProp, insert: hostInsert } = options

  // 渲染函数
  // 在进入渲染函数之前，会createVnode，所有的虚拟节点都会被打上标记，这个标记根据type决定
  function render(vnode, container) {
    // patch算法
    patch(vnode, container, null)
  }

  // patch算法主要用于识别vnode的type类型，然后递归的执行逻辑生成真实DOM
  function patch(vnode, container, parentComponent) {
    // 获取到vnode的type节点类型和shapeFlag标记
    const { type, shapeFlag } = vnode

    // Fragment -> 只渲染 children
    // 判断type
    switch (type) {
      // 如果是Fragment直接渲染内部的children
      case Fragment:
        processFragment(vnode, container, parentComponent)
        break;
      // 如果是单纯的一句text，直接渲染text
      case Text:
        processText(vnode, container)
        break;
      // 默认
      default:
        // 如果当前元素的标记 命中普通的元素（例如div标签）
        if (shapeFlag & ShapeFlags.ELEMENT) {
          // 开启一个渲染Element的进程
          processElement(vnode, container, parentComponent)
        
          // 如果当前元素的标记 命中组件 （例如 DialogComponent)
        } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
          // 开启一个渲染组件的进程
          processComponent(vnode, container, parentComponent)
        }
        break;
    }
  }

  // 渲染文本进程
  function processText(vnode, container) {
    // 直接拿到 children 即内容 （例如“你好”）
    const { children } = vnode
    // 生成dom元素
    const textNode = (vnode.el = document.createTextNode(children))
    // 挂载到 父节点 
    container.append(textNode)
  }
  // 渲染 Fragment 进程
  function processFragment(vnode, container, parentComponent) {
    // 挂载内部所有的children
    mountChildren(vnode, container, parentComponent)
  }

  // 渲染 元素 进程
  function processElement(vnode, container, parentComponent) {
    // init -> update
    // 挂载元素
    mountElement(vnode, container, parentComponent)
  }

  // 挂载元素
  function mountElement(vnode, container, parentComponent) {
    // vnode -> element -> div
    // 根据自定义渲染器传入的生成函数，生成一个dom节点
    const el = (vnode.el = hostCreateElement(vnode.type))
    // string or array
    const { children, shapeFlag } = vnode
    // 根据vnode上的shapeFlag类型判断
    // 如果是text就添加到属性里
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      el.textContent = children

      // 如果是数组说明内部还有子节点
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      // vnode
      // 继续挂载children
      // @params el   el是现阶段的自身dom节点，传入到mountChildren后就变成了它子元素的根节点了！
      // @params parentComponent 是父组件不是父dom节点
      mountChildren(vnode, el, parentComponent)
    }

    // 取出props
    const { props } = vnode
    // 拿出props对象中所有的key
    for (const key in props) {
      const val = props[key]
      // console.log(key);
      // on + Event name
      // onMousedown

      // 判断用户传入的props，然后给dom添加用户传入的属性和添加监听器listener
      hostPatchProp(el, key, val)
    }

    // container.append(el)
    // 最后挂载到父节点上
    // el是当前节点，container是父节点(例如第一次就是body节点)
    // container
    hostInsert(el, container)
  }

  // 挂载children
  function mountChildren(vnode, container, parentComponent) {
    // 把所有children的vonode都拿出，并且重新运行patch算法去识别内部的标记，根据标记渲染内部节点
    vnode.children.forEach((v) => {
      patch(v, container, parentComponent)
    })
  }

  // 渲染Component进程
  function processComponent(vnode, container, parentComponent) {
    // 挂载Component
    mountComponent(vnode, container, parentComponent)
  }

  // 挂载组件
  function mountComponent(initialVnode, container, parentComponent) {
    // 进入component.ts逻辑中
    // 初始化组件，并且返回当前组件的vnode实例
    const instance = createComponentInstance(initialVnode, parentComponent)
    //  setup组件，给实例添加props属性，添加prxoy属性，添加setupResult属性，添加render属性
    setupComponent(instance)
    // 处理组件内部的虚拟节点
    setupRenderEffect(instance, initialVnode, container)
  }

  // 处理组件内部的虚拟节点
  // 触发patch算法去递归所有组件虚拟节点内的 （组件和标签） 直到把整个组件都渲染出来为止！
  function setupRenderEffect(instance, initialVnode, container) {
    // 取出Proxy代理
    // 我们通过proxy代理可以准确的获得实例中的属性
    const { proxy } = instance
    // instance实例身上的render属性内部 的this 绑定 到proxy内部 的 this 上
    // 这么做的目的是为了能在render是访问setup定义的变量 
    // 例如 render内部(this.msg)  ===> 这个this 就会指向 setup中的(return {msg: "mini-vue-hahah",};)
    // 返回一个虚拟节点树 (举例：{type: 'div', props: {…}, children: Array(2), shapeFlag: 9, el: null} )
    const subTree = instance.render.call(proxy)
    // vnode-> patch
    // vnode -> element -> mountElement
    // 有了这个虚拟节点树我们就可以继续patch了
    // 重新patch，直到遍历成组件内部的元素节点，元素节点就进入mountElement，去生成真实DOM！
    // subTree： 父节点内的所有子虚拟节点
    // container： 容器，所有子节点会挂载到这个容器里面
    // instance： 当前的组件实例，会交给patch算法，这个instance主要是作为parent，为provide和inject服务，通过这个parent父组件的实例，我们就可以在子组件内部访问父组件provide提供的数据和函数了
    patch(subTree, container, instance)

    // element -> mount
    // 到这里肯定是所有节点都渲染完了，把子的虚拟节点给到 组件的虚拟节点
    initialVnode.el = subTree.el
  }

  return {
    createApp: createAppAPI(render)
  }
}