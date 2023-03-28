import { ref } from "../../dist/guide-mini-vue.esm.js" 

export const App = {
    template:`<p>hi,{{count}}</p>`,
    setup() {
        const count = window.count = ref(0)
        return {
            count
        }
    }
}