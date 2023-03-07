const Fragment = Symbol("Fragment");
const Text = Symbol("Text");
// 创建虚拟节点
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

// 保存记录用户保存的slots等
const publicPropertiesMap = {
    // 当用户调用 instance.proxy.$emit 时就会触发这个函数
    // i 就是 instance 的缩写 也就是组件实例对象
    $el: (i) => i.vnode.el,
    // 实现插槽
    $slots: (i) => i.slots,
};
// 处理公共的Proxy实例
const PublicInstanceProxyHandlers = {
    get({ _: instance }, key) {
        // console.log('proxy instacne:',instance);
        // console.log('proxy key:',key);
        //  setupState
        const { setupState, props } = instance;
        // 如果setupState有返回值，就通过key取出
        if (hasOwn(setupState, key)) {
            return setupState[key];
            // 没有返回值，就通过key返回props的数据
        }
        else if (hasOwn(props, key)) {
            return props[key];
        }
        // 用户取的是$emit，$el等
        const publicGetter = publicPropertiesMap[key];
        // 有的话就调用
        if (publicGetter) {
            // 就根据key调用得到slots或者el
            return publicGetter(instance);
        }
    },
};

// 初始化Props
// 给组件实例添加一个props属性
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

// 用户往emit中传入一个事件名，还有若干参数
function emit(instance, event, ...args) {
    // console.log('emit', event);
    //  instance.props -> event
    const { props } = instance;
    // TPP
    // 先写特定行为 -> 重构通用行为
    // 先camelize，把-后面的第一个字符转大写 （例如  add-foo -> addFoo）
    // toHandlerKey给事件加上on并且on后面的第一个字符大写(例如 addFoo转换成AddFoo,在给AddFoo转换成onAddFoo)
    const toHandlerName = toHandlerKey(camelize(event));
    // const handler = props["onAdd"]
    // handler && handler(...args)
    // 得到用户传入的emit函数（例如 props[onAddFoo])
    const handler = props[toHandlerName];
    // 调用emit
    handler && handler(...args);
}

// 初始化插槽
function initSlots(instance, children) {
    const { vnode } = instance;
    // 判断标记是否命中插槽，不是就不用初始化插槽
    if (vnode.shapeFlag & 16 /* ShapeFlags.SOLT_CHILDREN */) {
        // normalize插槽
        normalizeObjectSlots((instance.slots = {}), children);
    }
}
// 
function normalizeObjectSlots(slots, children) {
    //  children object
    for (const key in children) {
        const value = children[key];
        if (typeof value === "function") {
            // 把这个函数给到slots 对象上存起来
            // 后续在 renderSlots 中调用
            // TODO 这里没有对 value 做 normalize，
            // 默认 slots 返回的就是一个 vnode 对象
            slots[key] = (props) => normalizeSlotValue(value(props));
        }
    }
}
// 判断是否是Array，不是就给一个数组包裹起来
// 主要是用于解决多插槽，具名插槽的需求
function normalizeSlotValue(value) {
    return Array.isArray(value) ? value : [value];
}

// 创建一个组件实例
// vnode：虚拟节点
// parent：父组件（因为组件会有嵌套关系，所以要记录保存的父组件）
function createComponentInstance(vnode, parent) {
    // console.log("createComponentInstance", parent);
    // 初始化组价
    const component = {
        vnode,
        type: vnode.type,
        setupState: {},
        props: {},
        slots: {},
        provides: parent ? parent.provides : {},
        parent,
        emit: (evnet) => { } //emit方法
    };
    // 用户只要传事件名即可，bind已经把实例绑定到组件内部去调用了
    component.emit = emit.bind(null, component);
    return component;
}
// setup组件，初始化props和slots，代理实例对象
function setupComponent(instance) {
    // 初始化props，进入componentProps.ts
    // 取出vnode上的props给组件实例添加props属性
    initProps(instance, instance.vnode.props);
    // 初始化插槽
    initSlots(instance, instance.vnode.children);
    // 源码里面有两种类型的 component
    // 一种是基于 options 创建的
    // 还有一种是 function 的
    // 这里处理的是 options 创建的
    // 叫做 stateful 类型
    setupStatefulComponent(instance);
}
// 初始化一个有状态的组件
// 代理组件实例，执行setup，返回CurrentInstance当前组件实例
function setupStatefulComponent(instance) {
    // 这一步是为了找到setup
    const Component = instance.type;
    // 代理组件实例返回一个当前的实例
    instance.proxy = new Proxy({ _: instance }, PublicInstanceProxyHandlers);
    // 取出组件中的setup
    const { setup } = Component;
    // 拿到setup的返回值
    if (setup) {
        // 返回currentInstance即当前组件的实例
        setCurrentInstance(instance);
        // 获得setup的返回值，setup: ƒ setup()
        // 调用setup就能得到返回值，它接收2个参数，props和emit，我们把当前实例的props和emit传入即可
        const setupResult = setup(shallowReadonly(instance.props), {
            emit: instance.emit,
        });
        // 变null及时释放掉，减少内存压力
        setCurrentInstance(null);
        // 因为setupResult可以返回函数也可以返回object
        // 所以要判断setupResult是不是对象，是就存入到实例中
        handleSetupResult(instance, setupResult);
    }
}
// 判断setupResult结果是否是对象，是对象就把返回值赋值给实例
function handleSetupResult(instance, setupResult) {
    // function object
    // TODO funciton
    if (typeof setupResult === "object") {
        instance.setupState = setupResult;
    }
    // 最后组件设置
    finishComponentSetup(instance);
}
// 给组件实例添加一个render属性
function finishComponentSetup(instance) {
    const Component = instance.type;
    // 判断是否有render属性
    if (Component.render) {
        // 给实例添加render属性
        // console.log("finishComponentSetup:", Component.render);
        instance.render = Component.render;
    }
}
let currentInstance = {};
// 获取CurrentInstance
function getCurrentInstance() {
    return currentInstance;
}
// 设置CurrentInstance
function setCurrentInstance(instance) {
    currentInstance = instance;
}

