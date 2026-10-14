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

class WinampSkin {
    queueParent = '#ajax_audio_player .wa_pl_list'
    cancel = '[data-wa], #aj_player_track_length, #aj_player_volume, #aj_player_tracks, .wa_balance'

    marquee_text = null
    marquee_measured = false
    flash_text = null
    time_text = null
    kbps_text = ''
    vis_frame = null

    vis_palette = { bg: '#000', dots: '#182129', bars: WA_VIS_COLORS, peak: '#969696' }

    constructor(name) {
        this.name = name
    }

    get node() {
        return u(`#ajax_audio_player.skin_${this.name}`)
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
        this.renderStatus(node, status)
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
        this.setText(node.find('.wa_pl_total'), track ? `${waLength(track.length)}/${waLength(loaded)}${more ? '+' : ''}` : '')

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

        this.kbps_text = kbps
        this.setText(node.find('.wa_kbps'), kbps)
        // processAudio.sh всегда перекодирует в 44100 Гц
        this.setText(node.find('.wa_khz'), active ? '44' : '')
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
        this.renderTime(node, text)
        this.setText(node.find('.wa_pl_time'), text.trim())
        this.setText(node.find('.wa_shade_time'), text.trim())

        if(this.kbps_text == '' && this.status != 'stop') {
            this.updateStream()
        }
    }

    volume(volume) {
        // как в оригинале: чем громче, тем краснее полоса
        this.node.find('.wa_volume').attr('style', `--wa-volume-color: hsl(${Math.round((1 - volume) * 120)}deg 85% 42%)`)
    }

    setText(el, text) {
        el.text(text)
    }

    renderTime(node, text) {
        node.find('.wa_time').html(waDigitsSvg(text))
    }

    renderStatus(node, status) {
        node.find('.wa_status').html(this.statusSvg(status))
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
        const palette = this.vis_palette
        const gradient = ctx.createLinearGradient(0, 0, 0, 16)
        palette.bars.forEach((color, i) => {
            gradient.addColorStop(i / palette.bars.length, color)
            gradient.addColorStop((i + 1) / palette.bars.length, color)
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

            ctx.fillStyle = palette.bg
            ctx.fillRect(0, 0, 76, 16)
            ctx.fillStyle = palette.dots
            for(let y = 1; y < 16; y += 2) {
                for(let x = 1; x < 76; x += 2) {
                    ctx.fillRect(x, y, 1, 1)
                }
            }

            ctx.fillStyle = gradient
            bars.forEach((bar, i) => ctx.fillRect(i * 4, 16 - bar, 3, bar))
            ctx.fillStyle = palette.peak
            peaks.forEach((peak, i) => {
                if(peak >= 1) {
                    ctx.fillRect(i * 4, 16 - Math.round(peak) - 1, 3, 1)
                }
            })
        }

        cancelAnimationFrame(this.vis_frame)
        ctx.fillStyle = palette.bg
        ctx.fillRect(0, 0, 76, 16)
        this.vis_frame = requestAnimationFrame(draw)
    }
}

window.ajaxPlayerSkins = window.ajaxPlayerSkins ?? {}
window.ajaxPlayerSkins.winamp = new WinampSkin('winamp')

// раскладка text.bmp: буквы, цифры со знаками, редкие символы; ячейка 5x6
const WA_FONT = {}
'ABCDEFGHIJKLMNOPQRSTUVWXYZ"@'.split('').forEach((char, i) => WA_FONT[char] = [i, 0])
'0123456789….:()-\'!_+\\/[]^&%,=$#'.split('').forEach((char, i) => WA_FONT[char] = [i, 1])
'ÅÖÄ?*'.split('').forEach((char, i) => WA_FONT[char] = [i, 2])
Object.assign(WA_FONT, { ' ': [30, 0], '<': WA_FONT['['], '>': WA_FONT[']'], '{': WA_FONT['['], '}': WA_FONT[']'], '`': WA_FONT["'"] })

// классические скины winamp из .wsz, отрисованные их собственными спрайтами
class WinampBitmapSkin extends WinampSkin {
    text_image = null

    constructor(name, config) {
        super(name)
        this.title = config.title
        this.config = config
        this.path = `/assets/packages/static/openvk/img/winamp_skins/${name}/`
        this.vis_palette = { bg: config.vis[0], dots: config.vis[1], bars: config.vis.slice(2, 18), peak: config.vis[23] }
    }

