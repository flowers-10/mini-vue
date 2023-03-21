'use strict';

const Fragment = Symbol("Fragment");
const Text = Symbol("Text");
function createVnode(type, props, children) {
    const vnode = {
        type,
        props,
        key: props && props.key,
        children,
        component: null,
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
const EMPTY_OBJ = {};
// 判断是否是个对象
const isObject = (val) => {
    return val !== null && typeof val === 'object';
};
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
    $props: (i) => i.props
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
        next: null,
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

function shouldUpdateComponent(prevVNode, nextVNode) {
    const { props: prevProp } = prevVNode;
    const { props: nextProp } = nextVNode;
    for (const key in nextProp) {
        if (nextProp[key] !== prevProp[key]) {
            return true;
        }
    }
    return false;
}

const queue = [];
const p = Promise.resolve();
let isFlushPending = false;
function nextTick(fn) {
    return fn ? p.then(fn) : p;
}
function queueJobs(job) {
    if (!queue.includes(job)) {
        queue.push(job);
    }
    queueFlush();
}
function queueFlush() {
    if (isFlushPending)
        return;
    isFlushPending = true;
    nextTick(flushJobs);
}
function flushJobs() {
    isFlushPending = false;
    let job;
    while ((job = queue.shift())) {
        job && job();
    }
}

function createRenderer(options) {
    const { createElement: hostCreateElement, patchProp: hostPatchProp, insert: hostInsert, remove: hostRemove, setElementText: hostSetElementText } = options;
    function render(vnode, container) {
        patch(null, vnode, container, null, null);
    }
    // n1 oldVnode 老的虚拟节点
    // n2 newVnode 新的虚拟节点
    function patch(n1, n2, container, parentComponent, anchor) {
        const { type, shapeFlag } = n2;
        switch (type) {
            case Fragment:
                processFragment(n1, n2, container, parentComponent, anchor);
                break;
            case Text:
                processText(n1, n2, container);
                break;
            default:
                if (shapeFlag & 1 /* ShapeFlags.ELEMENT */) {
                    processElement(n1, n2, container, parentComponent, anchor);
                }
                else if (shapeFlag & 2 /* ShapeFlags.STATEFUL_COMPONENT */) {
                    processComponent(n1, n2, container, parentComponent, anchor);
                }
                break;
        }
    }
    function processText(n1, n2, container) {
        const { children } = n2;
        const textNode = (n2.el = document.createTextNode(children));
        container.append(textNode);
    }
    function processFragment(n1, n2, container, parentComponent, anchor) {
        mountChildren(n2.children, container, parentComponent, anchor);
    }
    function processElement(n1, n2, container, parentComponent, anchor) {
        // init -> update
        // 如果n1不存在说明没有更新
        if (!n1) {
            mountElement(n2, container, parentComponent, anchor);
            // 否则更新
        }
        else {
            // 对比新旧节点
            patchElement(n1, n2, container, parentComponent, anchor);
        }
    }
    // 这里对比新旧节点并且更新把旧dom删除或者替换成新节点的dom
    function patchElement(n1, n2, container, parentComponent, anchor) {
        console.log("patchElement开始新旧节点对比");
        console.log("n1老节点s", n1);
        console.log("n2新节点", n2);
        // 处理更新对比
        const oldProps = n1.props || EMPTY_OBJ;
        const newProps = n2.props || EMPTY_OBJ;
        const el = (n2.el = n1.el);
        // children
        patchChildren(n1, n2, el, parentComponent, anchor);
        // props
        patchProps(el, oldProps, newProps);
    }
    // 对比并且更新子节点
    function patchChildren(n1, n2, container, parentComponent, anchor) {
        const prevShapeFlag = n1.shapeFlag;
        const c1 = n1.children;
        const shapeFlag = n2.shapeFlag;
        const c2 = n2.children;
        // 说明新节点children是text
        if (shapeFlag & 4 /* ShapeFlags.TEXT_CHILDREN */) {
            // 说明老节点children是数组
            if (prevShapeFlag & 8 /* ShapeFlags.ARRAY_CHILDREN */) {
                // 移除老节点
                unmountChildren(c1);
            }
            // 说明新老节点的text不同
            if (c1 !== c2) {
                // 替换新节点的text
                hostSetElementText(container, c2);
            }
            // 说明新节点是一个数组
        }
        else {
            // 说明老节点是text
            if (prevShapeFlag & 4 /* ShapeFlags.TEXT_CHILDREN */) {
                // 清空老节点的text
                hostSetElementText(container, "");
                // 渲染新节点数组内的所有子节点
                mountChildren(c2, container, parentComponent, anchor);
                // 说明老节点是Array
            }
            else {
                // array diff array
                patchKeyedChildren(c1, c2, container, parentComponent, anchor);
            }
        }
    }
    // c1:老的children
    // c2:新的children
    // container节点挂载位置
    // parentComponent 父组件
    // parentAnchor 需要挂载的父锚点
    function patchKeyedChildren(c1, c2, container, parentComponent, parentAnchor) {
        const l2 = c2.length;
        let i = 0;
        let e1 = c1.length - 1;
        let e2 = l2 - 1;
        // 判断节点是否相同
        function isSomeVnodeType(n1, n2) {
            return n1.type === n2.type && n1.key === n2.key;
        }
        // 1.左侧对比
        while (i <= e1 && i <= e2) {
            const n1 = c1[i];
            const n2 = c2[i];
            // 说明两个节点相同的type和key相同
            if (isSomeVnodeType(n1, n2)) {
                // 继续遍历内部是否相同
                // console.log('左侧对比：两个节点相同，开始深度遍历该节点内部是否相同');
                patch(n1, n2, container, parentComponent, parentAnchor);
            }
            else {
                // 跳出循环i就不会++了
                break;
            }
            i++;
        }
        // 2.右侧对比
        while (i <= e1 && i <= e2) {
            const n1 = c1[e1];
            const n2 = c2[e2];
            // 说明两个节点相同的type和key相同
            if (isSomeVnodeType(n1, n2)) {
                // 继续遍历内部是否相同
                // console.log('右侧对比：两个节点相同，开始深度遍历该节点内部是否相同');
                patch(n1, n2, container, parentComponent, parentAnchor);
            }
            else {
                // 跳出循环e1 e2 就不会--了
                break;
            }
            e1--;
            e2--;
        }
        // 3.新的比老的多 创建
        if (i > e1) {
            if (i <= e2) {
                // 锚点就在c2（新节点内的children）上 + 1
                // 这样dom就在锚点上创建了
                const nextPos = e2 + 1;
                const anchor = nextPos < l2 ? c2[nextPos].el : null;
                while (i <= e2) {
                    // 新节点根据锚点重新patch，最终挂载到dom上
                    // console.log("新的节点比老的节点多，深度遍历把该dom树渲染");
                    patch(null, c2[i], container, parentComponent, anchor);
                    i++;
                }
            }
            // 4.新的比老的少 删除
            // 如果i 大于 e2 说明新节点children的长度比 老节点children的长度少
        }
        else if (i > e2) {
            // 遍历老节点children
            while (i <= e1) {
                // 删除 大于新节点（比如新节点4个dom）又小于老节点（6个dom）的 dom（删掉多出来的一个dom）
                // console.log("新的节点比老的节点少，直接删除当前dom");
                hostRemove(c1[i].el);
                // i++ 再进入一次循环（下次就会又删除一个dom，直到删到新节点长度为止）
                i++;
            }
            // 5.中间部分的 乱序 说明不知道节点顺序 
        }
        else {
            // 中间乱序部分的对比
            // console.log("双端对比结束！");
            // console.log("开始中间部分的乱序对比！");
            let s1 = i; //记录老节点通过双端对比后，乱序开始的第一个child开始的位置
            let s2 = i; //记录新节点通过双端对比后，乱序开始的第一个child开始的位置
            // 当前乱序部分新节点的总长度
            const toBePatched = e2 - s2 + 1;
            // 老节点内child 出现在 新节点内的次数
            let patched = 0;
            // 通过hash表保存新虚拟DOM数内child的位置 例如({'D'=>2,'C'=>3,'Y'=>4,'E'=>5})
            // 那么可以通过映射的key.get对比老节点key如果有说明 老节点的child出现在新节点里面了
            // 所以key可以减少vue3的一层循环,不写key只能每一个都去遍历了
            const keyToNewIndexMap = new Map();
            // 映射表初始化，根据新节点chilren的长度创建一个映射表
            const newIndexToOldIndexMap = new Array(toBePatched);
            // 确认移动
            let moved = false;
            // 记录新老节点对比后，新节点移动到的最远的距离
            let maxNewIndexSoFar = 0;
            for (let i = 0; i < toBePatched; i++)
                newIndexToOldIndexMap[i] = 0;
            // 把新节点内children的key映射到map表中
            for (let i = s2; i <= e2; i++) {
                // 找到所有新节点的child
                const nextChild = c2[i];
                // 把所有新节点child的key全部存入hash表，值就是当前key的下标，用于给到newIndex，newIndex就可以记录新老节点相同child在新节点的下标了
                keyToNewIndexMap.set(nextChild.key, i);
            }
            //遍历老节点的DOM树 ,从老DOM树和新DOM树双端对比去掉两端相同后，老节点中间部分左侧开始遍历
            for (let i = s1; i <= e1; i++) {
                // 获得老DOM上第i个child
                const prevChild = c1[i];
                // console.log("当前老DOM树上要开始和新DOM树对比的节点！！", prevChild);
                // 如果老节点在新节点相同child出现次数 大于 新节点的chilren的数量，说明新节点内出现的相同的节点已经被遍历完了
                if (patched >= toBePatched) {
                    // 那么直接删除老节点内多出来的child节点即可，因为他们不会出现在新节点内了
                    // console.log("因为超出长度删除的节点!!!", prevChild.el);
                    hostRemove(prevChild.el);
                    // 跳过下面的逻辑，进入下一轮循环
                    continue;
                }
                // 定义一个下标，记录老节点的child是否出现在新节点children里面过，如果出现了这个下标就是新节点内child的下标
                let newIndex;
                // 说明用户填了key，那么直接在map表里找（所以性能优化一定要填写key，否则只能进入else，又增加了一层遍历浪费性能）
                // 最终得到当前的下标，我们可以对这个下标处理是否删除还是移动还是添加
                if (prevChild.key != null) {
                    // 那么直接通过新节点的map表去查找有没有老节点的key，有就把新节点child的坐标保存下来
                    newIndex = keyToNewIndexMap.get(prevChild.key);
                    // 用户没填key那只能去新节点里遍历出每一个child和当前老节点的child全量对比了
                }
                else {
                    for (let j = s2; j <= e2; j++) {
                        // 如果当前老节点的child 和 新节点children中的某个child 的type或者key相同
                        if (isSomeVnodeType(prevChild, c2[j])) {
                            // 说明出现在了新节点里，我们给他一个标记，并且退出当前循环即可
                            newIndex = j;
                            break;
                        }
                    }
                }
                // 说明当前老虚拟DOM树中的child没有出现在新虚拟DOM树里面过
                if (newIndex === undefined) {
                    // 那么删除当前这个节点即可
                    // console.log('对比中删除的节点', prevChild.el);
                    hostRemove(prevChild.el);
                    // 说明老节点的children中的child在新节点里出现了！
                    // 那么继续深层的对比这两个child里面的children和props等是否也相同
                }
                else {
                    // 如果这次循环中当前新DOM树的的child节点位置 大于 最远移动距离，那么当前移动的距离 就是 最远移动过的距离
                    if (newIndex >= maxNewIndexSoFar) {
                        maxNewIndexSoFar = newIndex;
                        // 如果这次循环中当前新DOM树的的child节点位置 小于 最远移动距离，说明当前节点对比老dom数中节点的位置 它的位置肯定 变化过了
                    }
                    else {
                        // 标记这个节点移动过
                        moved = true;
                    }
                    // 老虚拟DOM树的child在新节点里出现
                    // 给映射表存入
                    // newIndex - s2 就是算出新DOM树中去掉双端后，在新DOM树中间部分的 下标位置
                    // i+1 表示当前这个老的VNode节点在老DOM树的总长度下的 下标位置 再 + 1
                    newIndexToOldIndexMap[newIndex - s2] = i + 1;
                    // 继续深层递归调用patch算法对比当前新旧VNode
                    patch(prevChild, c2[newIndex], container, parentComponent, null);
                    // 给patched标记+1 ，说明对比新老节点的次数
                    patched++;
                }
            }
            // 生成最长递增子序列
            console.log(newIndexToOldIndexMap);
            // 举例:newIndexToOldIndexMap = [5,3,4] 
            // 代表老DOM树的第4个节点现在 在 新DOM树去掉双端后 中间部分 的第一个位置
            // 生成的最长递增子序列就是 [1,2]
            // 这里做了优化，如果没有移动过那就不用求最长子序列，直接创建多余的节点即可，如果移动过了，再求最长子序列
            const increasingNewIndexSequence = moved ? getSequence(newIndexToOldIndexMap) : [];
            // 最长递增子序列的指针
            let j = increasingNewIndexSequence.length - 1;
            // 新节点的序列 和 最长递增子序列进行对比，从右往左对比
            // 为什么要倒序对比？因为从最右侧开始对比可以保证锚点的正确性！
            // 双指针对比
            // i 新节点上的指针
            // j 最长递增子序列的指针
            for (let i = toBePatched - 1; i >= 0; i--) {
                // 获得当前新DOM树上 去掉双端乱序部分  开始的节点坐标位置
                const nextIndex = s2 + i;
                // 获得新DOM树上的这个VNode
                const nextChild = c2[nextIndex];
                // nextIndex + 1 < l2 :如果当前新DOM树的右侧部分下标+1 < 新节点的length（数组内的最末尾坐标+1 === length）说明它在新DOM树的范围内，直接找到当前节点的后一位做锚点，然后插入到这个锚点上就可以了
                // nextIndex + 1 > l2 ：说明它当前的坐标超出了新DOM数的长度，那么就往直接在新DOM树最后面生成这个DOM
                const anchor = nextIndex + 1 < l2 ? c2[nextIndex + 1].el : parentAnchor;
                // 如果等于0说明在老虚拟DOM中根本不存在，那么创建一个新的DOM
                if (newIndexToOldIndexMap[i] === 0) {
                    patch(null, nextChild, container, parentComponent, anchor);
                }
                else if (moved) {
                    // 如果j指针已经是负数，说明当前节点已经超出了子序列，那就肯定要移动位置了
                    // 或者如果新节点上的指针不在最长递增子序列里说明这个节点肯定是要移动位置了
                    // 如果当前节点在最长递增子序列里，我们就不能移动位置，要保持这个最长递增子序列顺序永远不变即可
                    if (j < 0 || increasingNewIndexSequence[j] !== i) {
                        console.log('移动位置');
                        hostInsert(nextChild.el, container, anchor);
                        // 否则最长子序列的指针向下移动一位
                    }
                    else {
                        j--;
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
            const el = children[i].el;
            hostRemove(el);
        }
    }
    // 在这一步更新新节点的props属性
    function patchProps(el, oldProps, newProps) {
        // 只有两个节点不同时才需要对比具体的那些属性需要修改
        if (oldProps !== newProps) {
            for (const key in newProps) {
                const prevProp = oldProps[key];
                const nextProp = newProps[key];
                // 新老属性不同，说明用户修改了属性
                if (prevProp !== nextProp) {
                    hostPatchProp(el, key, prevProp, nextProp);
                }
            }
            // 老节点是空的，新节点就不能删除属性了。所以要判断不空的老节点才可以删属性
            if (oldProps !== EMPTY_OBJ) {
                for (const key in oldProps) {
                    // 老节点的key不在新节点内，说明新节点删除了属性
                    if (!(key in newProps)) {
                        hostPatchProp(el, key, oldProps[key], null);
                    }
                }
            }
        }
    }
    function mountElement(vnode, container, parentComponent, anchor) {
        const el = (vnode.el = hostCreateElement(vnode.type));
        // string or array
        const { children, shapeFlag } = vnode;
        if (shapeFlag & 4 /* ShapeFlags.TEXT_CHILDREN */) {
            el.textContent = children;
        }
        else if (shapeFlag & 8 /* ShapeFlags.ARRAY_CHILDREN */) {
            mountChildren(vnode.children, el, parentComponent, anchor);
        }
        const { props } = vnode;
        for (const key in props) {
            const val = props[key];
            hostPatchProp(el, key, null, val);
        }
        hostInsert(el, container, anchor);
    }
    function mountChildren(children, container, parentComponent, anchor) {
        children.forEach((v) => {
            patch(null, v, container, parentComponent, anchor);
        });
    }
    function processComponent(n1, n2, container, parentComponent, anchor) {
        if (!n1) {
            mountComponent(n2, container, parentComponent, anchor);
        }
        else {
            updateComponent(n1, n2);
        }
    }
    // 更新组件
    function updateComponent(n1, n2) {
        const instance = (n2.component = n1.component);
        if (shouldUpdateComponent(n1, n2)) {
            instance.next = n2;
            instance.update();
        }
        else {
            n2.el = n1.el;
            instance.vnode = n2;
        }
    }
    function mountComponent(initialVnode, container, parentComponent, anchor) {
        const instance = initialVnode.component = (createComponentInstance(initialVnode, parentComponent));
        setupComponent(instance);
        setupRenderEffect(instance, initialVnode, container, anchor);
    }
    function setupRenderEffect(instance, initialVnode, container, anchor) {
        // 通过响应式副作用函数绑定整个更新的流程
        // 当响应触发set操作时，捕获器就会重新触发依赖执行effect内部的函数
        instance.update = effect(() => {
            // 通过实例的isMounted判断 是初始化 还是更新
            if (!instance.isMounted) {
                console.log('init');
                const { proxy } = instance;
                // 修改：给实例添加一个subTree属性保存当前所有子虚拟节点
                // 下次更新时就可以通过实例中的subTree属性对比新的subTree属性
                const subTree = (instance.subTree = instance.render.call(proxy));
                // 初始化不存在老节点
                patch(null, subTree, container, instance, anchor);
                initialVnode.el = subTree.el;
                instance.isMounted = true;
            }
            else {
                // 更新阶段
                console.log('uptade');
                // 需要一个 vnode
                // next = 更新之后新的虚拟节点
                // vnode = 更新之前的虚拟节点
                const { next, vnode } = instance;
                if (next) {
                    next.el = vnode.el;
                    updateComponentPreRender(instance, next);
                }
                const { proxy } = instance;
                // 本次新的虚拟节点
                const subTree = instance.render.call(proxy);
                // 上次老的虚拟节点
                const prevSubTree = instance.subTree;
                instance.subTree = subTree;
                // 交给patch算法去对比两个节点，只更新数据变化的节点
                patch(prevSubTree, subTree, container, instance, anchor);
            }
        }, {
            scheduler() {
                console.log('update - scheduler');
                queueJobs(instance.update);
            }
        });
    }
    return {
        createApp: createAppAPI(render)
    };
}
function updateComponentPreRender(instance, nextVNode) {
    instance.vnode = nextVNode;
    instance.next = null;
    instance.props = nextVNode.props;
}
// 最长递增子序列
function getSequence(arr) {
    const p = arr.slice();
    const result = [0];
    let i, j, u, v, c;
    const len = arr.length;
    for (i = 0; i < len; i++) {
        const arrI = arr[i];
        if (arrI !== 0) {
            j = result[result.length - 1];
            if (arr[j] < arrI) {
                p[i] = j;
                result.push(i);
                continue;
            }
            u = 0;
            v = result.length - 1;
            while (u < v) {
                c = (u + v) >> 1;
                if (arr[result[c]] < arrI) {
                    u = c + 1;
                }
                else {
                    v = c;
                }
            }
            if (arrI < arr[result[u]]) {
                if (u > 0) {
                    p[i] = result[u - 1];
                }
                result[u] = i;
            }
        }
    }
    u = result.length;
    v = result[u - 1];
    while (u-- > 0) {
        result[u] = v;
        v = p[v];
    }
    return result;
}

function createElement(type) {
    // console.log("createElement-------------");
    return document.createElement(type);
}
function patchProp(el, key, prevVal, nextVal) {
    // console.log("patchProp--------------");
    const isOn = (key) => /^on[A-Z]/.test(key);
    if (isOn(key)) {
        const event = key.slice(2).toLowerCase();
        el.addEventListener(event, nextVal);
    }
    else {
        // 如果新的属性不存在就要删除
        if (nextVal === undefined || nextVal === null) {
            // 删除空值的属性
            el.removeAttribute(key, nextVal);
        }
        else {
            el.setAttribute(key, nextVal);
        }
    }
}
function insert(child, parent, anchor) {
    // console.log("insert---------------");
    parent.insertBefore(child, anchor || null);
}
// 移除传入的节点
function remove(child) {
    const parent = child.parentNode;
    if (parent) {
        parent.removeChild(child);
    }
}
// 给父节点添加文字
function setElementText(el, text) {
    el.textContent = text;
}
const renderer = createRenderer({
    createElement,
    patchProp,
    insert,
    remove,
    setElementText
});
function createApp(...args) {
    return renderer.createApp(...args);
}

exports.createApp = createApp;
exports.createRenderer = createRenderer;
exports.createTextVNode = createTextVNode;
exports.getCurrentInstance = getCurrentInstance;
exports.h = h;
exports.inject = inject;
exports.nextTick = nextTick;
exports.provide = provide;
exports.proxyRefs = proxyRefs;
exports.ref = ref;
exports.renderSlots = renderSlots;
