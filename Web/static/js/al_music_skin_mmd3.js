// скин MMD3 из winamp 3 (.wal): раскладка из player-normal.xml и player-shade.xml, цвета из color-presets.xml
const MM_PATH = '/assets/packages/static/openvk/img/winamp_skins/mmd3/'
let mm_config = null

function mmLoadConfig() {
    mm_config = mm_config ?? fetch(MM_PATH + 'skin.json').then(res => res.json())
    return mm_config
}

// формула из GammaFilter.cpp winamp
function mmGamma(data, [r, g, b, gray, boost]) {
    const rm = 65535 + (r << 4)
    const gm = 65535 + (g << 4)
    const bm = 65535 + (b << 4)
    const clamp = (v) => v < 0 ? 0 : v > 255 ? 255 : v

    for(let i = 0; i < data.length; i += 4) {
        let cr = data[i], cg = data[i + 1], cb = data[i + 2]
        if(gray == 1) {
            cr = cg = cb = Math.max(cr, cg, cb)
        } else if(gray == 2) {
            cr = cg = cb = ((cr + cg + cb) / 3) | 0
        }

        if(boost) {
            cr = (cr >> 1) + 127
            cg = (cg >> 1) + 127
            cb = (cb >> 1) + 127
        }

        data[i] = clamp((cr * rm) >> 16)
        data[i + 1] = clamp((cg * gm) >> 16)
        data[i + 2] = clamp((cb * bm) >> 16)
    }
}

function mmEl(cls, sprite, x, y, opts = {}) {
    const style = [opts.pos ?? `left:${x}px;top:${y}px`]
    if(opts.w) style.push(`width:${opts.w}px`)
    if(opts.h) style.push(`height:${opts.h}px`)

    const attrs = [`class='mm_el ${cls}'`, `style='${style.join(';')}'`]
    if(sprite) attrs.push(`data-sprite='${sprite}'`)
    for(const key of ['down', 'active', 'thumb', 'thumb-down', 'wa', 'mode', 'font', 'align', 'frames', 'tile']) {
        if(opts[key] !== undefined) attrs.push(`data-${key}='${opts[key]}'`)
    }
    if(opts.id) attrs.push(`id='${opts.id}'`)

    return `<div ${attrs.join(' ')}>${opts.html ?? ''}</div>`
}

function mmButton(cls, sprite, x, y, action, opts = {}) {
    return mmEl(cls, sprite, x, y, Object.assign({ down: sprite + '.down', wa: action }, opts))
}

function mmSlider(cls, x, y, w, h, thumb, opts = {}) {
    return mmEl(`mm_slider ${cls}`, null, x, y, Object.assign({ w, h, thumb, 'thumb-down': opts.down ?? thumb + '.down', html: `
        <div class='selectableTrack'><div class='wa_thumb_area'><div class='slider'></div></div></div>
    ` }, opts))
}

class WinampModernSkin extends WinampSkin {
    title = 'MMD3'
    cancel = '[data-wa], .mm_slider, .mm_volknob, #aj_player_tracks, .mm_ctlist, .mm_pl_scroll, .mm_plshade'

    images = {}
    canvases = {}
    urls = []
    drawer = null
    drawer_busy = false
    vu_frame = 0

    get theme() {
        return Number(this.option('mmd3_theme', 0))
    }

    get vis_mode() {
        return Number(this.option('mmd3_vis', 1))
    }

