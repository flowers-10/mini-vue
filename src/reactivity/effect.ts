import { extend } from "../shared";

export let activeEffect; //暂存传进的ReactiveEffect实例
export let shouldTrack;
const targetMap = new WeakMap(); //管理所有收集到的依赖，统一存取

class ReactiveEffect {
  private _fn;
  active = true;
  deps = [];
  onStop?: () => void;
  constructor(fn, public scheduler?) {
    this._fn = fn;
    this.scheduler = scheduler;
  }

  run() {
    // 3.因为默认shouldTrack= false
    // 4.调用了stop的时候直接执行了this._fn()
    // 5.但是shouldTrack是关上的
    if (!this.active) {
      return this._fn()
    }
    // 1.run的时候才会开启开关
    shouldTrack = true;
    activeEffect = this;
    const result = this._fn();
    // 2.reset,生成ReactiveEffect类时，我们都会默认调用 _effect.run()方法，所以每次执行完this._fn()后都会重置 shouldTrack = false

    shouldTrack = false;

    return result
  }
  stop() {
    if (this.active) {

      clearupEffect(this);
      if (this.onStop) {
        this.onStop()
      }
      this.active = false
    }
  }
}

function clearupEffect(effect) {
  const { deps } = effect
  if (deps.length) {
    for (let i = 0; i < deps.length; i++) {
      //因为是浅拷贝收集到的dep，所以这里删掉对应的dep就没有了，没有dep（二级分类）自然就无法触发run方法！
      deps[i].delete(effect)
    }
    deps.length = 0
  }
}

//依赖收集
export function track(target, key) {
  // 6.所以track就不能执行了
  // 而普通的run()时在调用track前 shouldTrack = true，所以可以执行track逻辑，等track结束，才把shouldTrack = false，但是不会影响track执行了因为已经执行过了~
  if (activeEffect && shouldTrack) {
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
    trackEffects(dep)
  }
}

export function trackEffects(dep) {
  if(dep.has(activeEffect)) return
  dep.add(activeEffect);
  //浅拷贝反向收集到dep
  activeEffect.deps.push(dep);
}

//依赖触发
export function trigger(target, key) {
  let depsMap = targetMap.get(target);
  //用stop时所有的dep都被删了
  let dep = depsMap.get(key);
  triggerEffects(dep)
}
export function triggerEffects(dep) {
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
export const effect = (fn, options: any = {}) => {
  const _effect = new ReactiveEffect(fn, options.scheduler);
  extend(_effect, options)
  _effect.run();
  const runner: any = _effect.run.bind(_effect);
  runner.effect = _effect;
  return runner;
};

// 停止函数
export const stop = (runner) => {
  runner.effect.stop();
};
