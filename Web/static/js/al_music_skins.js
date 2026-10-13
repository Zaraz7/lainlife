// скин winamp 2.x для плавающего плеера
const WA_SEGMENTS = {
    a: [2, 0, 5, 2],
    b: [7, 2, 2, 4],
    c: [7, 7, 2, 4],
    d: [2, 11, 5, 2],
    e: [0, 7, 2, 4],
    f: [0, 2, 2, 4],
    g: [2, 6, 5, 1],
}

const WA_DIGITS = {
    '0': 'abcdef', '1': 'bc', '2': 'abged', '3': 'abgcd', '4': 'fgbc',
    '5': 'afgcd', '6': 'afgedc', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg',
    '-': 'g', ' ': '',
}

// цвета спектра из стандартного viscolor.txt, сверху вниз
const WA_VIS_COLORS = [
    '#ef3110', '#ce2910', '#d65a00', '#d66600', '#d67300', '#c67b08', '#dea518', '#d6b521',
    '#bdde29', '#94de21', '#29ce10', '#32be10', '#39b510', '#319c08', '#299400', '#188408',
]

const WA_ICONS = {
    prev: '<path d="M6 4h2v10H6zM9 9l7-5v10z"/>',
    play: '<path d="M8 4l8 5-8 5z"/>',
    pause: '<path d="M7 4h3v10H7zM12 4h3v10h-3z"/>',
    stop: '<path d="M7 4h9v10H7z"/>',
    next: '<path d="M7 4l7 5-7 5zM15 4h2v10h-2z"/>',
    eject: '<path d="M11 3l6 6H5zM5 11h12v3H5z"/>',
}

function waLength(seconds) {
    seconds = Math.max(0, Math.floor(seconds))
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor(seconds % 3600 / 60)
    const secs = String(seconds % 60).padStart(2, '0')

    return hours > 0 ? `${hours}:${String(mins).padStart(2, '0')}:${secs}` : `${mins}:${secs}`
}

function waDigitsSvg(text) {
    // позиции знаков как в main.bmp: минус, две цифры, двоеточие, две цифры
    const offsets = [0, 12, 24, 42, 54]
    const chars = [text[0], text[1], text[2], text[4], text[5]]
    let rects = ''
    chars.forEach((char, i) => {
        for(const seg of WA_DIGITS[char] ?? '') {
            const [x, y, w, h] = WA_SEGMENTS[seg]
            rects += `<rect x="${x + offsets[i]}" y="${y}" width="${w}" height="${h}"/>`
        }
    })

    if(text[3] == ':') {
        rects += `<rect x="37" y="3" width="2" height="2"/><rect x="37" y="8" width="2" height="2"/>`
    }

    return `<svg width="63" height="13" viewBox="0 0 63 13" shape-rendering="crispEdges">${rects}</svg>`
}

function waButton(action, extra = '') {
    return `<div class='wa_btn wa_${action}' data-wa='${action}'>${WA_ICONS[action] ? `<svg viewBox="0 0 22 18">${WA_ICONS[action]}</svg>` : ''}${extra}</div>`
}

function waMiniControls() {
    return `<div class='wa_mini'>${['prev', 'play', 'pause', 'stop', 'next', 'eject'].map(action => `
        <div class='wa_mini_btn' data-wa='${action}'><svg viewBox="4 2 14 14">${WA_ICONS[action]}</svg></div>
    `).join('')}</div>`
}

