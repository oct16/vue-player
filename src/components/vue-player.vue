<style>
    @import "../assets/stylesheets/player.css";
</style>
<template>
    <div class="player">
        <audio preload="none" id="audio" :src="audioSrc"></audio>
        <div>
            <div class="cover" @click="playPause">
                <img :src="cover" class="{{ isPlay ? '':'pause' }}">
                <div class="play-button {{ isPlay?'bottom':'center' }}"></div>
            </div>
            <div class="right">
                <div class="title" v-text="list.now"></div>
                <div class="lyric">
                    <ul class="lrc-disply" :style="lyricTransform">
                        <li v-for="text in lyricText" class="{{ $index==lyricIndex?'weight':'' }}">{{ text[1] }}</li>
                    </ul>
                </div>
                <canvas height="25" width="105" id="player-canvas"></canvas>
                <div class="info">
                    - <span v-text="musicData.currentTime | second2time"></span> / <span v-text="musicData.duration | second2time"></span>
                </div>

                <div class="progress">
                    <div class="slider" :style="{ left: progress + '%' }"></div>
                    <div v-show="bufferedEnd > 0" class="buffered-end" :style="{ width: bufferedEnd + '%' }"></div>
                </div>
            </div>
        </div>
        <ol class="play-list" v-if="list.playlist">
            <li class="{{ i.title == list.now?'on':'' }}" v-for="i in list.playlist" @click="selectPlay($index)">
                <span class="index">{{ $index + 1 }}</span>
                <span class="title">{{ i.title }}</span>
                <span class="singer">{{ i.singer }}</span>
            </li>
        </ol>
    </div>
</template>

