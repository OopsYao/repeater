require("dotenv").config({ path: ".env.local" });
const { Wechaty } = require("wechaty");
const qt = require("qrcode-terminal");
const http = require("http");
const { informTelegram } = require("./telegram");
const { informMail } = require("./alimail");
const { Observable }  = require('rxjs')

const say = async (bot, query, message) => {
  const contact = await bot.Contact.find(query);
  if (!contact) throw "Contact doesnot exist";
  await contact.say(message);
};

const sayRoom = async (bot, name, message) => {
  const room = await bot.Room.find({ topic: name });
  if (!room) throw "Group doesnot exist";
  await room.say(message);
};

const initBot = () => {
  const bot = new Wechaty({ name: "fb" }); // Global Instance
  const [loginStream, logoutStream, scanStream, messageStream] = ['login', 'logout', 'scan', 'message'].map(
    event => new Observable(
      subscriber => bot.on(event, (...params) => subscriber.next(params))
    )
  )
  return { bot, loginStream, logoutStream, scanStream, messageStream };
};

(async () => {
  const { bot, scanStream, messageStream } = initBot();
  scanStream.subscribe(async ([qrcode, status]) => {
    if (status === 2) {
      // scan事件会被重复触发，status为5
      try {
        qt.generate(qrcode);
        await Promise.all([informTelegram, informMail].map((f) => f(qrcode)));
      } catch (e) {
        console.error(e);
      }
    }
  })
  messageStream.subscribe(async ([m]) => {
    const masterAlias = "xy";
    const master = await bot.Contact.find({ alias: masterAlias });
    // TODO: Debouncing and forward messages together
    // Do not repeat yourself.
    // According the doc, forward messages do not trigger `message` event, but it seems to be wrong.
    if (m.self()) return;
    if (masterAlias === (await m.from().alias())) return; // Do not repeat the master
    if (await m.room().has(master)) return; // Including the common room with the master
    await m.forward(master);
  })

  const requestListener = async (req, resp) => {
    try {
      if (req.method === "POST") {
        const bodyStr = await getBody(req);
        const { contact, room, message } = JSON.parse(bodyStr);
        if (contact) {
          await say(bot, contact, message);
        } else if (room) {
          await sayRoom(bot, room, message);
        } else {
          throw "No contact or group specified";
        }
        resp.writeHead(201);
      } else {
        throw 405;
      }
      resp.end();
    } catch (e) {
      if (e === 405) {
        resp.writeHead(405);
        resp.end("Only the POST method is allowed");
      } else {
        resp.writeHead(400);
        resp.end(String(e));
      }
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

  bot.start();
  const server = http.createServer(requestListener);
  server.listen(process.env.PORT || 8080);
})();
