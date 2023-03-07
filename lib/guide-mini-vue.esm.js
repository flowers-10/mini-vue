const Fragment = Symbol("Fragment");
const Text = Symbol("Text");
function createVnode(type, props, children) {
    const vnode = {
        type,
        props,
        children,
        shapeFlag: getShapFlag(type),
        el: null //初始化时是null
    };
    // console.log(vnode);
    // children
    if (typeof children === 'string') {
        vnode.shapeFlag |= 4 /* ShapeFlags.TEXT_CHILDREN */;
    }
    else if (Array.isArray(children)) {
        vnode.shapeFlag |= 8 /* ShapeFlags.ARRAY_CHILDREN */;
    }
    if (vnode.shapeFlag & 2 /* ShapeFlags.STATEFUL_COMPONENT */) {
        if (typeof children === "object") {
            vnode.shapeFlag |= 16 /* ShapeFlags.SOLT_CHILDREN */;
        }
    }
    return vnode;
}
function createTextVNode(text) {
    return createVnode(Text, {}, text);
}
function getShapFlag(type) {
    return typeof type === 'string' ? 1 /* ShapeFlags.ELEMENT */ : 2 /* ShapeFlags.STATEFUL_COMPONENT */;
}

function h(type, props, children) {
    return createVnode(type, props, children);
}

// 用户主动传入参数去渲染组件
// 这个函数相当于 template中的 <slot/>标签，是一个占位符
// 所以renderSlots在子组件的哪个位置，vue就会把插槽渲染到哪里
function renderSlots(slots, name, props) {
    // 具名插槽
    const slot = slots[name];
    if (slot) {
        // function
        if (typeof slot === "function") {
            // 返回一个插槽的虚拟节点,props是作用域插槽的实现
            return createVnode("div", {}, slot(props));
        }
    }
}

// 合并对象
const extend = Object.assign;
// 判断是否是个对象
function isObject(val) {
    return val !== null && typeof val === 'object';
}
// 判断对象是否改变
const hasChanged = (val, newVal) => {
    return !Object.is(val, newVal);
};
// 判断对象是否拥有key
const hasOwn = (val, key) => Object.prototype.hasOwnProperty.call(val, key);
// 转驼峰
const camelize = (str) => {
    return str.replace(/-(\w)/g, (_, c) => {
        return c ? c.toUpperCase() : "";
    });
};
//   add -> Add 小写转大写
const capitalize = (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
};
// 给Add添加on
const toHandlerKey = (str) => {
    return str ? "on" + capitalize(str) : '';
};

const publicPropertiesMap = {
    $el: (i) => i.vnode.el,
    $slots: (i) => i.slots,
};
const PublicInstanceProxyHandlers = {
    get({ _: instance }, key) {
        const { setupState, props } = instance;
        if (hasOwn(setupState, key)) {
            return setupState[key];
        }
        else if (hasOwn(props, key)) {
            return props[key];
        }
        const publicGetter = publicPropertiesMap[key];
        if (publicGetter) {
            return publicGetter(instance);
        }
    },
};

function initProps(instance, rawProps) {
    instance.props = rawProps || {};
}