<script type="text/ecmascript-6">
    export default {
        data() {
                let defaultIndex = 0,
                    path = "/src/assets/media/music/",
                    playlist = require('../assets/media/music/list.json')

                return {
                    audioSrc: "",
                    path: path,
                    audio: {},
                    defaultIndex: defaultIndex,
                    list: {
                        now: null,
                        playlist: playlist
                    },
                    isPlay: false,
                    cover: `${path}cover/${playlist[defaultIndex].singer}.jpg`,
                    musicData: {},
                    currentTime: 0,
                    progressModel: null,
                    bufferedEnd: 0,
                    bufferedEndMark: 0,
                    lrcDisply: null,
                    lyricTransform: 0,
                    lyricText: null,
                    lyricIndex: 0,
                    lyricLiHeight: 16,
                    scrollTimer: null,
                    isInit: false
                }
            },
            computed: {
                currentTime() {
                    return this.audio.currentTime
                },
                progress: {
                    get() {
                        var t = (this.musicData.currentTime / this.musicData.duration * 100).toFixed(2)
                        return isNaN(t) ? 0 : t
                    },
                    set(v) {
                        if (isNaN(v)) {
                            return false
                        } else if (v >= 100) {
                            this.endedPlay()
                        } else {
                            new Promise((resolve) => {
                                if (this.audio.duration) {
                                    resolve()
                                } else {
                                    this.play()
                                    setTimeout(resolve, 200);
                                }
                            }).then(() => {
                                this.audio.currentTime = v / 100 * this.audio.duration
                            });
                        }
                    }
                },
                bufferedEnd() {
                    let t = (this.musicData.bufferedEnd / this.musicData.duration * 100).toFixed(2)
                    return isNaN(t) ? 0 : t
                },
                lyricTransform() {
                    let v = (this.lyricLiHeight * this.lyricIndex - this.lyricLiHeight) * -1
                    return {
                        transform: 'translateY(' + v + 'px)'
                    }
                }
            },
            watch: {
                progress: function(v) {
                    if (+v == 100) {
                        this.endedPlay()
                    }
                }
            },

            ready() {
                let self = this,
                    audio = self.audio = document.querySelector('audio')
                this.audioSrc = `${this.path + this.list.playlist[this.defaultIndex].title}.mp3`

                let init = () => {
                    new Control()
                    self.Lyric = new Lyric(audio)
                    self.updateList()
                }

                class Control {
                    constructor() {
                        this._init()
                        this._bind()
                    }

                    _init() {
                        this.progress = self.$el.querySelector('.progress')
                        this.slider = self.$el.querySelector('.slider')
                        this.sliderW = 10
                    }

                    _bind() {
                        let startHandle = (e) => {
                            let copySlider = this.slider.copySlider = document.createElement('div')
                            copySlider.className = 'slider-copy'
                            copySlider.style.left = this.slider.offsetLeft + 'px'
                            this.slider.parentNode.appendChild(copySlider)
                            this.slider.style.display = 'none'
                        }

                        let moveHandle = (e) => {
                            e.preventDefault()
                            let left = e.targetTouches[0].pageX,
                                boundaryL = this.progress.offsetLeft,
                                boundaryR = this.progress.offsetWidth + boundaryL + this.sliderW / 2
                            if (left > boundaryR) {
                                left = boundaryR
                            } else if (left < boundaryL) {
                                left = boundaryL
                            }

                            this.slider.copySlider.stopL = left - boundaryL
                            this.slider.copySlider.style.left = this.slider.copySlider.stopL + 'px'
                        }

                        let endHandle = () => {
                            this.slider.copySlider.remove()
                            let l = this.slider.copySlider.stopL / this.progress.offsetWidth * 100
                            if (l > 100) l = 100
                            this.slider.style.left = `${l}%`
                            self.progress = l
                            this.slider.style.display = 'block'
                            self.play()
                        }

                        let clickHandle = (e) => {
                            let clientX = e.clientX
                            let left = clientX - this.progress.offsetLeft
                            let p = left / this.progress.offsetWidth * 100
                            p = p > 100 ? 100 : p
                            self.progress = p
                            self.play()
                        }

                        if (!self.isMobile()) {
                            this.progress.addEventListener('click', clickHandle)
                        } else {
                            this.slider.addEventListener('touchstart', startHandle)
                            this.slider.addEventListener('touchmove', moveHandle)
                            this.slider.addEventListener('touchend', endHandle)
                        }
                    }
                }

                let Lyric = self.LyricClass = (function() {

                    class Lyric {
                        constructor(audio) {
                            this.audio = audio
                            this._load()
                        }

                        _load() {
                            let name = self.getMusicName(),
                                lyc
                            try {
                                lyc = require(`../assets/media/music/lyric/${name}.lrc`)
                            } catch (e) {
                                lyc = '[00:00.00]&nbsp\n[00:00.90]纯音乐'
                            }
                            this.text = this._getLrc(lyc)
                            this.timeArr = []
                            for (let i = 0; i < this.text.length; i++) {
                                this.timeArr.push(this.text[i][0])
                            }
                            this._renderLrc()
                        }

                        _getLrc(lyc) {
                            return this._parseLrc(lyc)
                        }

                        _renderLrc() {
                            self.lyricText = this.text
                        }

                        _parseLrc(arr) {
                            const lyric = arr.split('\n')
                            let lrc = []
                            const lyricLen = lyric.length
                            for (let i = 0; i < lyricLen; i++) {
                                const re = /\[(\d{2}):(\d{2})\.(\d{2,3})]/g
                                const lrcTimes = lyric[i].match(re)
                                let lrcText = lyric[i].replace(re, '').replace(/^\s+|\s+$/g, '')
                                if (lrcTimes != null && lrcText !== "") {
                                    if (lrcText == '&nbsp') {
                                        lrcText = " "
                                    }
                                    const timeLen = lrcTimes.length
                                    for (let j = 0; j < timeLen; j++) {
                                        const oneTime = /\[(\d{2}):(\d{2})\.(\d{2,3})]/.exec(lrcTimes[j])
                                        const lrcTime = (oneTime[1]) * 60 + parseInt(oneTime[2]) + parseInt(oneTime[3]) / ((oneTime[3] + '').length === 2 ? 100 : 1000)
                                        lrc.push([lrcTime, lrcText])
                                    }
                                }
                            }
                            lrc.sort((a, b) => a[0] - b[0])
                            return lrc
                        }

                        _updateLrc(time) {
                            self.lyricIndex = self.Lyric._getIndex(time, self.Lyric.timeArr)
                        }

                        _getIndex(num, arr) {
                            let numArr = [],
                                gain = 0.35
                            num = num + gain
                            numArr.push(num)
                            let _timeArr = numArr.concat(arr)
                            _timeArr.sort((a, b) => a - b)
                            let index = _timeArr.indexOf(num)
                            index = index == 0 ? 0 : index - 1
                            return index
                        }
                    }

                    return Lyric

                })()

                self.Visualizer = (function() {

                    class Visualizer {

                        constructor() {
                            this.audioContext = new(window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.msAudioContext)()
                            this.analyser = this.audioContext.createAnalyser()
                            this.source = this.audioContext.createMediaElementSource(audio)
                            this.source.connect(this.analyser)
                            this.analyser.connect(this.audioContext.destination)
                        }

                        _drawSpectrum() {
                            let analyser = this.analyser,
                                canvas = document.getElementById('player-canvas'),
                                cwidth = canvas.width,
                                cheight = canvas.height,
                                meterWidth = 2,
                                gap = 1,
                                capHeight = 1,
                                fillStyle = '#999',
                                meterNum = cwidth / (meterWidth + gap),
                                capYPositionArray = [],
                                ctx = canvas.getContext('2d')

                            function drawMeter() {
                                let array = new Uint8Array(analyser.frequencyBinCount),
                                    step = Math.round(array.length / meterNum)
                                analyser.getByteFrequencyData(array)
                                ctx.clearRect(0, 0, cwidth, cheight)
                                for (let i = 0; i < meterNum; i++) {
                                    let value = array[i * step] / 12
                                    if (capYPositionArray.length < Math.round(meterNum)) {
                                        capYPositionArray.push(value)
                                    }
                                    ctx.fillStyle = fillStyle
                                    if (value < capYPositionArray[i]) {
                                        let papH = cheight - (capYPositionArray[i] -= 0.1)
                                        if (papH < 0) papH = 0
                                        ctx.fillRect(i * (meterWidth + gap), papH, meterWidth, capHeight)
                                    } else {
                                        ctx.fillRect(i * (meterWidth + gap), cheight - value, meterWidth, capHeight)
                                        capYPositionArray[i] = value
                                    }
                                    let y = cheight - value + capHeight
                                    if (y < capHeight) y = capHeight
                                    ctx.fillStyle = fillStyle
                                    ctx.fillRect(i * (meterWidth + gap), y, meterWidth, cheight) //the meter
                                }
                                requestAnimationFrame(drawMeter)
                            }

                            requestAnimationFrame(drawMeter)
                        }
                    }

                    return Visualizer

                })()

                init()
            },
            methods: {
                getInfo() {
                    var bufferedEnd,
                        bufferedIndex = this.audio.buffered.length - 1
                    if (this.audio.readyState !== 0) {
                        bufferedEnd = this.audio.buffered.end(bufferedIndex)
                    }
                    this.musicData = {
                        duration: this.audio.duration,
                        currentTime: this.audio.currentTime,
                        'bufferedLength': this.audio.buffered.length,
                        'bufferedEnd': bufferedEnd || 0,
                        volume: this.audio.volume,
                        muted: this.audio.muted
                    }
                },
                playPause() {
                    if (this.audio.paused) {
                        this.play()
                    } else {
                        this.audio.pause()
                        this.isPlay = false
                    }
                },
                play() {
                    this.audio.play()
                    this.isPlay = true
                    this.updateList()
                    this.initOnce()
                    this.Lyric = new this.LyricClass(this.audio)
                },
                changePlay(name) {
                    var _this = this
                    let singer = this.getSinger(name)
                    if (this.audio.paused && this.isMobile()) {
                        this.play()
                    }
                    this.updateCover(singer)
                    setTimeout(function() {
                        _this.updateMusic(name)
                        setTimeout(function() {
                            _this.play()
                        }, 300)
                    }, 0)
                },
                updateList() {
                    let name = this.getMusicName(),
                        index = this.searchJsonIndex(name, this.list.playlist),
                        playList = document.querySelector('.play-list'),
                        listItemH = 28,
                        target = index * listItemH - listItemH
                    this.list.now = name
                    this.scrollMove(playList, target)
                },
                updateMusic(name) {
                    this.audioSrc = this.path + name + ".mp3"
                },
                updateCover(singer) {
                    let _this = this,
                        cover,
                        coverPath = `${this.path}cover/${singer}.jpg`
                    var ImgObj = new Image()
                    _this.cover = coverPath
                    ImgObj.src = coverPath
                    ImgObj.onerror = () => {
                        cover = `${_this.path}cover/purity.jpg`
                        _this.cover = cover
                    }
                },
                getSinger(musicName) {
                    let name = musicName || this.getMusicName(),
                        list = this.list.playlist,
                        index = this.searchJsonIndex(name, list)
                    return list[index]['singer']
                },
                searchJsonIndex(value, jsonArray) {
                    for (let i in jsonArray) {
                        for (let j in jsonArray[i]) {
                            if (jsonArray[i][j] == value) {
                                return i
                            }
                        }
                    }
                    return null
                },
                selectPlay(index) {
                    let name = this.list.playlist[index].title
                    if (this.getMusicName() == name) {
                        if (this.audio.paused) {
                            this.play()
                        } else {
                            return false
                        }
                    } else {
                        this.changePlay(name)
                    }
                },
                getMusicName() {
                    let decodeSrc = decodeURIComponent(this.audioSrc)
                    return decodeSrc.replace(/.*music\/(.*)\.(.*)/ig, '$1')
                },
                getAllMusicName() {
                    let list = this.list.playlist,
                        musicArray = []
                    for (let i in list) {
                        musicArray.push(list[i].title)
                    }
                    return musicArray
                },
                playingMusicIndex(musicArray) {
                    let arr = musicArray || this.getAllMusicName(),
                        nowMusic = this.getMusicName()
                    return arr.indexOf(nowMusic)
                },
                randomPlay() {
                    let musicArray = this.getAllMusicName(),
                        index = this.playingMusicIndex(musicArray)
                    musicArray.splice(index, 1)
                    let len = musicArray.length,
                        randomIndex = Math.floor(Math.random() * len)
                    this.changePlay(musicArray[randomIndex])
                },
                nextPlay() {
                    let musicArray = this.getAllMusicName(),
                        index = this.playingMusicIndex(musicArray)

                    if (this.isPlay) {
                        if (index == musicArray.length - 1) {
                            this.changePlay(musicArray[0])
                        } else {
                            this.changePlay(musicArray[index + 1])
                        }
                    } else {
                        this.changePlay(musicArray[index])
                    }
                },
                endedPlay() {
                    let musicArray = this.getAllMusicName()
                    let index = this.playingMusicIndex(musicArray)
                    if (index !== musicArray.length - 1) {
                        this.nextPlay()
                    } else {
                        this.audio.currentTime = 0
                        this.isPlay = false
                    }
                },
                scrollMove(element, iTarget) {
                    var _this = this
                    clearInterval(_this.scrollTimer);
                    _this.scrollTimer = setInterval(function() {
                        let speed = (iTarget - element.scrollTop) / 15;
                        speed = speed > 0 ? Math.ceil(speed) : Math.floor(speed);
                        if (element.scrollTop === iTarget) {
                            clearInterval(_this.scrollTimer);
                        } else {
                            let scrollSave = element.scrollTop
                            element.scrollTop = element.scrollTop + speed;
                            if (scrollSave == element.scrollTop) {
                                clearInterval(_this.scrollTimer);
                            }
                        }
                    }, 18);
                },
                isMobile() {
                    return /(iPad)|(iPhone)|(iPod)|(android)|(webOS)/i.test(navigator.userAgent)
                },
                isSafari() {
                    return /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
                },
                initOnce() {

                    if (!this.isInit) {
                        let self = this
                        if (!this.isMobile() && !this.isSafari()) {
                            new this.Visualizer()._drawSpectrum()
                        }
                        setInterval(function() {
                            self.getInfo()
                            self.Lyric._updateLrc(self.audio.currentTime)
                        }, 300)
                        this.isInit = true
                    }
                }
            }
    }
</script>