    template() {
        const sprites = ['main', 'titlebar', 'cbuttons', 'playpaus', 'numbers', 'text', 'volume', 'balance', 'posbar', 'shufrep', 'monoster', 'pledit', 'pl_top_tile', 'pl_left_tile', 'pl_right_tile']
        const pl = this.config.playlist
        const vars = sprites.map(sprite => `--wa-${sprite.replaceAll('_', '-')}: url('${this.path}${sprite}.png')`).concat([
            `--wa-pl-normal: ${pl.normal}`, `--wa-pl-current: ${pl.current}`, `--wa-pl-bg: ${pl.bg}`,
            `--wa-pl-selected: ${pl.selected}`, `--wa-pl-font: '${pl.font}'`, `--wa-text-color: ${this.config.textColor}`,
            this.config.region ? `--wa-region: path('${this.config.region}')` : '',
        ]).filter(Boolean).join('; ')
        const classes = [
            this.config.numsEx ? 'wa_nums_ex' : '',
            this.config.volumeThumb ? '' : 'wa_no_volume_thumb',
            this.config.balanceThumb ? '' : 'wa_no_balance_thumb',
        ].join(' ')
        const thumb_track = (id, cls) => `
            <div id='${id}' class='${cls}'>
                <div class='selectableTrack'>
                    <div class='wa_thumb_area'>
                        <div class='slider'></div>
                    </div>
                </div>
            </div>
        `
        const hit = (action, cls = '') => `<div class='wa_hit ${cls}' data-wa='${action}'></div>`

        return `
            <div id='ajax_audio_player' class='ctx_place wa_skin'>
                <div id='aj_player' class='wa wa_bitmap ${classes}' style="${vars}">
                    <div class='wa_main'>
                        <div class='wa_title'></div>
                        <div class='wa_tbtn wa_menu' data-wa='menu'></div>
                        <div class='wa_tbtn wa_minimize' data-wa='shade'></div>
                        <div class='wa_tbtn wa_shade' data-wa='shade'></div>
                        <div class='wa_tbtn wa_close' data-wa='close'></div>

                        <div class='wa_clutter'></div>
                        <div class='wa_work'></div>
                        <div class='wa_status'></div>
                        <div class='wa_time' data-wa='time'>
                            <span class='wa_digit wa_minus'></span><span class='wa_digit'></span><span class='wa_digit'></span><span class='wa_digit'></span><span class='wa_digit'></span>
                        </div>
                        <canvas class='wa_vis' width='76' height='16' data-wa='vis'></canvas>
                        <div class='wa_marquee'></div>
                        <div class='wa_kbps'></div>
                        <div class='wa_khz'></div>
                        <div class='wa_mono'></div>
                        <div class='wa_stereo'></div>

                        ${thumb_track('aj_player_volume', 'wa_volume')}
                        <div class='wa_balance'><div class='wa_balance_thumb'></div></div>
                        <div class='wa_eq'></div>
                        <div class='wa_pl_toggle' data-wa='playlist'></div>
                        ${thumb_track('aj_player_track_length', 'wa_posbar')}

                        <div class='wa_btn wa_prev' data-wa='prev'></div>
                        <div class='wa_btn wa_play' data-wa='play'></div>
                        <div class='wa_btn wa_pause' data-wa='pause'></div>
                        <div class='wa_btn wa_stop' data-wa='stop'></div>
                        <div class='wa_btn wa_next' data-wa='next'></div>
                        <div class='wa_btn wa_eject' data-wa='eject'></div>
                        <div class='wa_btn wa_shuffle' data-wa='shuffle'></div>
                        <div class='wa_btn wa_repeat' data-wa='repeat'></div>

                        <div class='wa_shade_time' data-wa='time'></div>
                        <div class='wa_shade_pos'><div class='wa_shade_thumb'></div></div>
                        <div class='wa_shade_btns'>
                            ${hit('prev')}${hit('play')}${hit('pause')}${hit('stop')}${hit('next')}${hit('eject')}
                        </div>
                    </div>

                    <div class='wa_pl'>
                        <div class='wa_pl_top'>
                            <div class='wa_plt_left'></div><div class='wa_plt_fill'></div>
                            <div class='wa_plt_title'></div><div class='wa_plt_fill'></div>
                            <div class='wa_plt_right'></div>
                            ${hit('pl_shade', 'wa_pl_shade_btn')}${hit('playlist', 'wa_pl_close')}
                        </div>
                        <div class='wa_pl_middle'>
                            <div class='wa_pl_side'></div>
                            <div class='wa_pl_list'></div>
                            <div class='wa_pl_scroll'><div class='wa_pl_thumb' data-wa='scroll'></div></div>
                        </div>
                        <div class='wa_pl_bottom'>
                            <div class='wa_plb_left'></div><div class='wa_plb_right'></div>
                            ${hit('menu', 'wa_pl_menu')}${hit('menu', 'wa_pl_menu')}${hit('menu', 'wa_pl_menu')}${hit('menu', 'wa_pl_menu')}${hit('menu', 'wa_pl_menu wa_pl_listopts')}
                            <div class='wa_pl_total'></div>
                            <div class='wa_pl_mini'>
                                ${hit('prev')}${hit('play')}${hit('pause')}${hit('stop')}${hit('next')}${hit('eject')}
                            </div>
                            <div class='wa_pl_time' data-wa='time'></div>
                            <div class='wa_pl_grip' data-wa='grip'></div>
                        </div>
                    </div>
                </div>
            </div>
        `
    }