let activeEffect; //暂存传进的ReactiveEffect实例
let shouldTrack; // 控制track依赖收集
const targetMap = new WeakMap(); //管理所有收集到的依赖，统一存取
class ReactiveEffect {
    constructor(fn, scheduler) {
        this.scheduler = scheduler;
        this.active = true;
        this.deps = [];
        this._fn = fn;
        this.scheduler = scheduler;
    }
    run() {
        // 如果active开关关上的就直接执行 fn，执行fn，它会触发get捕获器，但是因为shouldtrack而不会收集依赖
        if (!this.active) {
            return this._fn();
        }
        // shouldTrack可以有效的控制依赖收集，只有在run内部才会收集依赖
        shouldTrack = true;
        activeEffect = this;
        //这里执行fn时，get捕获器就会依赖收集，因为shouldTrack开启了
        const result = this._fn();
        // 收集完依赖就关上开关，防止其他操作get时又依赖收集
        shouldTrack = false;
        return result;
    }
    stop() {
        // 开关开启才清空依赖，否则说明没有需要清空的依赖
        if (this.active) {
            // 清空依赖
            clearupEffect(this);
            // 如果用户传入了onstop选项就执行onstop
            if (this.onStop) {
                this.onStop();
            }
            // 清空完就关上开关，下次不用清空了
            this.active = false;
        }
    }
}
// 清理所有收集到的依赖
function clearupEffect(effect) {
    const { deps } = effect;
    if (deps.length) {
        for (let i = 0; i < deps.length; i++) {
            deps[i].delete(effect);
        }
        deps.length = 0;
    }
}
//依赖收集
function track(target, key) {
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
        trackEffects(dep);
    }
}
// ref的依赖收集，因为ref只处理基础类型的数据，所以它的仓库没有target和key的
function trackEffects(dep) {
    if (dep.has(activeEffect))
        return;
    dep.add(activeEffect);
    //浅拷贝反向收集到dep
    activeEffect.deps.push(dep);
}
//依赖触发
function trigger(target, key) {
    // 查找dep
    let depsMap = targetMap.get(target);
    if (!depsMap)
        return;
    //用stop时所有的dep都被删了
    let dep = depsMap.get(key);
    triggerEffects(dep);
}
// ref的依赖触发，因为ref只处理基础类型，所以它的仓库没有target和key的
function triggerEffects(dep) {
    for (let effect of dep) {
        // 当触发set操作时，如果有scheduler就执行scheduler
        if (effect.scheduler) {
            effect.scheduler();
            // 没有就触发ReactiveEffect实例的run方法
        }
        else {
            effect.run();
        }
    }
}
//响应式副作用函数
const effect = (fn, options = {}) => {
    // 实例
    const _effect = new ReactiveEffect(fn, options.scheduler);
    // 把配置项合并到当前的实例中
    extend(_effect, options);
    _effect.run();
    const runner = _effect.run.bind(_effect);
    runner.effect = _effect;
    return runner;
};

const get = createGetter();
const set = createSetter();
const readonlyGet = createGetter(true);
const shallowReadOnlyGet = createGetter(true, true);
function createGetter(isReadonly = false, shallow = false) {
    return function get(target, key, receiver) {
        if (key === "__v_isReactive" /* ReactiveFlags.IS_REACTIVE */) {
            //get捕获器就返回true告诉调用者这是一个reactive对象
            return !isReadonly;
        }
        else if (key === "__v_isReadonly" /* ReactiveFlags.IS_READONLY */) {
            // 同理返回isReadonly证明是readonly
            return isReadonly;
        }
        const res = Reflect.get(target, key, receiver);
        //判断shallow，如果是shallow的话，我们直接返回res
        if (shallow) {
            return res;
        }
        if (isObject(res)) {
            return isReadonly ? readonly(res) : reactive(res);
        }
        if (!isReadonly) {
            track(target, key);
        }
        return res;
    };
}
function createSetter() {
    return function set(target, key, value, receiver) {
        const res = Reflect.set(target, key, value, receiver);
        trigger(target, key);
        return res;
    };
}
const mutableHandlers = {
    get,
    set
};
const readonlyHandlers = {
    get: readonlyGet,
    set(target, key, value, receiver) {
        console.warn(`key:${key} set失败，因为target是readonly的`, target);
        return true;
    },
};
const shallowReadonlyHandlers = extend({}, readonlyHandlers, {
    get: shallowReadOnlyGet
});

const reactive = (raw) => {
    return createActiveObject(raw, mutableHandlers);
};
const readonly = (raw) => {
    return createActiveObject(raw, readonlyHandlers);
};
const shallowReadonly = (raw) => {
    return createActiveObject(raw, shallowReadonlyHandlers);
};
const isReactive = (value) => {
    return !!value["__v_isReactive" /* ReactiveFlags.IS_REACTIVE */];
};
function createActiveObject(target, baseHandlers) {
    if (!isObject(target)) {
        console.warn(`target${target}必须是一个对象`);
        return target;
    }
    return new Proxy(target, baseHandlers);
}

function emit(instance, event, ...args) {
    const { props } = instance;
    const toHandlerName = toHandlerKey(camelize(event));
    const handler = props[toHandlerName];
    handler && handler(...args);
}

function initSlots(instance, children) {
    const { vnode } = instance;
    if (vnode.shapeFlag & 16 /* ShapeFlags.SOLT_CHILDREN */) {
        normalizeObjectSlots((instance.slots = {}), children);
    }
}
// 
function normalizeObjectSlots(slots, children) {
    for (const key in children) {
        const value = children[key];
        if (typeof value === "function") {
            slots[key] = (props) => normalizeSlotValue(value(props));
        }
    }
}
function normalizeSlotValue(value) {
    return Array.isArray(value) ? value : [value];
}

