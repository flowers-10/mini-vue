import { extend } from "../shared/extend";

let activeEffect; //暂存传进的ReactiveEffect实例
const targetMap = new WeakMap(); //管理所有收集到的依赖，统一存取

class ReactiveEffect {
  private _fn;
  active = true;
  deps = [];
  onStop? :() => void;
  constructor(fn, public scheduler?) {
    this._fn = fn;
    this.scheduler = scheduler;
  }

  run() {
    activeEffect = this;
    return this._fn();
  }
  stop() {
    if(this.active) {

      clearupEffect(this);
      if(this.onStop) {
        this.onStop()
      }
      this.active = false
    }
  }
}

function clearupEffect(effect) {
  effect.deps.forEach((dep: any) => {
    //因为是浅拷贝收集到的dep，所以这里删掉对应的dep就没有了，没有dep（二级分类）自然就无法触发run方法！
    dep.delete(effect);
  });
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
  if(!activeEffect) return
  dep.add(activeEffect);
  //浅拷贝反向收集到dep
  activeEffect.deps.push(dep);
}

//依赖触发
export function trigger(target, key) {
  let depsMap = targetMap.get(target);
  //用stop时所有的dep都被删了
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
export const effect = (fn, options: any = {}) => {
  const _effect = new ReactiveEffect(fn, options.scheduler);
  extend(_effect,options)
  _effect.run();
  const runner: any = _effect.run.bind(_effect);
  runner.effect = _effect;
  return runner;
};

// 停止函数
export const stop = (runner) => {
  runner.effect.stop();
};
