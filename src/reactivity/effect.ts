import { extend } from "../shared";

export let activeEffect; //暂存传进的ReactiveEffect实例
export let shouldTrack; // 控制track依赖收集
const targetMap = new WeakMap(); //管理所有收集到的依赖，统一存取

export class ReactiveEffect {
  private _fn;
  active = true;
  deps = [];
  onStop?: () => void;
  constructor(fn, public scheduler?) {
    this._fn = fn;
    this.scheduler = scheduler;
  }

  run() {
    // 如果active开关关上的就直接执行 fn，执行fn，它会触发get捕获器，但是因为shouldtrack而不会收集依赖
    if (!this.active) {
      return this._fn()
    }
    // shouldTrack可以有效的控制依赖收集，只有在run内部才会收集依赖
    shouldTrack = true;
    activeEffect = this;
    //这里执行fn时，get捕获器就会依赖收集，因为shouldTrack开启了
    const result = this._fn();

    // 收集完依赖就关上开关，防止其他操作get时又依赖收集
    shouldTrack = false;

    return result
  }
  stop() {
    // 开关开启才清空依赖，否则说明没有需要清空的依赖
    if (this.active) {
      // 清空依赖
      clearupEffect(this);
      // 如果用户传入了onstop选项就执行onstop
      if (this.onStop) {
        this.onStop()
      }
      // 清空完就关上开关，下次不用清空了
      this.active = false
    }
  }
}


// 清理所有收集到的依赖
function clearupEffect(effect) {
  const { deps } = effect
  if (deps.length) {
    for (let i = 0; i < deps.length; i++) {
      deps[i].delete(effect)
    }
    deps.length = 0
  }
}

//依赖收集
export function track(target, key) {
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

// ref的依赖收集，因为ref只处理基础类型的数据，所以它的仓库没有target和key的
export function trackEffects(dep) {
  if(dep.has(activeEffect)) return
  dep.add(activeEffect);
  //浅拷贝反向收集到dep
  activeEffect.deps.push(dep);
}

//依赖触发
export function trigger(target, key) {
  // 查找dep
  let depsMap = targetMap.get(target);
  if(!depsMap) return
  //用stop时所有的dep都被删了
  let dep = depsMap.get(key);
  triggerEffects(dep)
}

// ref的依赖触发，因为ref只处理基础类型，所以它的仓库没有target和key的
export function triggerEffects(dep) {
  for (let effect of dep) {
    // 当触发set操作时，如果有scheduler就执行scheduler
    if (effect.scheduler) {
      effect.scheduler();
      // 没有就触发ReactiveEffect实例的run方法
    } else {
      effect.run();
    }
  }
}


//响应式副作用函数
export const effect = (fn, options: any = {}) => {
  // 实例
  const _effect = new ReactiveEffect(fn, options.scheduler);
  // 把配置项合并到当前的实例中
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