    template() {
        const ticker_font = 'player.ticker.font'
        const vis_buttons = [[28, 36], [68, 36], [28, 71], [68, 71], [28, 106], [68, 106], [148, 36], [148, 71], [148, 106]].map(([x, y], i) => {
            const sprite = i < 6 ? `player.button.visbbg${i + 1}` : `player.button.visbfg${[1, 3, 5][i - 6]}`
            return mmButton('mm_visbtn', sprite, x, y, 'vis_mode', { mode: i + 1 })
        }).join('')
        const vis_leds = [[12, 35], [100, 35], [12, 70], [100, 70], [12, 105], [100, 105], [132, 35], [132, 70], [132, 105]].map(([x, y], i) => {
            return mmEl(`mm_visled mm_visled_${i + 1}`, 'player.led.on', x, y)
        }).join('')
        const eq_sliders = [13, 52, 66, 80, 94, 108, 122, 136, 150, 164, 178].map(x => {
            return mmEl('mm_eqknob', 'player.main.eq.knob', x, 86)
        }).join('')

        return `
            <div id='ajax_audio_player' class='ctx_place mm_skin mm_loading'>
                <div id='aj_player' class='wa mm'>
                    <div class='wa_main mm_main'>
                        ${mmEl('', 'player.bgbase', 0, 0)}

                        <div class='mm_el mm_drawer mm_drawer_eq' style='left:149px;top:22px'>
                            ${mmEl('', 'player.eq.bg', 0, 0)}
                            ${mmEl('', 'player.textlabel6', 9, 36)}
                            ${mmEl('', 'player.textlabel7', 51, 151)}
                            ${eq_sliders}
                            ${mmEl('', 'player.main.eq.knob2', 67, 36)}
                            ${mmEl('', 'player.main.eq.knob2', 127, 36)}
                            ${mmEl('', 'player.main.eq.cfdisplay', 178, 33)}
                            ${mmButton('', 'player.button.eqs2', 206, 122, 'drawer_eq')}
                            ${mmButton('', 'player.button.viss', 206, 29, 'drawer_vis')}
                            ${mmButton('', 'player.button.ct', 210, 55, 'drawer_ct')}
                            ${mmButton('', 'player.button.eqonoff', 44, 7, 'eq')}
                            ${mmButton('', 'player.button.auto', 91, 7, 'eq')}
                            ${mmButton('', 'player.button.presets', 149, 9, 'eq')}
                        </div>

                        <div class='mm_el mm_drawer mm_drawer_vis' style='left:149px;top:22px'>
                            ${mmEl('', 'player.visd.bg', 0, 0)}
                            ${vis_buttons}
                            ${vis_leds}
                            ${mmButton('', 'player.button.viss2', 206, 29, 'drawer_vis')}
                            ${mmButton('', 'player.button.eqs', 206, 122, 'drawer_eq')}
                            ${mmButton('', 'player.button.ct', 210, 55, 'drawer_ct')}
                            ${mmEl('', 'player.textlabel4', 48, 9)}
                            ${mmEl('', 'player.textlabel5', 147, 9)}
                            ${mmEl('', 'player.textlabel9', 41, 151)}
                        </div>

                        <div class='mm_el mm_drawer mm_drawer_ct' style='left:149px;top:22px'>
                            ${mmEl('', 'player.ct.bg', 0, 0)}
                            ${mmEl('', 'player.button.ctbig', 186, 2)}
                            ${mmButton('', 'player.button.ct2', 210, 55, 'drawer_ct')}
                            ${mmEl('', 'player.ctdummy1', 43, 46)}
                            ${mmEl('', 'player.ctdummy2', 43, 34)}
                            ${mmEl('', 'player.ctdummy3', 101, 92)}
                            ${mmEl('', 'player.button.switch', 177, 142)}
                            ${mmEl('', 'player.textlabel10', 40, 152)}
                            ${mmEl('', 'player.textlabel14', 67, 9)}
                        </div>

                        ${mmEl('', 'player.bgbase.overlay', 0, 0)}

                        <div class='mm_el mm_ctlayer' style='left:350px;top:45px'>
                            ${mmEl('', 'player.ct.overlay', 0, 0)}
                            ${mmButton('', 'player.button.eqs', 5, 99, 'drawer_eq')}
                            ${mmButton('', 'player.button.viss', 5, 6, 'drawer_vis')}
                        </div>

                        <div class='mm_el mm_onoff' style='left:347px;top:23px'>
                            ${mmEl('', 'player.eq.buttonoverlay', 0, 0)}
                            ${mmButton('', 'player.button.eqs', 8, 121, 'drawer_eq')}
                            ${mmButton('', 'player.button.viss', 8, 28, 'drawer_vis')}
                            ${mmButton('', 'player.button.ct', 12, 54, 'drawer_ct')}
                        </div>

                        <div class='mm_el mm_ctlist' style='left:392px;top:56px'>
                            ${mmEl('', 'player.ct.listbg', 0, 0)}
                            <div class='mm_ctitems'></div>
                            ${mmButton('', 'player.button.switch', 134, 108, 'ct_switch')}
                        </div>

                        <div class='mm_el mm_player'>
                            ${mmEl('', 'player.thinger', 45, 109)}
                            ${mmEl('mm_text mm_thinger_text', null, 45, 149, { w: 67, h: 8, font: 'player.minifont', align: 'center' })}
                            ${mmButton('', 'player.thinger.main.lefta', 62, 157, 'playlist')}
                            ${mmButton('', 'player.thinger.main.righta', 80, 157, 'playlist')}
                            ${mmEl('', 'player.thinger.overlay', 45, 109)}
                            ${mmEl('mm_thinger_hit', null, 50, 112, { w: 57, h: 38, wa: 'playlist' })}
                            ${mmEl('', 'player.frontcover', 34, 0)}
                            ${mmEl('', 'player.display', 53, 9)}
                            ${mmEl('mm_dis4', 'player.vis.bg', 115, 33)}
                            ${mmEl('mm_visani', 'player.vis.ani1', 120, 34, { w: 110, h: 56, frames: 56 })}
                            ${mmEl('mm_dis1', 'player.vis.bg2', 115, 34)}
                            ${mmEl('', 'player.display.labels', 248, 42)}
                            <canvas class='mm_el wa_vis mm_vis' width='109' height='56' style='left:121px;top:34px'></canvas>
                            ${mmEl('mm_dis2', 'player.vis.overlay3', 120, 34)}
                            ${mmEl('mm_dis3', 'player.vis.overlay', 120, 34)}

                            ${mmEl('', 'player.textlabel1', 42, 200)}
                            ${mmEl('', 'player.textlabel2', 152, 192)}
                            ${mmEl('', 'player.textlabel3', 155, 159)}
                            ${mmEl('', 'player.textlabel8', 297, 193)}
                            ${mmEl('mm_switcher', 'player.textlabel11', 156, 4)}
                            ${mmEl('', 'player.textlabel12', 156, 134)}
                            ${mmEl('', 'player.textlabel13', 7, 144)}
                            ${mmEl('mm_switcher', null, 44, 0, { w: 290, h: 25 })}

                            ${mmButton('', 'player.button.open', 7, 181, 'eject')}
                            ${mmButton('', 'player.button.minimize', 336, 5, 'shade')}
                            ${mmButton('', 'player.button.close', 353, 5, 'close')}
                            ${mmEl('mm_glow', 'player.glow', 258, 102)}
                            ${mmButton('', 'player.button.prev', 266, 144, 'prev')}
                            ${mmButton('', 'player.button.next', 298, 144, 'next')}
                            ${mmButton('', 'player.button.pause', 288, 137, 'pause')}
                            ${mmButton('', 'player.button.play', 298, 110, 'play')}
                            ${mmButton('', 'player.button.stop', 266, 110, 'stop')}
                            ${mmButton('', 'player.button.sys', 14, 7, 'menu')}
                            ${mmButton('', 'player.button.small', 340, 20, 'shade')}
                            ${mmButton('', 'player.button.cfg', 5, 125, 'menu')}

                            ${mmButton('', 'player.button.repeat', 15, 80, 'repeat')}
                            ${mmButton('', 'player.button.shuffle', 11, 55, 'shuffle')}
                            ${mmButton('', 'player.button.crossfade', 9, 30, 'crossfade')}
                            ${mmEl('mm_led_repeat', 'player.led.on', 34, 80)}
                            ${mmEl('mm_led_shuffle', 'player.led.on', 30, 58)}
                            ${mmEl('mm_led_repeat', 'player.togglies.repeat.on', 66, 82)}
                            ${mmEl('mm_led_shuffle', 'player.togglies.shuffle.on', 62, 60)}

                            ${mmEl('mm_status_stop', 'player.status.stop', 287, 81)}
                            ${mmEl('mm_status_play', 'player.status.play', 287, 81)}
                            ${mmEl('mm_status_pause', 'player.status.pause', 287, 81)}

                            ${mmEl('mm_text mm_ticker wa_marquee', null, 117, 103, { w: 144, h: 21, font: ticker_font, align: 'center' })}
                            ${mmEl('', 'player.title.overlay', 87, 98)}

                            ${mmEl('mm_text mm_time', null, 248, 52, { w: 74, h: 25, font: 'player.time.font', wa: 'time' })}
                            ${mmEl('mm_text wa_kbps', null, 268, 71, { w: 20, h: 21, font: 'player.ticker.font4' })}
                            ${mmEl('mm_text wa_khz', null, 268, 79, { w: 20, h: 21, font: 'player.ticker.font4' })}
                            ${mmEl('wa_mono', 'player.mono', 291, 32)}
                            ${mmEl('wa_stereo', 'player.stereo', 251, 32)}
                            ${mmEl('mm_display2', 'player.display2', 53, 9)}

                            ${mmEl('mm_volknob', 'player.anim.volume', 203, 158, { w: 44, h: 44, frames: 44 })}
                            ${mmEl('mm_volled', 'player.anim.volumeled', 195, 150, { w: 61, h: 70, frames: 70 })}
                            ${mmEl('mm_slider mm_volbar', 'player.anim.volume2', 278, 42, { w: 36, h: 6, frames: 6 })}
                            ${mmEl('mm_knob', 'player.anim.bass', 112, 177, { w: 30, h: 30, frames: 30, wa: 'bass' })}
                            ${mmEl('mm_knobled', 'player.anim.bassled', 107, 172, { w: 40, h: 40, frames: 40 })}
                            ${mmEl('mm_knob', 'player.anim.treble', 127, 148, { w: 23, h: 23, frames: 23, wa: 'treble' })}
                            ${mmEl('mm_knobled', 'player.anim.trebleled', 123, 144, { w: 31, h: 31, frames: 31 })}
                            ${mmSlider('mm_seek', 123, 119, 132, 16, 'player.button.pos', { id: 'aj_player_track_length' })}
                        </div>
                    </div>

                    <div class='mm_shadebar'>
                        ${mmEl('mm_shade_bg', 'playershade.bgt', 0, 0)}
                        ${mmEl('mm_shade_bg', 'playershade.front', 0, 0)}
                        ${mmEl('mm_shade_bg', 'player.textlabel11', 29, 3)}
                        ${mmButton('', 'playershade.button.open', 117, 12, 'eject')}
                        ${mmButton('', 'playershade.button.prev', 153, 5, 'prev')}
                        ${mmButton('', 'playershade.button.next', 234, 5, 'next')}
                        ${mmButton('', 'playershade.button.plb', 664, 6, 'playlist')}
                        ${mmButton('', 'playershade.button.pause', 194, 6, 'pause')}
                        ${mmButton('', 'playershade.button.play', 179, 6, 'play')}
                        ${mmButton('', 'playershade.button.stop', 209, 6, 'stop')}
                        ${mmButton('', 'playershade.button.big', 11, 5, 'shade')}
                        ${mmButton('', 'playershade.button.big2', 773, 4, 'shade')}
                        ${mmButton('', 'playershade.button.minimize', 762, 4, 'shade')}
                        ${mmButton('', 'playershade.button.close', 784, 4, 'close')}
                        ${mmButton('', 'playershade.button.t', 689, 1, 'playlist')}
                        ${mmButton('', 'playershade.button.eq', 698, 1, 'eq')}
                        ${mmButton('mm_s_pl', 'playershade.button.pl', 712, 1, 'playlist', { active: 'playershade.button.pl.active' })}
                        ${mmButton('', 'playershade.button.ct', 726, 1, 'shade_ct')}
                        ${mmButton('', 'playershade.button.cfg', 740, 1, 'menu')}
                        ${mmSlider('', 351, 11, 62, 10, 'playershade.button.volume', { id: 'aj_player_volume' })}
                        ${mmEl('', 'playershade.display1', 252, 4)}
                        ${mmEl('mm_text mm_shade_time', null, 254, 2, { w: 38, h: 21, font: 'player.time.font3', wa: 'time' })}
                        <canvas class='mm_el wa_vis mm_shade_vis' width='37' height='10' style='left:295px;top:7px'></canvas>
                        ${mmEl('', 'playershade.display1.overlay', 252, 4)}
                        ${mmSlider('mm_shade_seek', 251, 0, 85, 7, 'playershade.button.pos1')}
                        ${mmSlider('mm_shade_seek', 251, 16, 85, 6, 'playershade.button.pos2')}
                        ${mmButton('mm_s_toggle', 'player-winshade.toggler.crossfade', 481, 12, 'crossfade')}
                        ${mmButton('mm_s_toggle mm_s_shuffle', 'player-winshade.toggler.shuffle', 421, 12, 'shuffle', { active: 'player-winshade.toggler.shuffle.down' })}
                        ${mmButton('mm_s_toggle mm_s_repeat', 'player-winshade.toggler.repeat', 453, 12, 'repeat', { active: 'player-winshade.toggler.repeat.down' })}
                        ${mmEl('', 'playershade.display2', 516, 4)}
                        ${mmEl('mm_text mm_shade_ticker wa_marquee', null, 519, 1, { w: 136, h: 21, font: 'player.ticker.font3' })}
                        ${mmEl('', 'playershade.display2.overlay', 516, 4)}
                        ${mmEl('', 'playershade.textlabel1', 119, 2)}
                        ${mmEl('', 'playershade.textlabel2', 421, 2)}
                        ${mmEl('', 'playershade.textlabel3', 351, 4)}
                    </div>

                    <div class='wa_pl mm_pl'>
                        ${mmEl('mm_pl_fill', 'studio.list.background', 0, 0, { pos: 'inset:0', tile: 1 })}
                        ${mmEl('', 'studio.green', 0, 0, { pos: 'inset:20px', tile: 1 })}
                        ${mmEl('', 'component.top-stretch', 0, 0, { pos: 'left:127px;right:183px;top:0;height:39px', tile: 1 })}
                        ${mmEl('', 'component.top-stretch-display', 0, 0, { pos: 'left:127px;right:183px;top:0;height:39px', tile: 1 })}
                        ${mmEl('', 'component.bottom-stretch', 0, 0, { pos: 'left:160px;right:150px;bottom:0;height:45px', tile: 1 })}
                        ${mmEl('', 'component.bottom-stretch-display', 0, 0, { pos: 'left:160px;right:150px;bottom:0;height:45px', tile: 1 })}
                        ${['', '-bg', '-display'].map(s => mmEl('', 'component.left-stretch' + s, 0, 0, { pos: 'left:0;top:39px;width:28px;bottom:27px', tile: 1 })).join('')}
                        ${['', '-bg', '-display'].map(s => mmEl('', 'component.right-stretch' + s, 0, 0, { pos: 'right:0;top:39px;width:28px;bottom:27px', tile: 1 })).join('')}
                        ${mmEl('', 'component.top-right', 0, 0, { pos: 'right:0;top:0' })}
                        ${mmEl('', 'player.textlabel11', 190, 4)}
                        ${mmEl('', 'component.top-right-bg', 0, 0, { pos: 'right:0;top:0' })}
                        ${mmEl('', 'component.top-right-display', 0, 0, { pos: 'right:0;top:0' })}
                        ${mmEl('', 'component.top-left', 0, 0)}
                        ${mmButton('', 'component.player.sys', 18, 4, 'menu')}
                        ${mmEl('', 'component.top-left-bg', 0, 0)}
                        ${mmEl('', 'component.top-left-display', 0, 0)}
                        ${mmEl('', 'component.left-bottom', 0, 0, { pos: 'left:0;bottom:0' })}
                        ${mmEl('', 'component.label1', 0, 0, { pos: 'left:18px;bottom:3px' })}
                        ${mmEl('', 'component.left-bottom-bg', 0, 0, { pos: 'left:0;bottom:0' })}
                        ${mmEl('', 'component.right-bottom', 0, 0, { pos: 'right:0;bottom:0' })}
                        ${mmEl('', 'component.right-bottom-bg', 0, 0, { pos: 'right:0;bottom:0' })}
                        ${mmEl('', 'component.left-bottom-display', 0, 0, { pos: 'left:0;bottom:0' })}
                        ${mmEl('', 'component.right-bottom-display', 0, 0, { pos: 'right:0;bottom:0' })}
                        ${mmEl('wa_pl_grip', 'component.resize', 0, 0, { pos: 'right:3px;bottom:4px', wa: 'grip' })}
                        ${mmEl('mm_pl_title', 'component.titlebg', 119, 0, { w: 68, h: 21, tile: 1, html: `<div class='mm_text mm_pl_title_text' data-font='player.ticker.font7'></div>` })}
                        ${mmButton('', 'component.button.close', 348, 5, 'playlist')}
                        ${mmEl('mm_pl_switcher', null, 35, 0, { w: 294, h: 30 })}
                        ${mmEl('', 'pl.button.bg', 331, 2)}
                        ${mmButton('', 'pl.button.small', 331, 2, 'pl_shade')}
                        ${mmButton('', 'component.player.prev', 0, 0, 'prev', { pos: 'left:20px;bottom:23px' })}
                        ${mmButton('', 'component.player.next', 0, 0, 'next', { pos: 'left:91px;bottom:12px' })}
                        ${mmButton('', 'component.player.pause', 0, 0, 'pause', { pos: 'left:73px;bottom:12px' })}
                        ${mmButton('', 'component.player.play', 0, 0, 'play', { pos: 'left:36px;bottom:14px' })}
                        ${mmButton('', 'component.player.stop', 0, 0, 'stop', { pos: 'left:56px;bottom:13px' })}
                        ${mmSlider('mm_pl_seek', 0, 0, 70, 8, 'component.player.pos', { pos: 'left:32px;bottom:0' })}
                        ${mmEl('mm_text wa_pl_total', null, 0, 0, { pos: 'left:126px;bottom:5px', w: 225, h: 17, font: 'studio.component.statusbar' })}

                        <div class='mm_pl_content'>
                            <div class='wa_pl_list'></div>
                            <div class='mm_pl_scroll'>
                                ${mmButton('mm_pl_up', 'wasabi.scrollbar.vertical.left', 0, 0, 'scroll_up', { down: 'wasabi.scrollbar.vertical.left.pressed' })}
                                ${mmEl('mm_pl_track', 'wasabi.scrollbar.vertical.background', 0, 17, { pos: 'left:0;top:17px;bottom:17px;width:13px', tile: 1 })}
                                ${mmEl('mm_pl_thumb', 'studio.scrollbar.vertical.button', 0, 17)}
                                ${mmButton('mm_pl_down', 'wasabi.scrollbar.vertical.right', 0, 0, 'scroll_down', { pos: 'left:0;bottom:0', down: 'wasabi.scrollbar.vertical.right.pressed' })}
                            </div>
                        </div>
                    </div>

                    <div class='mm_plshade'>
                        ${mmEl('', 'pl.left', 0, 0)}
                        ${mmEl('', 'pl.right', 324, 0)}
                        ${mmEl('', 'pl.left.front', 0, 0)}
                        ${mmEl('', 'pl.middle', 26, 0, { w: 298, tile: 1 })}
                        ${mmEl('', 'pl.right.front', 324, 0)}
                        ${mmEl('', 'pl.left.display', 14, 4)}
                        ${mmEl('', 'pl.middle.display', 39, 4, { w: 271, tile: 1 })}
                        ${mmEl('', 'pl.right.display', 290, 4)}
                        ${mmEl('mm_text mm_plshade_title', null, 16, 2, { w: 292, h: 21, font: 'player.ticker.font3' })}
                        ${mmEl('mm_text mm_plshade_length', null, 305, 2, { w: 30, h: 21, font: 'player.ticker.font3', align: 'right' })}
                        ${mmEl('', 'pl.left.display.ov', 14, 4)}
                        ${mmEl('', 'pl.middle.display.ov', 39, 4, { w: 271, tile: 1 })}
                        ${mmEl('', 'pl.right.display.ov', 290, 4)}
                        ${mmButton('', 'playershade.button.big2', 354, 4, 'pl_shade')}
                        ${mmButton('', 'playershade.button.close', 365, 4, 'playlist')}
                    </div>
                </div>
            </div>
        `
    }

