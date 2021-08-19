require("dotenv").config({ path: ".env.local" });
const { Wechaty } = require("wechaty");
const http = require("http");
const rx = require('rxjs')
const { WebSocketServer } = require('ws')

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
  const [login$, logout$, scan$, message$] = ['login', 'logout', 'scan', 'message'].map(
    event => new rx.Observable(
      subscriber => bot.on(event, (...params) => subscriber.next(params))
    )
  )
  const loginout$ = rx.merge(
    login$.pipe(rx.map(() => 'login')),
    logout$.pipe(rx.map(() => 'logout')),
  )
 
  const asBehavior = (obs, init) => {
    const mark = Symbol()
    const be = new rx.BehaviorSubject(init === undefined ? mark : init)
    obs.subscribe(be)
    return be.pipe(rx.filter(v => v !== mark)) // Skip the pointless mark
  }
  return {
    bot,
    scanStream: asBehavior(scan$.pipe(
      rx.map(([qrcode]) => qrcode),
      rx.distinctUntilChanged(),
    )),
    messageStream: message$,
    loginoutStream: asBehavior(loginout$, 'logout'),
  };
};

(async () => {
  const { bot, scanStream, messageStream, loginoutStream } = initBot();
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
  const wss = new WebSocketServer({ server })
  wss.on('connection', (ws, { url }) => {
    switch (url) {
      case '/qr':
        scanStream.subscribe((qrcode) => {
          ws.send(JSON.stringify(qrcode))
        })
        break
      case '/status':
        loginoutStream.subscribe((state) => {
          ws.send(JSON.stringify(state))
        })
        break
    }
  })
})();
