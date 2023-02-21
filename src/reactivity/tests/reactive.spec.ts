import { reactive, isReactive,isProxy } from "../reactive"


describe("reactive", () => {
    it("happy path", () => {
        const originObj = { foo: 1 }
        const observed = reactive(originObj)
        expect(observed).not.toBe(originObj)
        expect(observed.foo).toBe(1)

        expect(isReactive(observed)).toBe(true)
        expect(isReactive(originObj)).toBe(false)
        expect(isProxy(observed)).toBe(true)
    })
    test("nested reactive", () => {
        const original = {
            nested: {
                foo: 1
            },
            array: [{ bar: 2 }]
        }
        const observed = reactive(original)
        expect(isReactive(observed.nested)).toBe(true)
        expect(isReactive(observed.array)).toBe(true)
        expect(isReactive(observed.array[0])).toBe(true)
    })
})