function createVnode(type, props, children) {
    const vnode = {
        type,
        props,
        children,
        shapeFlag: getShapFlag(type),
        el: null
    };
    // debugger
    // children
    if (typeof children === 'string') {
        vnode.shapeFlag |= 4 /* ShapFlags.TEXT_CHILDREN */;
    }
    else if (Array.isArray(children)) {
        vnode.shapeFlag |= 8 /* ShapFlags.ARRAY_CHILDREN */;
    }
    return vnode;
}
function getShapFlag(type) {
    return typeof type === 'string' ? 1 /* ShapFlags.ELEMENT */ : 2 /* ShapFlags.STATEFUL_COMPONENT */;
}

const extend = Object.assign;
function isObject(val) {
    return val !== null && typeof val === 'object';
}
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
    // 实现插槽
    $slots: (i) => i.slots,
};
const PublicInstanceProxyHandlers = {
    get({ _: instance }, key) {
        //  setupState
        const { setupState, props } = instance;
        if (key in setupState) {
            return setupState[key];
        }
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
    // attrs
}

const targetMap = new WeakMap(); //管理所有收集到的依赖，统一存取
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

const get = createGetter();
const set = createSetter();
const readonlyGet = createGetter(true);
const shallowReadOnlyGet = createGetter(true, true);
function createGetter(isReadonly = false, shallow = false) {
    return function get(target, key) {
        if (key === "__v_isReactive" /* ReactiveFlags.IS_REACTIVE */) {
            //get捕获器就返回true告诉调用者这是一个reactive对象
            return !isReadonly;
        }
        else if (key === "__v_isReadonly" /* ReactiveFlags.IS_READONLY */) {
            // 同理返回isReadonly证明是readonly
            return isReadonly;
        }
        const res = Reflect.get(target, key);
        //判断shallow，如果是shallow的话，我们直接返回res
        if (shallow) {
            return res;
        }
        if (isObject(res)) {
            return isReadonly ? readonly(res) : reactive(res);
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
function createActiveObject(target, baseHandlers) {
    if (!isObject(target)) {
        console.warn(`target${target}必须是一个对象`);
        return target;
    }
    return new Proxy(target, baseHandlers);
}

function emit(instance, event, ...args) {
    console.log('emit', event);
    //  instance.props -> event
    const { props } = instance;
    // TPP
    // 先写特定行为 -> 重构通用行为
    //  add-foo -> addFoo
    // 先判断是否是add-foo的字符串，是就返回addFoo
    // 再给addFoo转换成AddFoo
    // 在给AddFoo转换成onAddFoo
    const toHandlerName = toHandlerKey(camelize(event));
    const handler = props[toHandlerName];
    handler && handler(...args);
}

function initSlots(instance, children) {
    normalizeObjectSlots(children, instance.slots);
}
function normalizeObjectSlots(children, slots) {
    //  children object
    for (const key in children) {
        const value = children[key];
        slots[key] = normalizeSlotValue(value);
    }
}
function normalizeSlotValue(value) {
    return Array.isArray(value) ? value : [value];
}

function createComponentInstance(vnode) {
    // 初始化组价
    const component = {
        vnode,
        type: vnode.type,
        setupState: {},
        props: {},
        $slots: {},
        emit: (evnet) => { }
    };
    // 用户只要传事件名即可，bind已经把实例绑定到内部去调用了
    component.emit = emit.bind(null, component);
    return component;
}
function setupComponent(instance) {
    // TODO
    initProps(instance, instance.vnode.props);
    // 初始化插槽
    initSlots(instance, instance.vnode.children);
    setupStatefulComponent(instance);
}
function setupStatefulComponent(instance) {
    const Component = instance.type;
    instance.proxy = new Proxy({ _: instance }, PublicInstanceProxyHandlers);
    const { setup } = Component;
    if (setup) {
        const setupResult = setup(shallowReadonly(instance.props), {
            emit: instance.emit,
        });
        handleSetupResult(instance, setupResult);
    }
}
function handleSetupResult(instance, setupResult) {
    // function object
    // TODO funciton
    if (typeof setupResult === "object") {
        instance.setupState = setupResult;
    }
    finishComponentSetup(instance);
}
function finishComponentSetup(instance) {
    const Component = instance.type;
    // if(Component.render) {
    instance.render = Component.render;
    // }
}

function render(vnode, container) {
    // patch
    patch(vnode, container);
}
function patch(vnode, container) {
    const { shapeFlag } = vnode;
    if (shapeFlag & 1 /* ShapFlags.ELEMENT */) {
        processElement(vnode, container);
    }
    else if (shapeFlag & 2 /* ShapFlags.STATEFUL_COMPONENT */) {
        processComponent(vnode, container);
    }
}
function processElement(vnode, container) {
    // init -> update
    mountElement(vnode, container);
}
function mountElement(vnode, container) {
    // vnode -> element -> div
    const el = (vnode.el = document.createElement(vnode.type));
    // string or array
    const { children, shapeFlag } = vnode;
    if (shapeFlag & 4 /* ShapFlags.TEXT_CHILDREN */) {
        el.textContent = children;
    }
    else if (shapeFlag & 8 /* ShapFlags.ARRAY_CHILDREN */) {
        // vnode
        mountChildren(children, el);
    }
    // props
    const { props } = vnode;
    for (const key in props) {
        const val = props[key];
        console.log(key);
        // on + Event name
        // onMousedown
        const isOn = (key) => /^on[A-Z]/.test(key);
        if (isOn(key)) {
            const event = key.slice(2).toLowerCase();
            el.addEventListener(event, val);
        }
        else {
            el.setAttribute(key, val);
        }
    }
    container.append(el);
}
function mountChildren(vnode, container) {
    vnode.forEach((v) => {
        patch(v, container);
    });
}
function processComponent(vnode, container) {
    mountComponent(vnode, container);
}
function mountComponent(initialVnode, container) {
    const instance = createComponentInstance(initialVnode);
    setupComponent(instance);
    setupRenderEffect(instance, initialVnode, container);
}
function setupRenderEffect(instance, initialVnode, container) {
    const { proxy } = instance;
    const subTree = instance.render.call(proxy);
    // vnode-> patch
    // vnode -> element -> mountElement
    patch(subTree, container);
    // element -> mount
    initialVnode.el = subTree.el;
}

function createApp(rootComponent) {
    // debugger
    return {
        mount(rootContainer) {
            // 先转换成vnode
            // Component转换成vnode
            // 所有逻辑操作都基于vnode
            const vnode = createVnode(rootComponent);
            render(vnode, rootContainer);
        }
    };
}

function h(type, props, children) {
    return createVnode(type, props, children);
}

function renderSlots(slots, name) {
    const slot = slots[name];
    if (slot) {
        // function
        if (typeof slot === "function") {
            return createVnode("div", {}, slot);
        }
    }
}

export { createApp, h, renderSlots };
