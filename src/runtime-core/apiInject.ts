import { getCurrentInstance } from './component'

// 提供
export function provide(key, value) {
  // 获取当前的组件实例
  const currentInstance: any = getCurrentInstance()
  if (currentInstance) {
    // 拿到自身的的provides
    let { provides } = currentInstance
    // 拿到父组件的provides
    const parentProvides = currentInstance.parent.provides

    // init
    // 如果自身的provides 等于 组件的parentProvides，说明当前实例上的provides没有变化
    if (provides === parentProvides) {
      // 通过原型链绑定到父parentProvides上
      provides = currentInstance.provides = Object.create(parentProvides)
    }
    // 如果不等于就返回实例provides属性内的值
    provides[key] = value
  }
}

// 注入
export function inject(key, defaultValue) {
  // 获取当前的组件实例 
  const currentInstance: any = getCurrentInstance()
  if (currentInstance) {
    // 获取组件的 parentProvides 及 父亲的 provides
    const parentProvides = currentInstance.parent.provides
    // 判断用户传入的key，取出对应的值
    if (key in parentProvides) {
      // 判断是函数，就执行函数并返回函数的返回值
      if (typeof parentProvides[key] === 'function') {
        return parentProvides[key]()
      }
      // 否则直接返回key对应的value
      return parentProvides[key]


      // 如果用户自己传入了一个默认值
    } else if (defaultValue) {
      // 判断是函数，就执行函数并返回函数的返回值
      if (typeof defaultValue === 'function') {
        return defaultValue()
      }
      // 否则直接返回用户传入的默认值
      return defaultValue
    }
  }
}