    bind(node) {
        super.bind(node)
        node.toggleClass('wa_vis_off', false)
        node.addClass(`mm_vis_${this.vis_mode}`)

        node.find('.mm_switcher').on('dblclick', () => this.action('shade'))
        node.find('.mm_shade_bg').on('dblclick', () => this.action('shade'))
        node.find('.mm_pl_switcher').on('dblclick', () => this.action('pl_shade'))
        node.find('.mm_plshade').on('dblclick', (e) => {
            if(!e.target.closest('[data-wa]')) {
                this.action('pl_shade')
            }
        })
        this.bindPlaylistDrag(node)
        this.bindKnob(node.find('.mm_volknob').nodes[0])
        this.bindSlider(node.find('.mm_volbar').nodes[0], (ps) => {
            this.audio.volume = ps
            this.flash(`VOLUME: ${Math.round(ps * 100)}%`)
        })
        node.find('.mm_shade_seek, .mm_pl_seek').each(el => this.bindSlider(el, (ps) => {
            const track = window.player.currentTrack
            if(track) {
                this.audio.currentTime = ps * track.length
            }
        }))
        this.bindPlaylistScroll(node)

        // шрифты и картинки берутся после загрузки skin.json и применения цветовой темы
        mmLoadConfig().then(async (config) => {
            this.config = config
            this.styleSprites(node.nodes[0])
            this.renderThemeList(node)
            await this.applyTheme(this.theme)
            this.placePlaylist()
            node.removeClass('mm_loading')
        }).catch(e => console.error('MMD3 skin failed to load', e))
    }