// 提供
function provide(key, value) {
    // 获取当前的组件实例
    const currentInstance = getCurrentInstance();
    if (currentInstance) {
        // 拿到自身的的provides
        let { provides } = currentInstance;
        // 拿到父组件的provides
        const parentProvides = currentInstance.parent.provides;
        // init
        // 如果自身的provides 等于 组件的parentProvides，说明当前实例上的provides没有变化
        if (provides === parentProvides) {
            // 通过原型链绑定到父parentProvides上
            provides = currentInstance.provides = Object.create(parentProvides);
        }
        // 如果不等于就返回实例provides属性内的值
        provides[key] = value;
    }
}
// 注入
function inject(key, defaultValue) {
    // 获取当前的组件实例 
    const currentInstance = getCurrentInstance();
    if (currentInstance) {
        // 获取组件的 parentProvides 及 父亲的 provides
        const parentProvides = currentInstance.parent.provides;
        // 判断用户传入的key，取出对应的值
        if (key in parentProvides) {
            // 判断是函数，就执行函数并返回函数的返回值
            if (typeof parentProvides[key] === 'function') {
                return parentProvides[key]();
            }
            // 否则直接返回key对应的value
            return parentProvides[key];
            // 如果用户自己传入了一个默认值
        }
        else if (defaultValue) {
            // 判断是函数，就执行函数并返回函数的返回值
            if (typeof defaultValue === 'function') {
                return defaultValue();
            }
            // 否则直接返回用户传入的默认值
            return defaultValue;
        }
    }
}

function createAppAPI(render) {
    return function createApp(rootComponent) {
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
    };
}

