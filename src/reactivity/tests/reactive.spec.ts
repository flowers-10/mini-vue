import { reactive,isReactive } from "../reactive"


describe("reactive",() => {
    it("happy path",() => {
        const originObj = {foo:1}
        const observed = reactive(originObj)
        expect(observed).not.toBe(originObj)
        expect(observed.foo).toBe(1)
        
        expect(isReactive(observed)).toBe(true)
        expect(isReactive(originObj)).toBe(false)
    })
})