    destroy() {
        super.destroy()
        this.urls.forEach(url => URL.revokeObjectURL(url))
        this.urls = []
        this.drawer = null
        this.drawer_busy = false
    }

    sprite(id) {
        return this.config.bitmaps[id.toLowerCase()]
    }

    styleSprites(root) {
        const background = (id, el) => {
            const [pair, x, y] = this.sprite(id)
            if(el && el.dataset.tile) {
                return `var(--mm-tile-${this.tileIndex(id)}) repeat`
            }

            return `var(--mm-${pair}) -${x}px -${y}px no-repeat`
        }

        root.querySelectorAll('[data-sprite]').forEach(el => {
            const [, , , w, h] = this.sprite(el.dataset.sprite)
            el.style.setProperty('--bg', background(el.dataset.sprite, el))
            if(!el.style.width && !el.style.inset && !(el.style.left && el.style.right)) {
                el.style.width = `${w}px`
            }
            if(!el.style.height && !el.style.inset && !(el.style.top && el.style.bottom)) {
                el.style.height = `${h}px`
            }
            if(el.dataset.down && this.sprite(el.dataset.down)) {
                el.style.setProperty('--bg-down', background(el.dataset.down))
            }
            if(el.dataset.active) {
                el.style.setProperty('--bg-active', background(el.dataset.active))
            }
        })

        root.querySelectorAll('[data-thumb]').forEach(el => {
            const [, , , w, h] = this.sprite(el.dataset.thumb)
            el.style.setProperty('--thumb', background(el.dataset.thumb))
            el.style.setProperty('--thumb-down', background(this.sprite(el.dataset.thumbDown) ? el.dataset.thumbDown : el.dataset.thumb))
            el.style.setProperty('--thumb-w', `${w}px`)
            el.style.setProperty('--thumb-h', `${h}px`)
        })
    }