window.ajaxPlayerSkins = window.ajaxPlayerSkins ?? {}
window.ajaxPlayerSkins.winamp = new class {
    queueParent = '#ajax_audio_player .wa_pl_list'
    cancel = '[data-wa], #aj_player_track_length, #aj_player_volume, #aj_player_tracks, .wa_balance'

    marquee_text = null
    marquee_measured = false
    flash_text = null
    time_text = null
    vis_frame = null

    get node() {
        return u('#ajax_audio_player.skin_winamp')
    }

    get audio() {
        return window.player.audioPlayer
    }

    get status() {
        if(!window.player.currentTrack) {
            return 'stop'
        }

        if(!this.audio.paused) {
            return 'play'
        }

        return this.audio.currentTime > 0 ? 'pause' : 'stop'
    }

    option(key, fallback) {
        return localStorage.getItem('audio.winamp.' + key) ?? fallback
    }

    setOption(key, value) {
        localStorage.setItem('audio.winamp.' + key, value)
    }

    template() {
        const stripes = `<div class='wa_stripes'></div>`
        return `
            <div id='ajax_audio_player' class='ctx_place'>
                <div id='aj_player' class='wa'>
                    <div class='wa_main'>
                        <div class='wa_title'>
                            <div class='wa_tbtn wa_menu' data-wa='menu'></div>
                            ${stripes}<div class='wa_title_text'>WINAMP</div>${stripes}
                            <div class='wa_shade_info'>
                                ${waMiniControls()}
                                <div class='wa_shade_time wa_lcdbox' data-wa='time'></div>
                            </div>
                            <div class='wa_tbtn wa_minimize' data-wa='shade'></div>
                            <div class='wa_tbtn wa_shade' data-wa='shade'></div>
                            <div class='wa_tbtn wa_close' data-wa='close'></div>
                        </div>

                        <div class='wa_lcd'>
                            <div class='wa_clutter'><span>O</span><span>A</span><span>I</span><span>D</span><span>V</span></div>
                            <div class='wa_status'></div>
                            <div class='wa_time' data-wa='time'></div>
                            <canvas class='wa_vis' width='76' height='16' data-wa='vis'></canvas>
                        </div>

                        <div class='wa_marquee'><span class='wa_marquee_text'></span></div>
                        <div class='wa_kbps wa_lcdbox'></div>
                        <div class='wa_label wa_kbps_label'>kbps</div>
                        <div class='wa_khz wa_lcdbox'></div>
                        <div class='wa_label wa_khz_label'>kHz</div>
                        <div class='wa_channels'><span class='wa_mono'>mono</span><span class='wa_stereo'>stereo</span></div>

                        <div id='aj_player_volume' class='wa_volume'>
                            <div class='selectableTrack'>
                                <div class='wa_thumb_area'>
                                    <div class='slider'></div>
                                </div>
                            </div>
                        </div>
                        <div class='wa_balance'><div class='wa_balance_thumb'></div></div>
                        <div class='wa_btn wa_toggle wa_eq'>EQ</div>
                        <div class='wa_btn wa_toggle wa_pl_toggle' data-wa='playlist'>PL</div>

                        <div id='aj_player_track_length' class='wa_posbar'>
                            <div class='selectableTrack'>
                                <div class='wa_thumb_area'>
                                    <div class='slider'></div>
                                </div>
                            </div>
                        </div>

                        <div class='wa_transport'>
                            ${waButton('prev')}${waButton('play')}${waButton('pause')}${waButton('stop')}${waButton('next')}
                        </div>
                        ${waButton('eject')}
                        ${waButton('shuffle', 'SHUFFLE')}
                        ${waButton('repeat', '<svg viewBox="0 0 14 9"><path d="M3 1h8a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H6V6.5h5a.5.5 0 0 0 .5-.5V3a.5.5 0 0 0-.5-.5H3.5V4L1 1.75 3.5-.5z"/></svg>')}
                        <div class='wa_logo'></div>
                    </div>

                    <div class='wa_pl'>
                        <div class='wa_title wa_pl_title'>
                            ${stripes}<div class='wa_title_text'>WINAMP PLAYLIST</div>${stripes}
                            <div class='wa_tbtn wa_shade' data-wa='pl_shade'></div>
                            <div class='wa_tbtn wa_close' data-wa='playlist'></div>
                        </div>
                        <div class='wa_pl_list'></div>
                        <div class='wa_pl_bottom'>
                            <div class='wa_btn wa_small' data-wa='menu'>ADD</div>
                            <div class='wa_btn wa_small' data-wa='menu'>REM</div>
                            <div class='wa_btn wa_small' data-wa='menu'>SEL</div>
                            <div class='wa_btn wa_small' data-wa='menu'>MISC</div>
                            <div class='wa_pl_total wa_lcdbox'></div>
                            ${waMiniControls()}
                            <div class='wa_pl_time wa_lcdbox' data-wa='time'></div>
                            <div class='wa_btn wa_small wa_listopts' data-wa='menu'>LIST<br>OPTS</div>
                            <div class='wa_pl_grip' data-wa='grip'></div>
                        </div>
                    </div>
                </div>
            </div>
        `
    }

    bind(node) {
        this.marquee_text = null
        this.marquee_measured = false
        this.flash_text = null
        this.time_text = null

        node.toggleClass('wa_pl_hidden', this.option('playlist', '1') == '0')
        node.toggleClass('wa_shaded', this.option('shade', '0') == '1')
        node.toggleClass('wa_pl_shaded', this.option('pl_shade', '0') == '1')
        node.toggleClass('wa_vis_off', this.option('vis', '1') == '0')
        node.find('.wa_pl_list').attr('style', `height:${this.option('pl_height', 174)}px`)

        node.on('click', '[data-wa]', (e) => {
            const target = e.target.closest('[data-wa]')
            this.action(target.dataset.wa, target, e)
        })

        node.find('.wa_main .wa_title').on('dblclick', (e) => {
            if(!e.target.closest('[data-wa]')) {
                this.action('shade')
            }
        })

        this.bindFlash(node.find('#aj_player_volume'), (ps) => `VOLUME: ${Math.round(ps * 100)}%`)
        this.bindFlash(node.find('#aj_player_track_length'), (ps) => {
            const track = window.player.currentTrack
            if(!track) {
                return null
            }

            return `SEEK TO: ${fmtTime(ps * track.length)}/${fmtTime(track.length)} (${Math.round(ps * 100)}%)`
        })
        this.bindResize(node.find('.wa_pl_grip'))
        node.find('#aj_player_volume .slider').attr('style', `left:${Math.ceil(this.audio.volume * 100)}%`)
        this.volume(this.audio.volume)
        this.startVis()
    }

    destroy() {
        cancelAnimationFrame(this.vis_frame)
        this.vis_frame = null
    }

    // пока тянут громкость или перемотку, бегущая строка показывает значение
    bindFlash(area, format) {
        const show = (e) => {
            const rect = area.find('.selectableTrack').nodes[0].getBoundingClientRect()
            const ps = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
            const text = format(ps)
            if(text) {
                this.flash(text)
            }
        }

        area.on('mousedown', show)
        area.on('mousemove', (e) => {
            if(e.buttons & 1) {
                show(e)
            }
        })
        area.on('mouseup mouseleave', () => {
            if(this.flash_text) {
                this.flash(null)
            }
        })
    }

    bindResize(grip) {
        grip.on('pointerdown', (e) => {
            e.preventDefault()
            const list = this.node.find('.wa_pl_list').nodes[0]
            const start_y = e.clientY
            const start_height = list.offsetHeight
            grip.nodes[0].setPointerCapture(e.pointerId)

            const move = (ev) => {
                // как в оригинале, высота меняется шагами по 29px
                const height = Math.min(580, Math.max(58, start_height + Math.round((ev.clientY - start_y) / 29) * 29))
                list.style.height = `${height}px`
            }
            const up = () => {
                grip.nodes[0].removeEventListener('pointermove', move)
                grip.nodes[0].removeEventListener('pointerup', up)
                this.setOption('pl_height', list.offsetHeight)
            }

            grip.nodes[0].addEventListener('pointermove', move)
            grip.nodes[0].addEventListener('pointerup', up)
        })
    }

    async action(name, target, e) {
        const player = window.player
        switch(name) {
            case 'prev':
                await player.playPreviousTrack()
                break
            case 'next':
                await player.playNextTrack()
                break
            case 'play':
                if(this.audio.paused) {
                    await player.play()
                } else {
                    this.audio.currentTime = 0
                }
                break
            case 'pause':
                if(!this.audio.paused) {
                    player.pause()
                } else if(this.status == 'pause') {
                    await player.play()
                }
                break
            case 'stop':
                if(!this.audio.paused) {
                    player.pause()
                }

                // pause() глушит звук плавно и останавливает через 150мс
                setTimeout(() => {
                    this.audio.currentTime = 0
                    this.update()
                }, 200)
                break
            case 'eject':
                if(player.context && player.context.object && player.context.object.url) {
                    window.router.route(player.context.object.url)
                }
                break
            case 'shuffle':
                if(player.tracks.length > 0) {
                    await player.shuffle()
                }
                break
            case 'repeat':
                if(!player.currentTrack) {
                    return
                }

                this.audio.loop = !this.audio.loop
                player.uiPlayer.find('.repeatButton').toggleClass('pressed', this.audio.loop)
                this.update()
                break
            case 'playlist':
                this.setOption('playlist', this.node.hasClass('wa_pl_hidden') ? '1' : '0')
                this.node.toggleClass('wa_pl_hidden')
                break
            case 'pl_shade':
                this.setOption('pl_shade', this.node.hasClass('wa_pl_shaded') ? '0' : '1')
                this.node.toggleClass('wa_pl_shaded')
                break
            case 'shade':
                this.setOption('shade', this.node.hasClass('wa_shaded') ? '0' : '1')
                this.node.toggleClass('wa_shaded')
                this.update()
                break
            case 'close':
                player.ajClose()
                break
            case 'time':
                this.setOption('remaining', this.option('remaining', '0') == '1' ? '0' : '1')
                this.time_text = null
                this.time(this.audio.currentTime)
                break
            case 'vis':
                this.setOption('vis', this.node.hasClass('wa_vis_off') ? '1' : '0')
                this.node.toggleClass('wa_vis_off')
                break
            case 'menu':
                // иначе глобальный обработчик клика сразу закроет меню
                e.stopPropagation()
                const rect = target.getBoundingClientRect()
                target.dispatchEvent(new MouseEvent('contextmenu', {
                    bubbles: true,
                    clientX: rect.left,
                    clientY: rect.bottom,
                }))
                break
        }
    }

    queueRow(track, num) {
        return `
            <div class="aj_track" data-id="${track.getId()}">
                <span class="wa_pl_name">${num}. ${escapeHtml(track.getPerformer())} - ${escapeHtml(track.getTitle())}</span>
                <span class="wa_pl_len">${waLength(track.item.length)}</span>
            </div>
        `
    }

    update() {
        const node = this.node
        if(node.length == 0) {
            return
        }

        const status = this.status
        const track = window.player.currentTrack
        node.removeClass('wa_play wa_pause wa_stop').addClass(`wa_${status}`)
        node.find('.wa_status').html(this.statusSvg(status))
        node.find('.wa_repeat').toggleClass('wa_on', this.audio.loop)

        if(track) {
            const num = window.player.tracks.indexOf(track) + 1
            this.setMarquee(`${num}. ${track.performer} - ${track.name} (${waLength(track.length)})`)
        } else {
            this.setMarquee('')
        }

        const loaded = window.player.tracks.reduce((sum, item) => sum + Number(item.length ?? 0), 0)
        const context = window.player.context
        const more = context.pagesCount > (context.playedPages ?? []).length
        node.find('.wa_pl_total').text(track ? `${waLength(track.length)}/${waLength(loaded)}${more ? '+' : ''}` : '')

        this.updateStream()
        this.time_text = null
        this.time(this.audio.currentTime)
    }

    updateStream() {
        const node = this.node
        const active = this.status != 'stop'
        let kbps = ''
        let mono = false
        if(active) {
            try {
                const dash = window.player.dashPlayer
                const list = dash.getBitrateInfoListFor('audio')
                const info = list[dash.getQualityFor('audio')] ?? list[0]
                kbps = info ? String(Math.round(info.bitrate / 1000)) : ''

                const channels = dash.getCurrentTrackFor('audio')?.audioChannelConfiguration?.[0]
                mono = parseInt(channels?.value ?? channels) == 1
            } catch(e) {}
        }

        node.find('.wa_kbps').text(kbps)
        // processAudio.sh всегда перекодирует в 44100 Гц
        node.find('.wa_khz').text(active ? '44' : '')
        node.find('.wa_mono').toggleClass('wa_on', active && mono)
        node.find('.wa_stereo').toggleClass('wa_on', active && !mono)
    }

    time(time) {
        const node = this.node
        const track = window.player.currentTrack
        if(node.length == 0) {
            return
        }

        // состояние могло смениться без __updateFace, например при восстановлении позиции из дампа
        if(!node.hasClass(`wa_${this.status}`)) {
            this.update()
            return
        }

        let text = '      '
        if(track && this.status != 'stop') {
            text = this.option('remaining', '0') == '1'
                ? '-' + fmtTime(Math.max(0, track.length - time))
                : ' ' + fmtTime(time)
            text = text.slice(-6).padStart(6, ' ')
        }

        if(text == this.time_text) {
            return
        }

        this.time_text = text
        node.find('.wa_time').html(waDigitsSvg(text))
        node.find('.wa_pl_time, .wa_shade_time').text(text.trim())

        if(node.find('.wa_kbps').text() == '' && this.status != 'stop') {
            this.updateStream()
        }
    }

    volume(volume) {
        // как в оригинале: чем громче, тем краснее полоса
        this.node.find('.wa_volume').attr('style', `--wa-volume-color: hsl(${Math.round((1 - volume) * 120)}deg 85% 42%)`)
    }

    statusSvg(status) {
        const shapes = {
            play: '<rect x="0" y="3" width="2" height="3" class="wa_led"/><path d="M3 0h1l5 4v1l-5 4H3z"/>',
            pause: '<rect x="1" y="1" width="3" height="7"/><rect x="5" y="1" width="3" height="7"/>',
            stop: '<rect x="1" y="1" width="7" height="7"/>',
        }

        return `<svg width="9" height="9" viewBox="0 0 9 9" shape-rendering="crispEdges">${shapes[status]}</svg>`
    }

    setMarquee(text) {
        // пока плеер скрыт, ширину строки не измерить
        if(text == this.marquee_text && this.marquee_measured) {
            return
        }

        this.marquee_text = text
        if(!this.flash_text) {
            this.renderMarquee(text, true)
        }
    }

    flash(text) {
        this.flash_text = text
        this.renderMarquee(text ?? this.marquee_text ?? '', !text)
    }

    renderMarquee(text, scroll) {
        const box = this.node.find('.wa_marquee')
        const inner = box.find('.wa_marquee_text')
        if(box.length == 0) {
            return
        }

        inner.removeClass('wa_scroll').text(text)
        this.marquee_measured = box.nodes[0].clientWidth > 0
        if(!scroll || inner.nodes[0].offsetWidth <= box.nodes[0].clientWidth) {
            return
        }

        // текст повторён дважды, анимация сдвигает его ровно на одну копию
        inner.text(`${text}  ***  ${text}  ***  `)
        inner.attr('style', `animation-duration: ${Math.round(text.length * 0.18 + 2)}s`)
        inner.addClass('wa_scroll')
    }

    startVis() {
        const canvas = this.node.find('.wa_vis').nodes[0]
        const ctx = canvas.getContext('2d')
        const gradient = ctx.createLinearGradient(0, 0, 0, 16)
        WA_VIS_COLORS.forEach((color, i) => {
            gradient.addColorStop(i / WA_VIS_COLORS.length, color)
            gradient.addColorStop((i + 1) / WA_VIS_COLORS.length, color)
        })

        const bars = new Array(19).fill(0)
        const peaks = new Array(19).fill(0)
        const phases = bars.map(() => Math.random() * Math.PI * 2)
        const speeds = bars.map(() => 2 + Math.random() * 5)
        let last = 0

        const draw = (now) => {
            if(!canvas.isConnected) {
                this.vis_frame = null
                return
            }

            this.vis_frame = requestAnimationFrame(draw)
            if(now - last < 33) {
                return
            }

            last = now
            const playing = !this.audio.paused && !this.node.hasClass('hidden') && !this.node.hasClass('wa_vis_off')
            if(!playing && peaks.every(peak => peak == 0)) {
                return
            }

            // звук зашифрован (clearkey), через WebAudio его не разобрать, поэтому спектр имитируется
            const t = now / 1000
            const beat = Math.pow(Math.max(0, Math.sin(t * Math.PI * 2.1)), 8)
            bars.forEach((bar, i) => {
                let level = 0
                if(playing) {
                    const wave = 0.5 + 0.5 * Math.sin(t * speeds[i] + phases[i])
                    level = (1 - i / 24) * (0.3 + 0.55 * wave) * (0.75 + Math.random() * 0.25) + beat * (i < 6 ? 0.35 : 0.1)
                }

                bars[i] = Math.max(Math.min(16, Math.round(level * 16)), bar - 1)
                peaks[i] = bars[i] >= peaks[i] ? bars[i] : Math.max(0, peaks[i] - 0.3)
            })

            ctx.fillStyle = '#000'
            ctx.fillRect(0, 0, 76, 16)
            ctx.fillStyle = '#182129'
            for(let y = 1; y < 16; y += 2) {
                for(let x = 1; x < 76; x += 2) {
                    ctx.fillRect(x, y, 1, 1)
                }
            }

            ctx.fillStyle = gradient
            bars.forEach((bar, i) => ctx.fillRect(i * 4, 16 - bar, 3, bar))
            ctx.fillStyle = '#969696'
            peaks.forEach((peak, i) => {
                if(peak >= 1) {
                    ctx.fillRect(i * 4, 16 - Math.round(peak) - 1, 3, 1)
                }
            })
        }

        cancelAnimationFrame(this.vis_frame)
        ctx.fillStyle = '#000'
        ctx.fillRect(0, 0, 76, 16)
        this.vis_frame = requestAnimationFrame(draw)
    }
}