    bind(node) {
        super.bind(node)
        this.bindScroll(node)

        // пока шрифт не загружен, текст не нарисовать; после загрузки всё перерисовывается
        this.text_image = new Image()
        this.text_image.src = this.path + 'text.png'
        this.text_image.decode().then(() => {
            this.marquee_text = null
            this.update()
        }).catch(() => {})
    }

    // родной скроллбар спрятан, ползунок рисуется спрайтом из pledit.bmp
    bindScroll(node) {
        const list = node.find('.wa_pl_list').nodes[0]
        const thumb = node.find('.wa_pl_thumb').nodes[0]
        const tracks = () => list.querySelector('#aj_player_tracks')

        this.syncScroll = () => {
            const el = tracks()
            if(!el) {
                return
            }

            const max = el.scrollHeight - el.clientHeight
            thumb.style.top = `${max > 0 ? Math.round(el.scrollTop / max * (list.offsetHeight - 18)) : 0}px`
        }
        list.addEventListener('scroll', this.syncScroll, true)

        thumb.addEventListener('pointerdown', (e) => {
            const el = tracks()
            if(!el) {
                return
            }

            e.preventDefault()
            thumb.setPointerCapture(e.pointerId)
            const start_y = e.clientY
            const start_top = thumb.offsetTop
            const move = (ev) => {
                const room = list.offsetHeight - 18
                const top = Math.min(room, Math.max(0, start_top + ev.clientY - start_y))
                el.scrollTop = room > 0 ? top / room * (el.scrollHeight - el.clientHeight) : 0
            }
            const up = () => {
                thumb.removeEventListener('pointermove', move)
                thumb.removeEventListener('pointerup', up)
            }

            thumb.addEventListener('pointermove', move)
            thumb.addEventListener('pointerup', up)
        })
    }

    update() {
        super.update()
        this.syncScroll?.()
    }

    // буквы других алфавитов в text.bmp не нарисованы, такие строки пишутся обычным шрифтом
    needsFont(text) {
        return [...text].some(char => /\p{L}/u.test(char) && !WA_FONT[char.normalize('NFD')[0].toUpperCase()])
    }

    drawText(text) {
        const chars = [...text]
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, chars.length * 5)
        canvas.height = 6
        canvas.className = 'wa_text'

        const img = this.text_image
        if(img && img.complete && img.naturalWidth > 0) {
            const ctx = canvas.getContext('2d')
            chars.forEach((char, i) => {
                const [col, row] = WA_FONT[char.normalize('NFD')[0].toUpperCase()] ?? WA_FONT[' ']
                ctx.drawImage(img, col * 5, row * 6, 5, 6, i * 5, 0, 5, 6)
            })
        }

        return canvas
    }

    setText(el, text) {
        el.empty()
        if(text) {
            el.append(this.drawText(text))
        }
    }

    renderTime(node, text) {
        const chars = [text[0], text[1], text[2], text[4], text[5]]
        node.find('.wa_time .wa_digit').each((el, i) => {
            const char = chars[i]
            if(i == 0) {
                el.classList.toggle('wa_on', char == '-')
                return
            }

            el.classList.toggle('wa_on', char >= '0' && char <= '9')
            el.style.backgroundPosition = `-${Number(char) * 9}px 0`
        })
    }

    renderStatus(node, status) {}

    time(time) {
        super.time(time)

        const track = window.player.currentTrack
        const ps = track && this.status != 'stop' ? Math.min(1, time / track.length) : 0
        this.node.find('.wa_shade_thumb').attr('style', `left:${Math.round(ps * 14)}px`)
    }

    volume(volume) {
        // в volume.bmp 28 кадров полосы с шагом 15px
        this.node.find('.wa_volume').attr('style', `background-position: 0 -${Math.round(volume * 27) * 15}px`)
    }

