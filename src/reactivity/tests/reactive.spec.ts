import { reactive } from "../reactive"


describe("reactive",() => {
    it("happy path",() => {
        const originObj = {foo:1}
        const res = reactive(originObj)
        expect(res).not.toBe(originObj)
        expect(res.foo).toBe(1)

    })
})