class RefImpl {
    constructor(value) {
        this.__v_isRef = true; //判断是否时ref的开关
        this._rawValue = value;
        this._value = convert(value);
        this.dep = new Set();
    }
    get value() {
        trackRefValue(this);
        return this._value;
    }
    set value(newValue) {
        // 要先修改value值再触发依赖
        if (hasChanged(newValue, this._rawValue)) {
            this._rawValue = newValue;
            this._value = convert(newValue);
            triggerEffects(this.dep);
        }
    }
}
function convert(value) {
    return isObject(value) ? reactive(value) : value;
}
// 在get操作时有效控制依赖收集
function trackRefValue(ref) {
    if (activeEffect && shouldTrack) {
        // 把dep传入，开始依赖收集
        trackEffects(ref.dep);
    }
}
function ref(value) {
    return new RefImpl(value);
}
// 根据对象中是否存在__v_isRef判断是否是个ref的对象，因为普通对象没有这个属性，只有ref创建时才会给对象里加入这个属性
function isRef(ref) {
    return !!ref.__v_isRef;
}
function unRef(ref) {
    return isRef(ref) ? ref.value : ref;
}
function proxyRefs(objectWithRefs) {
    return isReactive(objectWithRefs) ? objectWithRefs : new Proxy(objectWithRefs, {
        get(target, key) {
            // get 如果是ref类型那么就返回.value的值
            // 如果是普通的值直接返回
            return unRef(Reflect.get(target, key));
        },
        set(target, key, value) {
            // 判断旧值是不是ref，新值是ref还是普通类型
            if (isRef(target[key]) && !isRef(value)) {
                // 普通类型就替换成普通类型
                return target[key].value = value;
            }
            else {
                // 是ref就返回.value的值
                return Reflect.set(target, key, value);
            }
        }
    });
}

function createComponentInstance(vnode, parent) {
    const component = {
        vnode,
        type: vnode.type,
        setupState: {},
        props: {},
        slots: {},
        provides: parent ? parent.provides : {},
        parent,
        isMounted: false,
        subTree: {},
        emit: (evnet) => { } //emit方法
    };
    // 用户只要传事件名即可，bind已经把实例绑定到组件内部去调用了
    component.emit = emit.bind(null, component);
    return component;
}
function setupComponent(instance) {
    initProps(instance, instance.vnode.props);
    initSlots(instance, instance.vnode.children);
    setupStatefulComponent(instance);
}
function setupStatefulComponent(instance) {
    const Component = instance.type;
    instance.proxy = new Proxy({ _: instance }, PublicInstanceProxyHandlers);
    const { setup } = Component;
    if (setup) {
        setCurrentInstance(instance);
        const setupResult = setup(shallowReadonly(instance.props), {
            emit: instance.emit,
        });
        setCurrentInstance(null);
        handleSetupResult(instance, setupResult);
    }
}
function handleSetupResult(instance, setupResult) {
    if (typeof setupResult === "object") {
        instance.setupState = proxyRefs(setupResult);
    }
    finishComponentSetup(instance);
}
function finishComponentSetup(instance) {
    const Component = instance.type;
    if (Component.render) {
        instance.render = Component.render;
    }
}
let currentInstance = {};
function getCurrentInstance() {
    return currentInstance;
}
function setCurrentInstance(instance) {
    currentInstance = instance;
}

function provide(key, value) {
    const currentInstance = getCurrentInstance();
    if (currentInstance) {
        let { provides } = currentInstance;
        const parentProvides = currentInstance.parent.provides;
        if (provides === parentProvides) {
            provides = currentInstance.provides = Object.create(parentProvides);
        }
        provides[key] = value;
    }
}
function inject(key, defaultValue) {
    const currentInstance = getCurrentInstance();
    if (currentInstance) {
        const parentProvides = currentInstance.parent.provides;
        if (key in parentProvides) {
            if (typeof parentProvides[key] === 'function') {
                return parentProvides[key]();
            }
            return parentProvides[key];
        }
        else if (defaultValue) {
            if (typeof defaultValue === 'function') {
                return defaultValue();
            }
            return defaultValue;
        }
    }
}

function createAppAPI(render) {
    return function createApp(rootComponent) {
        return {
            mount(rootContainer) {
                const vnode = createVnode(rootComponent);
                render(vnode, rootContainer);
            }
        };
    };
}