    renderMarquee(text, scroll) {
        const box = this.node.find('.wa_marquee')
        if(box.length == 0) {
            return
        }

        const font = this.needsFont(text)
        box.toggleClass('wa_marquee_font', font)
        box.empty()
        if(font) {
            box.append(`<span class='wa_marquee_text'></span>`)
            super.renderMarquee(text, scroll)
            return
        }

        this.marquee_measured = box.nodes[0].clientWidth > 0
        if(!scroll || [...text].length * 5 <= 154) {
            box.append(this.drawText(text))
            return
        }

        // как в оригинале, строка сдвигается по одному символу
        const loop = `${text}  ***  `
        const steps = [...loop].length
        const canvas = this.drawText(loop + loop)
        canvas.classList.add('wa_scroll')
        canvas.style.animationDuration = `${(steps * 0.15).toFixed(2)}s`
        canvas.style.animationTimingFunction = `steps(${steps})`
        box.append(canvas)
    }
}

// конфиги собраны из viscolor.txt, pledit.txt и region.txt каждого скина
const WA_BITMAP_SKINS = {
    xbox: {"title": "XBOX", "numsEx": false, "volumeThumb": true, "balanceThumb": true, "textColor": "#5a8c10", "playlist": {"normal": "#669900", "current": "#66CC00", "bg": "#000000", "selected": "#333333", "font": "Arial"}, "vis": ["#30302f", "#30302f", "#30302f", "#5a8c10", "#5a8c10", "#5a8c10", "#5a8c10", "#5a8c10", "#5a8c10", "#5a8c10", "#5a8c10", "#5a8c10", "#5a8c10", "#5a8c10", "#5a8c10", "#5a8c10", "#5a8c10", "#5a8c10", "#30302f", "#5a8c10", "#5a8c10", "#5a8c10", "#5a8c10", "#5a8c10"], "region": null},
    nucleo: {"title": "Nucleo Alien Mind", "numsEx": false, "volumeThumb": false, "balanceThumb": false, "textColor": "#ff8a00", "playlist": {"normal": "#B36100", "current": "#FF8A00", "bg": "#000000", "selected": "#522C00", "font": "MS Sans Serif"}, "vis": ["#000000", "#000000", "#ff8b00", "#ff9000", "#ff9e00", "#ffa600", "#ffa800", "#ffa400", "#ff9700", "#ff8c00", "#ff8a00", "#f38300", "#e27a00", "#cf7000", "#bf6800", "#af5e00", "#a05700", "#945000", "#ff8a00", "#e27a00", "#bf6800", "#a05700", "#945000", "#bf6800"], "region": null},
    gamecube: {"title": "GameCube Amp", "numsEx": true, "volumeThumb": false, "balanceThumb": false, "textColor": "#ffffff", "playlist": {"normal": "#5271C0", "current": "#FFFFFF", "bg": "#000000", "selected": "#000080", "font": "Arial"}, "vis": ["#000000", "#000000", "#0f2050", "#0f1850", "#103060", "#1f4870", "#1f406f", "#1f386f", "#20587f", "#20507f", "#205070", "#2f708f", "#2f6880", "#2f6080", "#3f889f", "#4098a0", "#3f8090", "#4fa8af", "#308090", "#30788f", "#307894", "#00084f", "#949ca5", "#969696"], "region": null},
    classified: {"title": "Winamp5 Classified", "numsEx": true, "volumeThumb": true, "balanceThumb": true, "textColor": "#ffffff", "playlist": {"normal": "#FFFFFF", "current": "#BBD2FF", "bg": "#1C3D7D", "selected": "#6788C9", "font": "Arial"}, "vis": ["#274987", "#002263", "#ffffff", "#274987", "#ffffff", "#274987", "#ffffff", "#274987", "#ffffff", "#274987", "#ffffff", "#274987", "#ffffff", "#274987", "#ffffff", "#274987", "#ffffff", "#ffffff", "#ffffff", "#ffffff", "#ffffff", "#ffffff", "#ffffff", "#ffffff"], "region": "M5 0L270 0L270 115L5 115ZM3 1L272 1L272 114L3 114ZM2 2L273 2L273 113L2 113ZM1 3L274 3L274 112L1 112ZM0 5L275 5L275 110L0 110ZM4 114L271 114L271 115L4 115ZM6 115L269 115L269 116L6 116Z"},
}

for(const [name, config] of Object.entries(WA_BITMAP_SKINS)) {
    window.ajaxPlayerSkins[name] = new WinampBitmapSkin(name, config)
}
