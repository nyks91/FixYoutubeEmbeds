# FixYoutubeEmbeds

A BetterDiscord plugin by [naykis](https://github.com/nyks91) that helps blocked YouTube embeds play inside Discord.

## Features

- Automatic retry when YouTube reports an eligible embedding restriction.
- Original Discord embeds for videos that play normally.
- A small indicator when the alternate player is used.

## Installation

1. Download [`FixYoutubeEmbeds.plugin.js`](https://github.com/nyks91/FixYoutubeEmbeds/releases/latest/download/FixYoutubeEmbeds.plugin.js).
2. In Discord, open **Settings → BetterDiscord → Plugins → Open Plugins Folder**.
3. Place the file in that folder and enable **FixYoutubeEmbeds**.

## How it works

The plugin checks YouTube for an explicit embedding restriction. For eligible videos, it retries playback through a small page hosted on GitHub Pages. The page opens the official YouTube player, and YouTube delivers the video.

The embedding page is maintained on the [pages branch](https://github.com/nyks91/FixYoutubeEmbeds/tree/pages). Its address is `https://nyks91.github.io/FixYoutubeEmbeds/embed/`. GitHub may redirect it to the account's custom domain, currently `naykis.me`. The plugin resolves that redirect and opens the destination over HTTPS. If the custom domain is removed from GitHub Pages, the same GitHub address can serve the page directly.

The page receives the video ID and supported playback parameters. It contains no account system or analytics of its own and does not download, store, or proxy videos. GitHub Pages and YouTube receive normal web requests under their respective policies.

Some videos may still be unavailable. Age, region, and account restrictions are outside the scope of the plugin.

## Updates

The plugin checks GitHub Releases on startup and asks before installing an update. You can also check manually or view release notes in the plugin settings.

Independent project; not affiliated with YouTube, Google, Discord or BetterDiscord.

Inspired by [Vencord's FixYoutubeEmbeds](https://vencord.dev/plugins/FixYoutubeEmbeds/).