    tileIndex(id) {
        this.tiles = this.tiles ?? []
        if(!this.tiles.includes(id)) {
            this.tiles.push(id)
        }

        return this.tiles.indexOf(id)
    }

    loadImage(file) {
        this.images[file] = this.images[file] ?? new Promise((resolve, reject) => {
            const img = new Image()
            img.onload = () => resolve(img)
            img.onerror = reject
            img.src = MM_PATH + file
        })

        return this.images[file]
    }

    usedPairs(root) {
        const pairs = new Set()
        root.querySelectorAll('[data-sprite], [data-down], [data-active], [data-thumb], [data-thumb-down]').forEach(el => {
            for(const id of [el.dataset.sprite, el.dataset.down, el.dataset.active, el.dataset.thumb, el.dataset.thumbDown]) {
                if(id && this.sprite(id)) {
                    pairs.add(this.sprite(id)[0])
                }
            }
        })
        root.querySelectorAll('[data-font]').forEach(el => pairs.add(this.config.fonts[el.dataset.font][0]))
        pairs.add(this.sprite('player.vis.ani1')[0])
        for(let i = 2; i <= 6; i++) {
            pairs.add(this.sprite(`player.vis.ani${i}`)[0])
        }

        return [...pairs]
    }

    async applyTheme(index) {
        const node = this.node
        const root = node.nodes[0]
        if(!root || !this.config) {
            return
        }

        const [name, values] = this.config.themes[index] ?? this.config.themes[0]
        const params = {}
        this.config.groups.forEach((group, i) => params[group] = values[i])
        this.theme_params = params

        const vars = []
        const urls = []
        const to_url = (canvas) => new Promise(resolve => canvas.toBlob(blob => {
            const url = URL.createObjectURL(blob)
            urls.push(url)
            resolve(url)
        }))

        await Promise.all(this.usedPairs(root).map(async (pair) => {
            const [file, group] = this.config.pairs[pair]
            const img = await this.loadImage(file)
            const canvas = document.createElement('canvas')
            canvas.width = img.naturalWidth
            canvas.height = img.naturalHeight
            const ctx = canvas.getContext('2d')
            ctx.drawImage(img, 0, 0)

            const gamma = params[group]
            if(gamma && gamma.some(v => v)) {
                const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
                mmGamma(data.data, gamma)
                ctx.putImageData(data, 0, 0)
                vars.push(`--mm-${pair}: url('${await to_url(canvas)}')`)
            } else {
                vars.push(`--mm-${pair}: url('${MM_PATH}${file}')`)
            }

            this.canvases[pair] = canvas
        }))

        // повторяющиеся куски вырезаются из своих файлов отдельно
        await Promise.all((this.tiles ?? []).map(async (id, i) => {
            const [pair, x, y, w, h] = this.sprite(id)
            const canvas = document.createElement('canvas')
            canvas.width = w
            canvas.height = h
            canvas.getContext('2d').drawImage(this.canvases[pair], x, y, w, h, 0, 0, w, h)
            vars.push(`--mm-tile-${i}: url('${await to_url(canvas)}')`)
        }))

        node.find('#aj_player').attr('style', vars.join(';'))
        this.urls.forEach(url => URL.revokeObjectURL(url))
        this.urls = urls
        this.theme_name = name

        this.vis_palette = this.makePalette()
        this.volume(this.audio.volume)
        this.setVisAnim()
        this.renderThemeList(node)
        this.marquee_text = null
        this.time_text = null
        this.update()
        this.setText(node.find('.mm_thinger_text'), 'PLAYLIST')
        this.setText(node.find('.mm_pl_title_text'), 'PLAYLIST EDITOR')
    }

    filterColor(group, [r, g, b]) {
        const data = new Uint8ClampedArray([r, g, b, 255])
        const gamma = this.theme_params?.[group]
        if(gamma && gamma.some(v => v)) {
            mmGamma(data, gamma)
        }

        return `rgb(${data[0]}, ${data[1]}, ${data[2]})`
    }

    makePalette() {
        const color = this.filterColor('display', [255, 255, 255])
        return { bg: 'transparent', dots: 'transparent', bars: [color], peak: color }
    }