// 自定义渲染器：通过用户传递的options解构出三个函数传参,利用闭包的特性返回一个render函数，而render函数会解析最后生成真实DOM
// ！！为什么要自定义渲染器？这样做可以在js生成元素时解耦html的节点操作，列如普通的element添加到父元素下用的是el.append()而el.append()是通过addChild添加的，所以自定义渲染器可以在自定义渲染的条件
// vue3默认通过runtime-dom中的createElement，patchProp，insert方法自定义了一个默认的渲染器
function createRenderer(options) {
    // createElement: 生成element，通过传入的tag例如"div"生成一个dom
    // patchProp: 判断用户传入的props，然后给dom添加用户传入的这些属性和添加监听器listener
    // insert：渲染真实的DOM到父节点上
    const { createElement: hostCreateElement, patchProp: hostPatchProp, insert: hostInsert } = options;
    // 渲染函数
    // 在进入渲染函数之前，会createVnode，所有的虚拟节点都会被打上标记，这个标记根据type决定
    function render(vnode, container) {
        // patch算法
        patch(vnode, container, null);
    }
    // patch算法主要用于识别vnode的type类型，然后递归的执行逻辑生成真实DOM
    function patch(vnode, container, parentComponent) {
        // 获取到vnode的type节点类型和shapeFlag标记
        const { type, shapeFlag } = vnode;
        // Fragment -> 只渲染 children
        // 判断type
        switch (type) {
            // 如果是Fragment直接渲染内部的children
            case Fragment:
                processFragment(vnode, container, parentComponent);
                break;
            // 如果是单纯的一句text，直接渲染text
            case Text:
                processText(vnode, container);
                break;
            // 默认
            default:
                // 如果当前元素的标记 命中普通的元素（例如div标签）
                if (shapeFlag & 1 /* ShapeFlags.ELEMENT */) {
                    // 开启一个渲染Element的进程
                    processElement(vnode, container, parentComponent);
                    // 如果当前元素的标记 命中组件 （例如 DialogComponent)
                }
                else if (shapeFlag & 2 /* ShapeFlags.STATEFUL_COMPONENT */) {
                    // 开启一个渲染组件的进程
                    processComponent(vnode, container, parentComponent);
                }
                break;
        }
    }
    // 渲染文本进程
    function processText(vnode, container) {
        // 直接拿到 children 即内容 （例如“你好”）
        const { children } = vnode;
        // 生成dom元素
        const textNode = (vnode.el = document.createTextNode(children));
        // 挂载到 父节点 
        container.append(textNode);
    }
    // 渲染 Fragment 进程
    function processFragment(vnode, container, parentComponent) {
        // 挂载内部所有的children
        mountChildren(vnode, container, parentComponent);
    }
    // 渲染 元素 进程
    function processElement(vnode, container, parentComponent) {
        // init -> update
        // 挂载元素
        mountElement(vnode, container, parentComponent);
    }
    // 挂载元素
    function mountElement(vnode, container, parentComponent) {
        // vnode -> element -> div
        // 根据自定义渲染器传入的生成函数，生成一个dom节点
        const el = (vnode.el = hostCreateElement(vnode.type));
        // string or array
        const { children, shapeFlag } = vnode;
        // 根据vnode上的shapeFlag类型判断
        // 如果是text就添加到属性里
        if (shapeFlag & 4 /* ShapeFlags.TEXT_CHILDREN */) {
            el.textContent = children;
            // 如果是数组说明内部还有子节点
        }
        else if (shapeFlag & 8 /* ShapeFlags.ARRAY_CHILDREN */) {
            // vnode
            // 继续挂载children
            // @params el   el是现阶段的自身dom节点，传入到mountChildren后就变成了它子元素的根节点了！
            // @params parentComponent 是父组件不是父dom节点
            mountChildren(vnode, el, parentComponent);
        }
        // 取出props
        const { props } = vnode;
        // 拿出props对象中所有的key
        for (const key in props) {
            const val = props[key];
            // console.log(key);
            // on + Event name
            // onMousedown
            // 判断用户传入的props，然后给dom添加用户传入的属性和添加监听器listener
            hostPatchProp(el, key, val);
        }
        // container.append(el)
        // 最后挂载到父节点上
        // el是当前节点，container是父节点(例如第一次就是body节点)
        // container
        hostInsert(el, container);
    }
    // 挂载children
    function mountChildren(vnode, container, parentComponent) {
        // 把所有children的vonode都拿出，并且重新运行patch算法去识别内部的标记，根据标记渲染内部节点
        vnode.children.forEach((v) => {
            patch(v, container, parentComponent);
        });
    }
    // 渲染Component进程
    function processComponent(vnode, container, parentComponent) {
        // 挂载Component
        mountComponent(vnode, container, parentComponent);
    }
    // 挂载组件
    function mountComponent(initialVnode, container, parentComponent) {
        // 进入component.ts逻辑中
        // 初始化组件，并且返回当前组件的vnode实例
        const instance = createComponentInstance(initialVnode, parentComponent);
        //  setup组件，给实例添加props属性，添加prxoy属性，添加setupResult属性，添加render属性
        setupComponent(instance);
        // 处理组件内部的虚拟节点
        setupRenderEffect(instance, initialVnode, container);
    }
    // 处理组件内部的虚拟节点
    // 触发patch算法去递归所有组件虚拟节点内的 （组件和标签） 直到把整个组件都渲染出来为止！
    function setupRenderEffect(instance, initialVnode, container) {
        // 取出Proxy代理
        // 我们通过proxy代理可以准确的获得实例中的属性
        const { proxy } = instance;
        // instance实例身上的render属性内部 的this 绑定 到proxy内部 的 this 上
        // 这么做的目的是为了能在render是访问setup定义的变量 
        // 例如 render内部(this.msg)  ===> 这个this 就会指向 setup中的(return {msg: "mini-vue-hahah",};)
        // 返回一个虚拟节点树 (举例：{type: 'div', props: {…}, children: Array(2), shapeFlag: 9, el: null} )
        const subTree = instance.render.call(proxy);
        // vnode-> patch
        // vnode -> element -> mountElement
        // 有了这个虚拟节点树我们就可以继续patch了
        // 重新patch，直到遍历成组件内部的元素节点，元素节点就进入mountElement，去生成真实DOM！
        // subTree： 父节点内的所有子虚拟节点
        // container： 容器，所有子节点会挂载到这个容器里面
        // instance： 当前的组件实例，会交给patch算法，这个instance主要是作为parent，为provide和inject服务，通过这个parent父组件的实例，我们就可以在子组件内部访问父组件provide提供的数据和函数了
        patch(subTree, container, instance);
        // element -> mount
        // 到这里肯定是所有节点都渲染完了，把子的虚拟节点给到 组件的虚拟节点
        initialVnode.el = subTree.el;
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

export { createApp, createRenderer, createTextVNode, getCurrentInstance, h, inject, provide, renderSlots };
