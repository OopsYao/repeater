const { Wechaty } = require("wechaty");
const qt = require("qrcode-terminal");
const http = require("http");

const say = async (bot, query, message) => {
  const contact = await bot.Contact.find(query);
  await contact.say(message);
};

const sayRoom = async (bot, name, message) => {
  const room = await bot.Room.find({ topic: name });
  await room.say(message);
};

const botStart = async () => {
  const login = (bot) =>
    new Promise((resolve) => {
      bot.on("login", resolve);
    });

  const bot = Wechaty.instance() // Global Instance
    .on("scan", (qrcode, status) => qt.generate(qrcode));
  await bot.start();
  await login(bot);
  return bot;
};

(async () => {
  const bot = await botStart();
  const masterAlias = "xy";
  const master = await bot.Contact.find({ alias: masterAlias });
  bot.on("message", async (m) => {
    // TODO: Debouncing and forward messages together
    // Do not repeat yourself.
    // According the doc, forward messages do not trigger `message` event, but it seems to be wrong.
    if (m.self()) return;
    if (masterAlias === (await m.from().alias())) return; // Do not repeat the master
    if (await m.room().has(master)) return; // Including the common room with the master
    await m.forward(master);
  });

  const requestListener = async (req, resp) => {
    if (req.method === "POST") {
      const bodyStr = await getBody(req);
      const { contact, room, message } = JSON.parse(bodyStr);
      if (contact) {
        await say(bot, contact, message);
      } else if (room) {
        await sayRoom(bot, room, message);
      }
      resp.writeHead(201);
      resp.end();
    }
  };
  const getBody = (req) =>
    new Promise((resolve) => {
      let body = "";
      req.on("data", (d) => {
        body += d;
      });
      req.on("end", () => {
        resolve(body);
      });
    });

  const server = http.createServer(requestListener);
  server.listen(8080);
})();
