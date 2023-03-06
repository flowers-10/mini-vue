import {hasOwn} from '../shared'

// 保存记录用户保存的slots等
const publicPropertiesMap = {
  // 当用户调用 instance.proxy.$emit 时就会触发这个函数
  // i 就是 instance 的缩写 也就是组件实例对象
  $el: (i) => i.vnode.el,
  // 实现插槽
  $slots:(i) => i.slots,
}


// 处理公共的Proxy实例
export const PublicInstanceProxyHandlers = {
  get({ _: instance }, key) {
    //  setupState
    const { setupState, props } = instance
    // 如果setupState有返回值，就通过key取出
    if(hasOwn(setupState, key)) {
      return setupState[key]

      // 没有返回值，就通过key返回props的数据
    }else if(hasOwn(props, key)) {
      return props[key]
    }

    const publicGetter = publicPropertiesMap[key]
    // 如果用户取的是emit，el等
    if (publicGetter) {
      // 就根据key调用得到slots或者el
      return publicGetter(instance)
    }

  },
}