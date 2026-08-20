# Satria Bot

A WhatsApp bot built with [Baileys](https://github.com/WhiskeySockets/Baileys), logging in via **pairing code by default** (no QR scan needed).

## Commands

| Command | Description |
|---|---|
| `.s` | Reply to an image or short video to turn it into a sticker |
| `.tovid` | Reply to an animated sticker to convert it back to an MP4 video |
| `.vv` | Reply to a view-once photo/video to reveal and resend it |
| `.roblox <username or id>` | Looks up a Roblox user: avatar, bio, account age, ban status, friends/followers, and presence |

## Setup

```bash
git clone <your-repo-url>
cd satria-bot
npm install
cp .env.example .env
```

Edit `.env`:
- `OWNER_NUMBER` — your WhatsApp number (country code, no `+`), used to auto-request the pairing code. Leave blank to be prompted at runtime instead.
- `PREFIX` — command prefix, default `.`
- `USE_QR` — set `true` to fall back to QR-code login instead of pairing code.

Requires **ffmpeg** to be available; `ffmpeg-static` bundles a binary automatically so no system install is needed.

## Run

```bash
npm start
```

On first run (pairing-code mode) you'll see:

```
Pairing code: ABCD-1234
```

In WhatsApp: **Settings → Linked Devices → Link a Device → Link with phone number instead**, then enter the code.

Session credentials are saved to `./session/` — delete that folder to force a fresh login.

## Roblox presence note

Real-time Online/InGame/Studio presence requires an authenticated Roblox session cookie (`.ROBLOSECURITY`). Set it as an env var:

```
ROBLOSECURITY=your_cookie_here
```

**Use a throwaway Roblox account for this** — never your main account's cookie. Without it, presence shows as "Unknown (no auth cookie set)" but all other user info still works.

## Known limitations

- No public API exists for Roblox "Star" creator status.
- No "Hat Sign" stat available via public API.
- Rolimons RAP/Value lookups aren't wired in yet — only core user info, avatar, and social counts.

## License

MIT — github dev
