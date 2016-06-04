
export let second2time = (second) => {
    let t = Math.floor(second)
    let m = Math.floor(t / 60)
    let s = Math.floor(t % 60)

    if (isNaN(m)) m = '00'
    if (isNaN(s)) s = '00'

    if (String(m).length == 1) m = '0' + m
    if (String(s).length == 1) s = '0' + s
    return m + ':' + s
}