    renderThemeList(node) {
        const list = node.find('.mm_ctitems')
        if(!this.config || list.length == 0) {
            return
        }

        const selected = this.theme_selected ?? this.theme
        list.html(this.config.themes.map(([name], i) => `
            <div class='mm_ctitem ${i == selected ? 'mm_selected' : ''} ${i == this.theme ? 'mm_current' : ''}' data-index='${i}'>${escapeHtml(name)}</div>
        `).join(''))
        list.find('.mm_ctitem').on('click', (e) => {
            this.theme_selected = Number(e.target.dataset.index)
            list.find('.mm_selected').removeClass('mm_selected')
            u(e.target).addClass('mm_selected')
        })
        list.find('.mm_ctitem').on('dblclick', (e) => this.switchTheme(Number(e.target.dataset.index)))
    }

    async switchTheme(index) {
        if(index == this.theme) {
            return
        }

        this.setOption('mmd3_theme', index)
        this.theme_selected = index
        await this.applyTheme(index)
        this.flash(this.config.themes[index][0].toUpperCase())
        setTimeout(() => this.flash(null), 1500)
    }

    // ручка громкости: угол от центра, 300 градусов от левого нижнего края до правого
    bindKnob(el) {
        let last = this.audio.volume
        const set = (e) => {
            const rect = el.getBoundingClientRect()
            const dx = e.clientX - (rect.left + rect.width / 2)
            const dy = e.clientY - (rect.top + rect.height / 2)
            let angle = Math.atan2(-dx, dy)
            if(angle < 0) {
                angle += Math.PI * 2
            }

            let volume = (angle - Math.PI / 6) / (Math.PI * 5 / 3)
            if(volume < 0 || volume > 1) {
                volume = last > 0.5 ? 1 : 0
            }

            last = volume
            this.audio.volume = volume
            this.flash(`VOLUME: ${Math.round(volume * 100)}%`)
        }

        el.addEventListener('pointerdown', (e) => {
            e.preventDefault()
            el.setPointerCapture(e.pointerId)
            set(e)
            const up = () => {
                el.removeEventListener('pointermove', set)
                el.removeEventListener('pointerup', up)
                setTimeout(() => this.flash(null), 800)
            }

            el.addEventListener('pointermove', set)
            el.addEventListener('pointerup', up)
        })
    }

