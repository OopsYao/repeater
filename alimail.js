const QRCode = require("qrcode");
const { RPCClient } = require("@alicloud/pop-core");
const client = new RPCClient({
  accessKeyId: process.env.ALI_AC_KEY,
  secretAccessKey: process.env.ALI_AC_SEC,
  endpoint: "https://dm.aliyuncs.com",
  apiVersion: "2015-11-23",
});

const sendMeMail = async ({ bodyAsHTML, subject, bodyAsText }) => {
  return await client.request(
    "SingleSendMail",
    {
      AccountName: process.env.MAIL_FROM,
      AddressType: 1,
      ReplyToAddress: true,
      ToAddress: process.env.MAIL_TO,
      HtmlBody: bodyAsHTML,
      Subject: subject,
      TextBody: bodyAsText,
    },
    { method: "POST" }
  );
};

const qrAsMail = async (url) => {
  const uri = await QRCode.toDataURL(url);
  return `
    <div>
      <p>需要登录啦，<a href="https://wechaty.js.org/qrcode/${encodeURIComponent(
        url
      )}">Web二维码</a></p>
      <p><pre>${url}</pre></p>
      <img style="margin: 0 auto;display: block;" src="${uri}" alt="QR code: ${url}" />
    </div>`;
};
const informMail = async (url) => {
  return await sendMeMail({
    bodyAsHTML: await qrAsMail(url),
    subject: "WXBot登录二维码",
  });
};

module.exports = {
  informMail,
};
