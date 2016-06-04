<template>
    <div id="app" >
        <player></player>
    </div>
</template>

<script>
    export default {
        data(){
            return {}
        },
        components : {
            "player" : require('./components/vue-player.vue')
        }
    }
</script>