    bindSlider(el, change) {
        const set = (e) => {
            const rect = el.getBoundingClientRect()
            change(Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)))
        }

        el.addEventListener('pointerdown', (e) => {
            e.preventDefault()
            el.setPointerCapture(e.pointerId)
            set(e)
            const up = () => {
                el.removeEventListener('pointermove', set)
                el.removeEventListener('pointerup', up)
                if(this.flash_text) {
                    setTimeout(() => this.flash(null), 800)
                }
            }

            el.addEventListener('pointermove', set)
            el.addEventListener('pointerup', up)
        })
    }

    // свёрнутый плейлист прилипает к плееру, пока его не оттащат; оторванный стоит на месте при перетаскивании плеера
    bindPlaylistDrag(node) {
        const el = node.nodes[0]
        const bar = node.find('.mm_plshade').nodes[0]
        const [x, y] = this.option('mmd3_pl_pos', '').split(',').map(Number)
        this.pl_pos = y >= 0 && node.hasClass('wa_pl_shaded') ? [Math.min(x, window.innerWidth - 381), Math.min(y, window.innerHeight - 23)].map(v => Math.max(0, v)) : null
        this.placePlaylist()

        // jquery ui сдвигает плеер уже после события drag
        $(el).on('drag dragstop', () => queueMicrotask(() => this.placePlaylist()))

        bar.addEventListener('pointerdown', (e) => {
            if(e.button != 0 || e.target.closest('[data-wa]')) {
                return
            }

            e.preventDefault()
            bar.setPointerCapture(e.pointerId)
            const rect = bar.getBoundingClientRect()
            const grab_x = e.clientX - rect.left
            const grab_y = e.clientY - rect.top
            let docked = !this.pl_pos
            const move = (ev) => {
                const [dock_x, dock_y] = this.dockPoint()
                const x = Math.max(0, Math.min(ev.clientX - grab_x, window.innerWidth - rect.width))
                const y = Math.max(0, Math.min(ev.clientY - grab_y, window.innerHeight - rect.height))
                docked = Math.abs(x - dock_x) <= 10 && Math.abs(y - dock_y) <= 10
                this.pl_pos = docked ? [dock_x, dock_y] : [x, y]
                this.placePlaylist()
            }
            const up = () => {
                bar.removeEventListener('pointermove', move)
                bar.removeEventListener('pointerup', up)
                if(docked) {
                    this.pl_pos = null
                }

                this.setOption('mmd3_pl_pos', this.pl_pos ? this.pl_pos.map(Math.round).join(',') : '')
                this.placePlaylist()
            }

            bar.addEventListener('pointermove', move)
            bar.addEventListener('pointerup', up)
        })
    }

    dockRight() {
        return this.node.hasClass('wa_shaded') && window.innerWidth >= 800 + 381
    }

    // место стыковки: под обычным плеером, справа от свёрнутого или под ним, если окно узкое
    dockPoint() {
        const el = this.node.nodes[0]
        const left = parseFloat(el.style.left) || 0
        const top = parseFloat(el.style.top) || 0
        if(this.dockRight()) {
            return [left + 800, top]
        }

        return [left, top + (this.node.hasClass('wa_shaded') ? 23 : 216)]
    }

    placePlaylist() {
        const node = this.node
        const el = node.nodes[0]
        const bar = node.find('.mm_plshade').nodes[0]
        if(!el || !bar) {
            return
        }

        const shown = node.hasClass('wa_pl_shaded') && !node.hasClass('wa_pl_hidden')
        node.toggleClass('mm_pl_floating', Boolean(this.pl_pos))
        node.toggleClass('mm_pl_right', shown && !this.pl_pos && this.dockRight())
        bar.style.left = this.pl_pos ? `${this.pl_pos[0] - (parseFloat(el.style.left) || 0)}px` : ''
        bar.style.top = this.pl_pos ? `${this.pl_pos[1] - (parseFloat(el.style.top) || 0)}px` : ''
    }

    layout() {
        this.placePlaylist()
        this.clampPosition()
        this.placePlaylist()
    }

    bindPlaylistScroll(node) {
        const list = node.find('.wa_pl_list').nodes[0]
        const thumb = node.find('.mm_pl_thumb').nodes[0]
        const tracks = () => list.querySelector('#aj_player_tracks')
        const room = () => list.offsetHeight - 34 - 41

        this.syncScroll = () => {
            const el = tracks()
            if(!el) {
                return
            }

            const max = el.scrollHeight - el.clientHeight
            thumb.style.top = `${17 + (max > 0 ? Math.round(el.scrollTop / max * room()) : 0)}px`
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
            const start_top = thumb.offsetTop - 17
            const move = (ev) => {
                const top = Math.min(room(), Math.max(0, start_top + ev.clientY - start_y))
                el.scrollTop = room() > 0 ? top / room() * (el.scrollHeight - el.clientHeight) : 0
            }
            const up = () => {
                thumb.removeEventListener('pointermove', move)
                thumb.removeEventListener('pointerup', up)
            }

            thumb.addEventListener('pointermove', move)
            thumb.addEventListener('pointerup', up)
        })
    }

    async action(name, target, e) {
        const node = this.node
        switch(name) {
            case 'drawer_eq':
            case 'drawer_vis':
            case 'drawer_ct':
                this.toggleDrawer(name.slice(7))
                break
            case 'vis_mode':
                node.removeClass(`mm_vis_${this.vis_mode}`)
                this.setOption('mmd3_vis', target.dataset.mode)
                node.addClass(`mm_vis_${this.vis_mode}`)
                this.setVisAnim()
                break
            case 'ct_switch':
                if(this.theme_selected !== undefined) {
                    await this.switchTheme(this.theme_selected)
                }
                break
            case 'shade_ct':
                await this.action('shade')
                if(this.drawer != 'ct') {
                    this.toggleDrawer('ct')
                }
                break
            case 'scroll_up':
            case 'scroll_down':
                node.find('#aj_player_tracks').nodes[0]?.scrollBy(0, name == 'scroll_up' ? -15 : 15)
                break
            // эквалайзер, кроссфейд, бас и верха требуют WebAudio, а он не работает с зашифрованным звуком
            case 'eq':
            case 'crossfade':
            case 'bass':
            case 'treble':
                this.flash(`${name == 'eq' ? 'EQ' : name.toUpperCase()} NOT AVAILABLE`)
                setTimeout(() => this.flash(null), 1500)
                break
            case 'shuffle':
                node.addClass('mm_shuffle_on')
                setTimeout(() => node.removeClass('mm_shuffle_on'), 1500)
                await super.action(name, target, e)
                break
            // свёрнутый заново плейлист снова пристыкован
            case 'pl_shade':
                this.pl_pos = null
                this.setOption('mmd3_pl_pos', '')
                await super.action(name, target, e)
                this.layout()
                break
            case 'shade':
            case 'playlist':
                await super.action(name, target, e)
                this.layout()
                break
            default:
                await super.action(name, target, e)
        }
    }

    clampPosition() {
        const el = this.node.nodes[0]
        if(!el) {
            return
        }

        const rect = el.getBoundingClientRect()
        el.style.left = `${Math.max(0, Math.min(rect.left, window.innerWidth - rect.width))}px`
        el.style.top = `${Math.max(0, Math.min(rect.top, window.innerHeight - rect.height))}px`
    }

    // шторки выезжают из-под окна вправо, перед открытием другой текущая закрывается
    toggleDrawer(name) {
        if(this.drawer_busy) {
            return
        }

        const node = this.node
        const open = (which) => {
            const el = node.find(`.mm_drawer_${which}`).nodes[0]
            node.addClass(`mm_drawer_${which}_shown mm_drawers_open`)
            this.drawer_busy = true
            // принудительный reflow, иначе переход из display:none не анимируется
            el.offsetWidth
            el.classList.add('mm_open')
            this.afterTransition(el, () => {
                this.drawer_busy = false
                this.drawer = which
                node.addClass(`mm_drawer_${which}_ready`)
            })
            this.flash('OPEN DRAWER')
            setTimeout(() => this.flash(null), 1000)
        }

        if(!this.drawer) {
            open(name)
            return
        }

        const current = this.drawer
        const el = node.find(`.mm_drawer_${current}`).nodes[0]
        node.removeClass(`mm_drawer_${current}_ready`)
        el.classList.remove('mm_open')
        this.drawer_busy = true
        this.flash('CLOSE DRAWER')
        this.afterTransition(el, () => {
            this.drawer_busy = false
            this.drawer = null
            node.removeClass(`mm_drawer_${current}_shown mm_drawers_open`)
            if(current != name) {
                open(name)
            } else {
                setTimeout(() => this.flash(null), 600)
            }
        })
    }

    afterTransition(el, callback) {
        let done = false
        const finish = () => {
            if(!done) {
                done = true
                callback()
            }
        }

        el.addEventListener('transitionend', finish, { once: true })
        setTimeout(finish, 800)
    }

    setVisAnim() {
        const mode = this.vis_mode
        const el = this.node.find('.mm_visani').nodes[0]
        if(!el || !this.config || mode > 6) {
            return
        }

        const [pair, x, y] = this.sprite(`player.vis.ani${mode}`)
        el.style.setProperty('--bg', `var(--mm-${pair}) -${x}px -${y}px no-repeat`)
        el.dataset.sprite = `player.vis.ani${mode}`
        this.setFrame(el, this.vu_frame)
    }

    setFrame(el, frame) {
        if(!el || !this.config) {
            return
        }

        const [, x, y] = this.sprite(el.dataset.sprite)
        el.style.backgroundPosition = `-${x}px -${y + frame * Number(el.dataset.frames)}px`
    }

    update() {
        super.update()
        const node = this.node
        if(node.length == 0) {
            return
        }

        node.toggleClass('mm_repeat_on', this.audio.loop)
        this.syncScroll?.()

        const track = window.player.currentTrack
        this.setText(node.find('.mm_plshade_title'), track ? `${track.performer} - ${track.name}` : '')
        this.setText(node.find('.mm_plshade_length'), track ? waLength(track.length) : '')
    }

    renderStatus(node, status) {}

    renderTime(node, text) {
        this.setText(node.find('.mm_time'), text.trimStart())
        this.setText(node.find('.mm_shade_time'), text.trimStart())

        const track = window.player.currentTrack
        const ps = track && this.status != 'stop' ? Math.min(1, this.audio.currentTime / track.length) : 0
        node.find('.mm_shade_seek .slider, .mm_pl_seek .slider').attr('style', `left:${(ps * 100).toFixed(3)}%`)
    }

    volume(volume) {
        const node = this.node
        if(!this.config) {
            return
        }

        // в анимациях ручек 23 кадра
        const frame = Math.round(volume * 22)
        node.find('.mm_volknob, .mm_volled, .mm_volbar').each(el => this.setFrame(el, frame))
        node.find('.mm_knob, .mm_knobled').each(el => this.setFrame(el, 11))
    }

    // буквы других алфавитов в шрифтах скина не нарисованы, такие строки пишутся обычным шрифтом
    drawText(font_id, text, colon_width = 0) {
        const [pair, cw, ch, hspacing] = this.config.fonts[font_id]
        const font = this.canvases[pair]
        const chars = [...text]
        const canvas = document.createElement('canvas')
        canvas.className = 'wa_text'
        canvas.height = ch

        const fallback = chars.some(char => /\p{L}/u.test(char) && !WA_FONT[char.normalize('NFD')[0].toUpperCase()])
        if(fallback || !font) {
            const ctx = canvas.getContext('2d')
            const size = Math.min(11, Math.max(8, Math.round(ch * 0.55)))
            ctx.font = `bold ${size}px Arial, Helvetica, sans-serif`
            canvas.width = Math.max(1, Math.ceil(ctx.measureText(text).width) + 2)
            ctx.font = `bold ${size}px Arial, Helvetica, sans-serif`
            ctx.fillStyle = this.filterColor(this.config.pairs[pair][1], [255, 255, 255])
            ctx.textBaseline = 'middle'
            ctx.fillText(text, 1, ch / 2)
            return canvas
        }

        const advance = (char) => char == ':' && colon_width ? colon_width : cw + hspacing
        canvas.width = Math.max(1, chars.reduce((sum, char) => sum + advance(char), 0))
        const ctx = canvas.getContext('2d')
        let x = 0
        chars.forEach(char => {
            const [col, row] = WA_FONT[char.normalize('NFD')[0].toUpperCase()] ?? WA_FONT[' ']
            if(char == ':' && colon_width) {
                ctx.drawImage(font, col * cw + (cw - colon_width) / 2, row * ch, colon_width, ch, x, 0, colon_width, ch)
            } else {
                ctx.drawImage(font, col * cw, row * ch, cw, ch, x, 0, cw, ch)
            }
            x += advance(char)
        })

        return canvas
    }

    setText(el, text) {
        el.each(node => {
            node.querySelectorAll('canvas').forEach(c => c.remove())
            if(!text || !this.config || !node.dataset.font) {
                return
            }

            const colon = node.dataset.font == 'player.time.font' ? 4 : 0
            node.append(this.drawText(node.dataset.font, text, colon))
        })
    }

    renderMarquee(text, scroll) {
        const node = this.node
        this.marquee_measured = node.find('.mm_ticker').nodes[0]?.clientWidth > 0 || node.hasClass('wa_shaded')
        if(!this.config) {
            return
        }

        node.find('.mm_ticker, .mm_shade_ticker').each(box => {
            box.querySelectorAll('canvas').forEach(c => c.remove())
            box.classList.remove('mm_scrolling')
            if(!text) {
                return
            }

            const canvas = this.drawText(box.dataset.font, text)
            if(!scroll || canvas.width <= box.clientWidth) {
                box.append(canvas)
                return
            }

            // строка повторена дважды и сдвигается ровно на одну копию
            const loop = this.drawText(box.dataset.font, `${text}  ***  `)
            const double = document.createElement('canvas')
            double.width = loop.width * 2
            double.height = loop.height
            double.getContext('2d').drawImage(loop, 0, 0)
            double.getContext('2d').drawImage(loop, loop.width, 0)
            double.className = 'wa_text wa_scroll'
            double.style.animationDuration = `${(loop.width / 30).toFixed(2)}s`
            box.classList.add('mm_scrolling')
            box.append(double)
        })
    }

    startVis() {
        const node = this.node
        const canvases = [node.find('.mm_vis').nodes[0], node.find('.mm_shade_vis').nodes[0]]
        const bars = new Array(16).fill(0)
        const phases = bars.map(() => Math.random() * Math.PI * 2)
        const speeds = bars.map(() => 2 + Math.random() * 5)
        let last = 0
        let vu = 0

        const draw = (now) => {
            if(!canvases[0].isConnected) {
                this.vis_frame = null
                return
            }

            this.vis_frame = requestAnimationFrame(draw)
            if(now - last < 33) {
                return
            }

            last = now
            const playing = !this.audio.paused && !node.hasClass('hidden')
            if(!playing && vu == 0 && bars.every(bar => bar == 0)) {
                return
            }

            // звук зашифрован (clearkey), поэтому уровень и спектр имитируются
            const t = now / 1000
            const beat = Math.pow(Math.max(0, Math.sin(t * Math.PI * 2.1)), 8)
            bars.forEach((bar, i) => {
                let level = 0
                if(playing) {
                    const wave = 0.5 + 0.5 * Math.sin(t * speeds[i] + phases[i])
                    level = (1 - i / 20) * (0.3 + 0.55 * wave) * (0.75 + Math.random() * 0.25) + beat * (i < 5 ? 0.35 : 0.1)
                }

                bars[i] = Math.max(Math.min(1, level), bar - 0.06)
            })

            const level = bars.reduce((sum, bar) => sum + bar, 0) / bars.length
            const target = Math.round(Math.min(1, level * 1.6) * 29)
            vu = target >= vu ? target : Math.max(0, vu - 3)
            this.vu_frame = vu
            if(this.vis_mode <= 6) {
                this.setFrame(node.find('.mm_visani').nodes[0], vu)
            }

            const color = this.vis_palette.peak
            canvases.forEach((canvas, n) => {
                const ctx = canvas.getContext('2d')
                const w = canvas.width, h = canvas.height
                ctx.clearRect(0, 0, w, h)
                const mode = n == 1 ? 8 : this.vis_mode
                if(!playing && mode != 8) {
                    return
                }

                ctx.fillStyle = color
                ctx.strokeStyle = color
                if(mode == 8) {
                    const step = w / bars.length
                    bars.forEach((bar, i) => {
                        const bh = Math.round(bar * h)
                        ctx.fillRect(Math.round(i * step), h - bh, Math.max(1, Math.round(step) - 1), bh)
                    })
                } else if(mode == 9) {
                    ctx.beginPath()
                    for(let x = 0; x < w; x++) {
                        const y = h / 2 + Math.sin(x / 6 + t * 9) * level * h * 0.35 + Math.sin(x / 2.3 + t * 17) * level * h * 0.12
                        x == 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
                    }
                    ctx.stroke()
                }
            })
        }

        cancelAnimationFrame(this.vis_frame)
        this.vis_frame = requestAnimationFrame(draw)
    }
}

window.ajaxPlayerSkins = window.ajaxPlayerSkins ?? {}
window.ajaxPlayerSkins.mmd3 = new WinampModernSkin('mmd3')
