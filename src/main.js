import Vue from 'vue'
import App from './app.vue'

let filter = require('./lib/filter')
Object.keys(filter).forEach(k => Vue.filter(k, filter[k]))

new Vue({
    el: 'body',
    components: { App }
})