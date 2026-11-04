/**
 * @name FixYoutubeEmbeds
 * @version 1.0.4
 * @description Fixes YouTube embeds blocked from playing in Discord.
 * @author naykis
 * @authorLink https://github.com/nyks91
 * @source https://github.com/nyks91/FixYoutubeEmbeds
 */
/* Inspired by FixYoutubeEmbeds by coolelectronics and Vencord contributors.
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
"use strict";
const NAME = "FixYoutubeEmbeds";
const VERSION = "1.0.4";
const CHANGELOG = [
    {version: VERSION, title: "v1.0.4 - Restricted YouTube embeds", type: "added", items: [
        "Retry YouTube videos blocked from playing inside Discord.",
        "Show a small indicator when the alternate embed is used."
    ]}
];
const REPOSITORY = "nyks91/FixYoutubeEmbeds";
const PLUGIN_FILE = NAME + ".plugin.js";

function newerVersion(candidate, current = VERSION) {
    const parse = value => /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value) ? value.split(".").map(Number) : null;
    const a = parse(candidate), b = parse(current);
    if (!a || !b || !a.every(Number.isSafeInteger)) return false;
    for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i];
    return false;
}

function releaseAsset(release) {
    if (release?.draft || release?.prerelease || !/^v\d+\.\d+\.\d+$/.test(release?.tag_name || "")) return null;
    const version = release.tag_name.slice(1);
    if (!newerVersion(version)) return null;
    const asset = release.assets?.find(item => item.name === PLUGIN_FILE);
    const expected = `https://github.com/${REPOSITORY}/releases/download/${release.tag_name}/${PLUGIN_FILE}`;
    if (asset?.browser_download_url !== expected || !Number.isInteger(asset.size) || asset.size < 100 || asset.size > 1000000) throw new Error("Invalid update asset.");
    return {version, url: expected};
}

function validateUpdate(source, version) {
    if (typeof source !== "string") throw new Error("Invalid update file.");
    const header = (source.match(/^\s*\/\*\*([\s\S]*?)\*\//)?.[1] || "").replace(/\r\n/g,"\n");
    if (source.length > 1000000 || !header.includes(`@name ${NAME}\n`) ||
        !newerVersion(version) || !new RegExp(`@version ${version.replaceAll(".", "\\.")}\\s`).test(header) ||
        !source.includes(`const VERSION = "${version}";`) || !source.includes("module.exports = class FixYoutubeEmbeds")) throw new Error("Invalid update file.");
    return source;
}

const WRAPPER = 'https://nyks91.github.io/FixYoutubeEmbeds/embed/';
const HOSTS = new Set(['www.youtube.com','youtube.com','www.youtube-nocookie.com','youtube-nocookie.com']);
const PARAMETERS = ['start','end','autoplay','mute','controls','loop','playlist','playsinline','cc_load_policy','cc_lang_pref','hl','rel'];
function embedUrl(value) {
    try {
        const url = new URL(value);
        return url.protocol === 'https:' && !url.username && !url.password && !url.port && HOSTS.has(url.hostname) &&
            /^\/embed\/[A-Za-z0-9_-]{11}\/?$/.test(url.pathname) ? url : null;
    } catch { return null; }
}
function hasEmbeddingRestriction(html, video) {
    if (typeof html !== 'string' || html.length > 2_000_000) return false;
    if (html.match(/"video_id"\s*:\s*"([A-Za-z0-9_-]{11})"/)?.[1] !== video) return false;
    const match = html.match(/"embedded_player_response"\s*:\s*("(?:[^"\\]|\\.)*")/);
    if (!match) return false;
    try {
        const response = JSON.parse(JSON.parse(match[1]));
        const status = response.previewPlayabilityStatus;
        if (status?.status !== 'UNPLAYABLE') return false;
        const text = JSON.stringify({reason:status.reason,errorScreen:status.errorScreen});
        // Generic unavailable, private, age, country, bot and network errors
        // are not sufficient. Require an explicit embedding restriction.
        return /blocked (?:it )?from display on this (?:website|web site)|(?:owner|uploader).{0,100}disabled.{0,50}(?:embedding|playback on other websites)|playback on other websites.{0,60}disabled|bu web sitesi veya uygulamada gösterilmesini engellediği/i.test(text);
    } catch { return false; }
}
module.exports = class FixYoutubeEmbeds {
    t(text) {
        const lang = document.documentElement?.lang || "en";
        const translations = {
        "No published release yet.": "Henüz yayımlanmış bir sürüm yok.",
        "You are up to date.": "En güncel sürümü kullanıyorsun.",
        "An update is available": "Yeni sürüm mevcut",
        "{name} has an update available. Would you like to update to version {version}?": "{name} için yeni sürüm mevcut. {version} sürümüne güncellemek ister misin?",
        "Install update": "Güncelle",
        "Later": "Daha sonra",
        "Update check failed. Try again later.": "Güncelleme kontrol edilemedi. Daha sonra tekrar dene.",
        "Update installed. BetterDiscord will reload the plugin.": "Güncelleme yüklendi. BetterDiscord eklentiyi yeniden yükleyecek.",
        "Update could not be installed.": "Güncelleme yüklenemedi.",
        "v1.0.4 - Restricted YouTube embeds": "v1.0.4 - Engellenen YouTube videoları",
        "Retry YouTube videos blocked from playing inside Discord.": "Discord içinde oynatılması engellenen YouTube videolarını yeniden oynatma denemesi.",
        "Show a small indicator when the alternate embed is used.": "Alternatif oynatıcı kullanılırken küçük bir gösterge."
};
        return /^tr(?:[-_]|$)/i.test(lang) ? translations[text] || text : text;
    }

    getSettingsPanel() {
        const plugin = this, React = BdApi.React, h = React.createElement;
        const lang = document.documentElement?.lang || "en";
        const turkish = /^tr(?:-|$)/i.test(lang);
        const t = (english, turkishText) => turkish ? turkishText : english;
        function Settings() {
            const [checkUpdates, setCheckUpdates] = React.useState(() => BdApi.Data.load(NAME, "checkUpdates") !== false);
            const change = value => {
                BdApi.Data.save(NAME, "checkUpdates", value);
                setCheckUpdates(value);
            };
            const row = {padding: "18px 0", borderBottom: "1px solid rgba(255,255,255,.08)"};
            const title = {fontSize: 14, fontWeight: 600, marginBottom: 8, color: "#f2f3f5"};
            const updates=h("div",{style:row},
                h("div",{style:{...title,display:"flex",alignItems:"center",justifyContent:"space-between"}},t("Updates", "Güncellemeler"),
                    h("span",{style:{fontSize:12,fontWeight:400,color:"#b5bac1"}},"v"+VERSION)),
                h("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}},
                    h("span",{style:{fontSize:13}},t("Check updates on startup", "Başlangıçta güncellemeleri kontrol et")),
                    h("button",{type:"button",role:"switch","aria-checked":checkUpdates,"aria-label":t("Check updates on startup", "Başlangıçta güncellemeleri kontrol et"),onClick:()=>change(!checkUpdates),
                        style:{position:"relative",width:38,height:22,padding:0,border:0,borderRadius:20,cursor:"pointer",background:checkUpdates ? "#5865f2" : "#555760"}},
                        h("span",{style:{position:"absolute",top:3,left:3,width:16,height:16,borderRadius:"50%",background:"#fff",transform:checkUpdates ? "translateX(16px)" : "none"}}))),
                h("p",{style:{fontSize:12,lineHeight:1.5,margin:"8px 0 12px"}},t("Check GitHub for new versions. Installation always asks for confirmation.", "Yeni sürümler GitHub üzerinden kontrol edilir. Kurulumdan önce onay istenir.")),
                h("div",{style:{display:"flex",gap:8,flexWrap:"wrap"}},
                    ...[[t("Check for updates", "Güncellemeleri kontrol et"),()=>plugin.checkForUpdates(true)],[t("View changes", "Değişiklikleri göster"),()=>plugin.showChangelog()]].map(([label,onClick])=>
                        h("button",{key:label,type:"button",onClick,style:{padding:"8px 12px",border:0,borderRadius:5,background:"#404249",color:"#fff",font:"inherit",fontSize:12,cursor:"pointer"}},label))));
            return h("div", {className: "fye-settings", style: {padding: "0 4px 8px", fontFamily: "var(--font-primary,sans-serif)", color: "#b5bac1"}},
                h("style", null, ".fye-settings button:focus-visible{outline:2px solid #a5adff;outline-offset:3px}"),
                updates);
        }
        return h(Settings);
    }

    showChangelog() {
        BdApi.UI.showChangelogModal({
            title: NAME, subtitle: "v" + VERSION,
            changes: CHANGELOG.filter(section => !newerVersion(section.version, VERSION)).map(section => ({...section, title: this.t(section.title), items: section.items.map(item => this.t(item))}))
        });
    }

    async updateFetch(url) {
        const controller=new AbortController();
        this.requests ||= new Set();this.requests.add(controller);
        const timer=setTimeout(()=>controller.abort(),15000);
        try {
            const response=await BdApi.Net.fetch(url,{signal:controller.signal,headers:{"Accept":"application/vnd.github+json","User-Agent":`${NAME}/${VERSION}`}});
            if(response.status===404)return null;
            if(!response.ok)throw new Error(`Update HTTP ${response.status}`);
            const text=await response.text();
            if(text.length>1000000)throw new Error("Update response too large.");
            return text;
        } finally {clearTimeout(timer);this.requests.delete(controller);}
    }

    async checkForUpdates(manual=false) {
        if(this.checkingUpdate)return;
        this.checkingUpdate=true;const generation=this.generation;
        try {
            const body=await this.updateFetch(`https://api.github.com/repos/${REPOSITORY}/releases/latest`);
            if(!this.active || generation!==this.generation)return;
            if(body===null){if(manual)BdApi.UI.showToast(this.t("No published release yet."),{type:"info"});return;}
            const update=releaseAsset(JSON.parse(body));
            if(!update){if(manual)BdApi.UI.showToast(this.t("You are up to date."),{type:"success"});return;}
            if(!manual && this.offeredVersion===update.version)return;
            this.offeredVersion=update.version;
            BdApi.UI.showConfirmationModal(this.t("An update is available"),
                this.t("{name} has an update available. Would you like to update to version {version}?").replace("{name}",NAME).replace("{version}",update.version),
                {confirmText:this.t("Install update"),cancelText:this.t("Later"),onConfirm:()=>this.installUpdate(update,generation)});
        } catch(error) {
            if(this.active && generation===this.generation && manual)BdApi.UI.showToast(this.t("Update check failed. Try again later."),{type:"error"});
        } finally {this.checkingUpdate=false;}
    }

    async installUpdate(update,generation=this.generation) {
        if(!this.active || this.installingUpdate || generation!==this.generation)return;
        this.installingUpdate=true;
        try {
            if(update.url!==`https://github.com/${REPOSITORY}/releases/download/v${update.version}/${PLUGIN_FILE}` || !newerVersion(update.version))throw new Error("Invalid update URL.");
            const source=await this.updateFetch(update.url);
            if(!this.active || generation!==this.generation)return;
            validateUpdate(source,update.version);
            const fs=require("fs"),path=require("path");
            const target=path.join(BdApi.Plugins.folder,PLUGIN_FILE);
            // Only replace this installed plugin after validating the download.
            if(!fs.existsSync(target))throw new Error("Installed plugin file not found.");
            const temporary=target+".update";
            fs.writeFileSync(temporary,source,"utf8");
            try {fs.renameSync(temporary,target);}
            finally {if(fs.existsSync(temporary))fs.unlinkSync(temporary);}
            BdApi.UI.showToast(this.t("Update installed. BetterDiscord will reload the plugin."),{type:"success"});
        } catch(error) {
            if(this.active)BdApi.UI.showToast(this.t("Update could not be installed."),{type:"error"});
        } finally {this.installingUpdate=false;}
    }

    start() {
        if (this.active) return;
        this.active = true;
        this.wrapperAddress = null;
        this.generation = (this.generation || 0) + 1;
        if (BdApi.Net?.fetch && BdApi.Data?.load(NAME, "checkUpdates") !== false) void this.checkForUpdates();
        this.entries = new Map(); this.cache = new Map(); this.queue = [];
        this.controllers = new Set(); this.workers = 0;
        this.message = event => this.onMessage(event);
        window.addEventListener('message', this.message);
        this.observer = new MutationObserver(mutations => {
            const iframe = node => node.nodeType === 1 && (node.tagName === 'IFRAME' || !!node.querySelector?.('iframe'));
            if (!mutations.some(m => m.type === 'attributes' && m.target.tagName === 'IFRAME' || [...m.addedNodes,...m.removedNodes].some(iframe))) return;
            if (!this.scanTimer) this.scanTimer = setTimeout(() => {
                this.scanTimer = null; if (this.active) this.scan();
            }, 40);
        });
        this.observer.observe(document.body || document.documentElement, {childList:true,subtree:true,attributes:true,attributeFilter:['src']});
        this.startIndicator();
        this.scan();
    }
    stop() {
        this.stopIndicator();
        this.active = false; this.observer?.disconnect();
        for (const request of this.requests || []) request.abort();
        window.removeEventListener('message', this.message);
        clearTimeout(this.scanTimer); this.scanTimer = null;
        for (const controller of this.controllers || []) controller.abort();
        for (const task of this.queue || []) task.resolve(false);
        this.queue = [];
        this.workers = 0;
        for (const entry of this.entries?.values() || []) {
            entry.disposed = true;
            entry.frame.removeEventListener('load',entry.load);
            if (entry.fallback && entry.frame.isConnected && entry.frame.getAttribute('src') === entry.expected) entry.frame.setAttribute('src',entry.original);
        }
        this.entries?.clear(); this.cache?.clear();
    }
    scan() {
        for (const [frame,entry] of this.entries) {
            if (!frame.isConnected || frame.getAttribute('src') !== entry.expected) {
                entry.disposed = true; frame.removeEventListener('load',entry.load); this.entries.delete(frame);
            }
        }
        for (const frame of document.querySelectorAll('iframe[src]')) {
            if (!frame.isConnected || this.entries.has(frame)) continue;
            const original = frame.getAttribute('src'), url = embedUrl(original);
            if (!url) continue;
            let loaded = false;
            try {loaded = performance.getEntriesByName(url.href).some(r => r.initiatorType === 'iframe' && r.duration > 0);} catch {}
            const entry = {frame,original,expected:original,url,video:url.pathname.split('/')[2],disposed:false,fallback:false,playing:false,loaded,restricted:false};
            entry.load = () => {
                if (entry.disposed) return;
                if (entry.fallback) {this.introIndicator(entry.frame);return;}
                entry.loaded = true;
                if (entry.restricted) this.fallback(entry);
            };
            frame.addEventListener('load',entry.load);
            this.entries.set(frame,entry);
            const session = this.entries;
            this.check(entry.video).then(blocked => {
                if (blocked && this.entries === session) {entry.restricted = true; this.fallback(entry);}
            }).catch(() => {});
        }
        this.updateIndicator();
    }
    check(video) {
        const cached = this.cache.get(video);
        if (cached && cached.expires > Date.now()) return cached.promise;
        const promise = new Promise(resolve => this.queue.push({video,resolve}));
        this.cache.delete(video); this.cache.set(video,{promise,expires:Date.now()+300_000});
        if (this.cache.size > 200) this.cache.delete(this.cache.keys().next().value);
        this.pump(); return promise;
    }
    pump() {
        const queue = this.queue;
        while (this.active && this.workers < 3 && queue.length) {
            const task = queue.shift(); this.workers++;
            this.inspect(task.video).then(task.resolve,() => task.resolve(false)).finally(() => {
                if (this.queue !== queue) return;
                this.workers--; this.pump();
            });
        }
    }
    async inspect(video) {
        const controller = new AbortController(), controllers = this.controllers;
        controllers.add(controller);
        const timer = setTimeout(() => controller.abort(),8000);
        try {
            // Read YouTube's response as data. Never execute downloaded HTML/JS,
            // send Discord credentials, or change a healthy player's URL.
            const response = await BdApi.Net.fetch(`https://www.youtube.com/embed/${video}?hl=en`, {
                method:'GET',signal:controller.signal,
                headers:{Referer:'https://discord.com/','User-Agent':'Mozilla/5.0'}
            });
            if (!response.ok || controller.signal.aborted) return false;
            return hasEmbeddingRestriction(await response.text(),video);
        } catch { return false; }
        finally {clearTimeout(timer); controllers.delete(controller);}
    }
    onMessage(event) {
        if (!this.active) return;
        let data;
        try {
            if (typeof event.data !== 'string' || event.data.length > 100_000) return;
            data = JSON.parse(event.data);
        } catch {return;}
        if (!data || typeof data !== 'object' || data.channel && data.channel !== 'widget') return;
        const entry = [...this.entries.values()].find(e => !e.disposed && !e.fallback && e.url.origin === event.origin &&
            e.frame.contentWindow === event.source && e.frame.isConnected && e.frame.getAttribute('src') === e.expected);
        if (!entry) return;
        if ((data.event === 'infoDelivery' && data.info?.playerState === 1) || (data.event === 'onStateChange' && data.info === 1)) entry.playing = true;
        if (data.event === 'onError' && [101,150].includes(Number(data.info))) {entry.loaded = true; this.fallback(entry);}
    }
    // A discreet monochrome source icon in the far-right inset.
    startIndicator() {
        this.indicatorBadges = new Map();
        this.indicatorIntroTimers = new Map();
        this.indicatorIdleTimers = new Map();
        this.indicatorLayer = document.createElement('div');
        this.indicatorLayer.dataset.fyeIndicator = 'true';
        const style=document.createElement('style');
        style.textContent='.fye-route-indicator{position:absolute;box-sizing:border-box;max-width:calc(100vw - 32px);height:20px;display:flex;align-items:center;justify-content:flex-end;padding:3px;gap:0;color:#fff;background:transparent;border:1px solid transparent;border-radius:5px;opacity:.55;pointer-events:auto;outline:none;transition:opacity 220ms ease,background 220ms ease,border-color 220ms ease}.fye-route-indicator:hover,.fye-route-indicator:focus-visible,.fye-route-indicator.fye-intro{opacity:.86;background:rgba(22,22,28,.82);border-color:#ffffff1c}.fye-route-indicator svg{flex:0 0 14px;width:14px;height:14px;display:block;filter:drop-shadow(0 1px 2px #0009)}.fye-route-label{display:block;max-width:0;min-width:0;opacity:0;overflow:hidden;white-space:nowrap;font:500 11px/14px system-ui,sans-serif;transform:translateX(3px);transition:max-width 260ms cubic-bezier(.22,1,.36,1),opacity 160ms ease,padding 260ms cubic-bezier(.22,1,.36,1),transform 260ms cubic-bezier(.22,1,.36,1);padding:0}.fye-route-indicator:hover .fye-route-label,.fye-route-indicator:focus-visible .fye-route-label,.fye-route-indicator.fye-intro .fye-route-label{max-width:240px;opacity:1;transform:translateX(0);padding:0 7px 0 5px}.fye-route-indicator.fye-idle:not(:hover):not(:focus-visible){opacity:0}@media(prefers-reduced-motion:reduce){.fye-route-indicator,.fye-route-label{transition:none}}';
        this.indicatorLayer.append(style);
        this.indicatorLayer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:1000;';
        document.body.append(this.indicatorLayer);
        this.indicatorSchedule = () => {
            if (!this.indicatorRaf) this.indicatorRaf = requestAnimationFrame(() => {this.indicatorRaf = null; this.updateIndicator();});
        };
        window.addEventListener('scroll',this.indicatorSchedule,true);
        window.addEventListener('resize',this.indicatorSchedule);
        this.indicatorResize = new ResizeObserver(this.indicatorSchedule);
    }
    updateIndicator() {
        if (!this.indicatorLayer || !this.active) return;
        for (const [frame,badge] of this.indicatorBadges) if (!this.entries.has(frame) || !frame.isConnected) {
            this.clearIndicatorActivity(frame,badge);badge.remove();clearTimeout(this.indicatorIntroTimers.get(frame));this.indicatorIntroTimers.delete(frame); this.indicatorBadges.delete(frame); this.indicatorResize.unobserve(frame);
        }
        for (const [frame] of this.entries) {
            let url; try {url = new URL(frame.getAttribute('src'));} catch {continue;}
            const wrapped = ['https://nyks91.github.io','https://naykis.me'].includes(url.origin) && url.pathname === '/FixYoutubeEmbeds/embed/';
            let badge = this.indicatorBadges.get(frame);
            if (!wrapped) {
                if (badge) {badge.remove();clearTimeout(this.indicatorIntroTimers.get(frame));this.indicatorIntroTimers.delete(frame);this.indicatorBadges.delete(frame);this.indicatorResize.unobserve(frame);}
                continue;
            }
            if (!badge) {
                badge = document.createElement('span');
                badge.className='fye-route-indicator';badge.tabIndex=0;badge.setAttribute('role','img');
                const tr=/^tr(?:-|_|$)/i.test(document.documentElement.lang||'');
                const label=tr?'Alternatif oynatıcı kullanılıyor':'Alternative player in use';
                badge.setAttribute('aria-label',label);
                badge.innerHTML='<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10.5 5H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="m7.5 8 4.5 3-4.5 3V8ZM16 .8l1 2.3 2.3 1-2.3 1-1 2.3-1-2.3-2.3-1 2.3-1 1-2.3Z" fill="currentColor"/></svg>';
                const text=document.createElement('span');text.className='fye-route-label';text.textContent=label;badge.prepend(text);
                this.indicatorBadges.set(frame,badge);this.indicatorLayer.append(badge);this.indicatorResize.observe(frame);
                badge._wake = () => this.wakeIndicator(frame);
                frame.addEventListener('pointerenter',badge._wake);
                badge.addEventListener('pointerenter',badge._wake);
                badge.addEventListener('focus',badge._wake);
                this.wakeIndicator(frame);
                this.introIndicator(frame);
            }
            const r = frame.getBoundingClientRect();
            let left=Math.max(r.left,0), top=Math.max(r.top,0), right=Math.min(r.right,innerWidth), bottom=Math.min(r.bottom,innerHeight);
            for (let parent=frame.parentElement;parent && right>left && bottom>top;parent=parent.parentElement) {
                const style=getComputedStyle(parent), clip=parent.getBoundingClientRect();
                if (/(auto|scroll|hidden|clip)/.test(style.overflowX)) {left=Math.max(left,clip.left);right=Math.min(right,clip.right);}
                if (/(auto|scroll|hidden|clip)/.test(style.overflowY)) {top=Math.max(top,clip.top);bottom=Math.min(bottom,clip.bottom);}
            }
            const anchor=Math.min(r.right-3,innerWidth-3),y=r.top+3;
            const visible=!document.fullscreenElement && frame.getClientRects().length && right-left>80 && bottom-top>35 && y>=4 && r.top>=top-1 && r.right<=right+1;
            badge.style.display=visible?'flex':'none';
            badge.style.right=(innerWidth-anchor)+'px';badge.style.top=y+'px';badge.style.maxWidth=Math.max(20,right-left-8)+'px';
        }
    }
    clearIndicatorActivity(frame,badge) {
        clearTimeout(this.indicatorIdleTimers?.get(frame));this.indicatorIdleTimers?.delete(frame);
        frame.removeEventListener('pointerenter',badge._wake);
    }
    wakeIndicator(frame) {
        const badge=this.indicatorBadges?.get(frame);
        if (!badge || !this.active) return;
        badge.classList.remove('fye-idle');
        clearTimeout(this.indicatorIdleTimers.get(frame));
        this.indicatorIdleTimers.set(frame,setTimeout(() => {
            if (this.active) badge.classList.add('fye-idle');
            this.indicatorIdleTimers.delete(frame);
        },3200));
    }
    introIndicator(frame) {
        const badge=this.indicatorBadges?.get(frame);
        if (!badge || badge.dataset.introShown) return;
        badge.dataset.introShown = 'true';
        clearTimeout(this.indicatorIntroTimers.get(frame));
        requestAnimationFrame(() => {
            if (!this.active || this.indicatorBadges?.get(frame)!==badge) return;
            clearTimeout(this.indicatorIntroTimers.get(frame));
            badge.classList.add('fye-intro');
            this.indicatorIntroTimers.set(frame,setTimeout(() => {
                badge.classList.remove('fye-intro');this.indicatorIntroTimers.delete(frame);
            },2600));
        });
    }
    stopIndicator() {
        for (const [frame,badge] of this.indicatorBadges || []) this.clearIndicatorActivity(frame,badge);
        for (const timer of this.indicatorIntroTimers?.values() || []) clearTimeout(timer);
        this.indicatorIntroTimers?.clear();
        window.removeEventListener('scroll',this.indicatorSchedule,true);
        window.removeEventListener('resize',this.indicatorSchedule);
        cancelAnimationFrame(this.indicatorRaf);this.indicatorRaf=null;
        this.indicatorResize?.disconnect();this.indicatorLayer?.remove();this.indicatorLayer=null;this.indicatorBadges?.clear();
    }
    async resolveWrapper() {
        if (this.wrapperAddress) return this.wrapperAddress;
        if (this.wrapperRequest) return this.wrapperRequest;
        const controller = new AbortController();
        this.controllers.add(controller);
        const timer = setTimeout(() => controller.abort(), 10000);
        this.wrapperRequest = (async () => {
            let url = new URL(WRAPPER);
            for (let redirects = 0; redirects < 6; redirects++) {
                const response = await BdApi.Net.fetch(url.href, {redirect: "manual", signal: controller.signal});
                if (response.status >= 300 && response.status < 400) {
                    const location = response.headers.get("location");
                    if (!location) throw new Error("Missing player redirect.");
                    url = new URL(location, url);
                    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.port ||
                        !["nyks91.github.io", "naykis.me"].includes(url.hostname)) throw new Error("Unexpected player redirect.");
                    url.protocol = "https:";
                    continue;
                }
                if (!response.ok) throw new Error("Player page unavailable.");
                this.wrapperAddress = url.href;
                return url.href;
            }
            throw new Error("Too many player redirects.");
        })();
        try { return await this.wrapperRequest; }
        finally {
            clearTimeout(timer);
            this.controllers.delete(controller);
            this.wrapperRequest = null;
        }
    }
    async fallback(entry) {
        if (!this.active || entry.disposed || entry.fallback || entry.playing || !entry.loaded || !entry.frame.isConnected || entry.frame.getAttribute('src') !== entry.expected) return;
        if (entry.resolving) return;
        entry.resolving = true;
        let address;
        try { address = await this.resolveWrapper(); }
        catch (error) { console.warn("[FixYoutubeEmbeds] Could not open alternate player.", error); return; }
        finally { entry.resolving = false; }
        if (!this.active || entry.disposed || entry.playing || !entry.frame.isConnected || entry.frame.getAttribute('src') !== entry.expected) return;
        const wrapper = new URL(address); wrapper.searchParams.set('v',entry.video);
        for (const key of PARAMETERS) if (entry.url.searchParams.has(key)) wrapper.searchParams.set(key,entry.url.searchParams.get(key));
        entry.fallback = true; entry.expected = wrapper.href;
        entry.frame.setAttribute('src',entry.expected);
        this.updateIndicator();
    }
};
