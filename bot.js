const { Wechaty } = require("wechaty");
const qt = require("qrcode-terminal");

const masterAlias = "xy";

const login = (bot) =>
  new Promise((resolve) => {
    bot.on("login", resolve);
  });

const say = async (bot, query, message) => {
  const contact = await bot.Contact.find(query);
  await contact.say(message);
};

const sayRoom = async (bot, name, message) => {
  const room = await bot.Room.find({ topic: name });
  await room.say(message);
};

(async () => {
  const bot = Wechaty.instance() // Global Instance
    .on("scan", (qrcode, status) => qt.generate(qrcode));
  await bot.start();
  await login(bot);

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
})();