function createRenderer(options) {
    const { createElement: hostCreateElement, patchProp: hostPatchProp, insert: hostInsert } = options;
    function render(vnode, container) {
        patch(null, vnode, container, null);
    }
    // n1 oldVnode 老的虚拟节点
    // n2 newVnode 新的虚拟节点
    function patch(n1, n2, container, parentComponent) {
        const { type, shapeFlag } = n2;
        switch (type) {
            case Fragment:
                processFragment(n1, n2, container, parentComponent);
                break;
            case Text:
                processText(n1, n2, container);
                break;
            default:
                if (shapeFlag & 1 /* ShapeFlags.ELEMENT */) {
                    processElement(n1, n2, container, parentComponent);
                }
                else if (shapeFlag & 2 /* ShapeFlags.STATEFUL_COMPONENT */) {
                    processComponent(n1, n2, container, parentComponent);
                }
                break;
        }
    }
    function processText(n1, n2, container) {
        const { children } = n2;
        const textNode = (n2.el = document.createTextNode(children));
        container.append(textNode);
    }
    function processFragment(n1, n2, container, parentComponent) {
        mountChildren(n2, container, parentComponent);
    }
    function processElement(n1, n2, container, parentComponent) {
        // init -> update
        // 如果n1不存在说明没有更新
        if (!n1) {
            mountElement(n2, container, parentComponent);
            // 否则更新
        }
        else {
            patchElement(n1, n2);
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
        const el = (vnode.el = hostCreateElement(vnode.type));
        // string or array
        const { children, shapeFlag } = vnode;
        if (shapeFlag & 4 /* ShapeFlags.TEXT_CHILDREN */) {
            el.textContent = children;
        }
        else if (shapeFlag & 8 /* ShapeFlags.ARRAY_CHILDREN */) {
            mountChildren(vnode, el, parentComponent);
        }
        const { props } = vnode;
        for (const key in props) {
            const val = props[key];
            hostPatchProp(el, key, val);
        }
        hostInsert(el, container);
    }
    function mountChildren(vnode, container, parentComponent) {
        vnode.children.forEach((v) => {
            patch(null, v, container, parentComponent);
        });
    }
    function processComponent(n1, n2, container, parentComponent) {
        mountComponent(n2, container, parentComponent);
    }
    function mountComponent(initialVnode, container, parentComponent) {
        const instance = createComponentInstance(initialVnode, parentComponent);
        setupComponent(instance);
        setupRenderEffect(instance, initialVnode, container);
    }
    function setupRenderEffect(instance, initialVnode, container) {
        // 通过响应式副作用函数绑定整个更新的流程
        // 当响应触发set操作时，捕获器就会重新触发依赖执行effect内部的函数
        effect(() => {
            // 通过实例的isMounted判断 是初始化 还是更新
            if (!instance.isMounted) {
                console.log('init');
                const { proxy } = instance;
                // 修改：给实例添加一个subTree属性保存当前所有子虚拟节点
                // 下次更新时就可以通过实例中的subTree属性对比新的subTree属性
                const subTree = (instance.subTree = instance.render.call(proxy));
                // 初始化不存在老节点
                patch(null, subTree, container, instance);
                initialVnode.el = subTree.el;
                instance.isMounted = true;
            }
            else {
                // 更新阶段
                console.log('uptade');
                const { proxy } = instance;
                // 本次新的虚拟节点
                const subTree = instance.render.call(proxy);
                // 上次老的虚拟节点
                const prevSubTree = instance.subTree;
                instance.subTree = subTree;
                // 交给patch算法去对比两个节点，只更新数据变化的节点
                patch(prevSubTree, subTree, container, instance);
            }
        });
    }
    return {
        createApp: createAppAPI(render)
    };
}

function createElement(type) {
    // console.log("createElement-------------");
    return document.createElement(type);
}
function patchProp(el, key, val) {
    // console.log("patchProp--------------");
    const isOn = (key) => /^on[A-Z]/.test(key);
    if (isOn(key)) {
        const event = key.slice(2).toLowerCase();
        el.addEventListener(event, val);
    }
    else {
        el.setAttribute(key, val);
    }
}
function insert(el, parent) {
    // console.log("insert---------------");
    parent.append(el);
}
const renderer = createRenderer({
    createElement,
    patchProp,
    insert
});
function createApp(...args) {
    return renderer.createApp(...args);
}

export { createApp, createRenderer, createTextVNode, getCurrentInstance, h, inject, provide, proxyRefs, ref, renderSlots };
