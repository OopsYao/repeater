const fs = require("fs");
const QRCode = require("qrcode");
const temp = require("temp");
const TG = require("telegram-bot-api");

// Telegram proxy (for dev)
const proxyEnabled = process.env.HTTP_PROXY;
const [, host, port] = (process.env.HTTP_PROXY || "").split(":");
const http_proxy = {
  host: (host || "").substr(2),
  port,
};
const proxyOptions = proxyEnabled ? { http_proxy } : {};

const tg = new TG({
  token: process.env.TELEGRAM_TOKEN,
  ...proxyOptions,
});
const qrImg = async (data) => {
  const file = temp.path({ suffix: ".png" });
  await QRCode.toFile(file, [{ data }], { width: 500 });
  return fs.createReadStream(file);
};

const informTelegram = async (url) => {
  const resp = await tg.sendPhoto({
    chat_id: process.env.TELEGRAM_MASTER_CHAT,
    photo: await qrImg(url),
    caption: `需要登录啦，[Web二维码](https://wechaty.js.org/qrcode/${encodeURIComponent(
      url
    )})\n\`${url}\``,
    parse_mode: "MarkdownV2",
  });
};
module.exports = {
  informTelegram,
};
