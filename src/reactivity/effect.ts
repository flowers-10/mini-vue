let activeEffect; //暂存传进的ReactiveEffect实例
const targetMap = new WeakMap(); //管理所有收集到的依赖，统一存取

class ReactiveEffect {
  private _fn;
  constructor(fn, public scheduler?) {
    this._fn = fn;
    this.scheduler = scheduler;
  }

  run() {
    activeEffect = this;
    return this._fn();
  }
}

//依赖收集
export function track(target, key) {
  let depsMap = targetMap.get(target);
  if (!depsMap) {
    depsMap = new Map();
    targetMap.set(target, depsMap);
  }

  let dep = depsMap.get(key);
  if (!dep) {
    dep = new Set();
    depsMap.set(key, dep);
  }
  dep.add(activeEffect);
}

//依赖触发
export function trigger(target, key) {
  let depsMap = targetMap.get(target);
  let dep = depsMap.get(key);
  for (let effect of dep) {
    // 当触发set时，如果有scheduler就执行scheduler
    if (effect.scheduler) {
      effect.scheduler();
      // 没有就触发ReactiveEffect实例的run方法
    } else {
      effect.run();
    }
  }
}

//响应式函数
export const effect = (fn, options:any = {}) => {
  const _effect = new ReactiveEffect(fn, options.scheduler);
  _effect.run();
  return _effect.run.bind(_effect);
};
