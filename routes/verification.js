const express = require('express');
const axios = require("axios")
const router = express.Router();

const bans = process.env.BANNED_SERVERS?.split(',') || [];
const allowedC = process.env.ALLOWED_COUNTRYCODES?.split(',') || [];

const getip = (req) => {
  let ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress;
  if (ip && ip.includes('::ffff:')) {
    ip = ip.split('::ffff:')[1];
  }
  if (ip && ip.includes(',')) {
    ip = ip.split(',')[0];
  }

  return ip;
}

const ip2location = async (ip) => {
    data = await axios.get(`http://ip-api.com/json/${ip}`)
    if(allowedC.includes(data.data.countryCode)) return true
    return false
}

const sendWebhook = (m, ip, bans) => {
  axios.post(process.env.WEBHOOK, {
  "content": `--> ${m.id}`,
  "embeds": [
    {
      "id": 393394220,
      "title": "🔗 New Account Linked",
      "description": "",
      "color": 4829755,
      "thumbnail": {
        "url": `https://cdn.discordapp.com/avatars/${m.id}/${m.avatar}.png?size=2048`
      },
      "fields": [
        {
          "id": 920564728,
          "name": "Information",
          "value": `**🔍 Username:** ${m.username}\n**🔍 ID:** ${m.id}\n**🔍 IP Address:** ${ip}`
        },
        {
          "id": 946611680,
          "name": "Banned Servers Found",
          "value": `${bans}`
        }
      ]
    }
  ],
  "components": [],
  "actions": {},
  "flags": 0
}).catch(console.error);
}

const verifyBannedServers = async (token) => {
  try {
    const { data } = await axios.get("https://discord.com/api/v10/users/@me/guilds", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return data
      .filter(g => bans.includes(g.id))
      .map(g => `${g.name} (${g.id})`)
      .join(", ") || "[NATURAL]: Not Found.";
  } catch(e) {
    console.log(e)
    return "[ERROR]: Not Found.";
  }
};

const verifyMember = async (serverID, memberID, roleID) => {
try{
    x = await axios.put(`https://discord.com/api/v9/guilds/${serverID}/members/${memberID}/roles/${roleID}`,{}, { headers: { "authorization": `Bot ${process.env.TOKEN}`}})
    console.log(x.data)
    return x.data
} catch (e){
    console.log(e)
}
}

router.get('/ping', async (req, res) => {
    return res.status(200).render('verification', { status: '🏓 Pong'});
})

router.get('/verification', async (req, res) => {
  const code = req.query.code;
  const ip = getip(req)
  allowed = await ip2location(ip)
  
  if (!code) {
    return res.status(400).render('verification', { status: 'Código de verificação não encontrado! tente começar novamente pelo Discord.'});
  }
  if(!allowed){
    return res.status(400).render('verification', { status: 'Uso de Proxy, VPN ou Rede Tor foi detectado.\nAcha que isso foi um engano? entre em contato com @validation. no Discord.'});
  }

  try {
    const params = new URLSearchParams();
    params.append("client_id", process.env.CLIENT_ID);
    params.append("client_secret", process.env.CLIENT_SECRET);
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("redirect_uri", process.env.REDIRECT_URL);
    params.append("scope", "identify guilds");

    const response = await axios.post("https://discord.com/api/oauth2/token", params, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });

    const access_token = response.data.access_token;

    const userInfo = await axios.get("https://discord.com/api/users/@me", {
      headers: {
        Authorization: `Bearer ${access_token}`
      }
    });
    
    const bans = await verifyBannedServers(access_token)
    const user = userInfo.data;
    await sendWebhook(user, ip, bans)
    await verifyMember(process.env.SERVER_ID, user.id, process.env.ROLE_ID)
    return res.status(200).render('verification', { status: 'Verificado com Sucesso! você pode fechar essa pagina.' });
  } catch (err) {
    console.log(err)
    res.status(500).render('verification', { status: 'Oops! um erro ocorreu verificando com o Discord, tente novamente!' });
  }
});

module.exports = router;