# Projekti arhitektuur

See dokument selgitab, kust alustada koodi lugemist ja milline moodul mille
eest vastutab.

## Üldpilt

Mäng kasutab server-authoritative arhitektuuri:

1. brauser saadab serverile kasutaja tegevuse;
2. server kontrollib, kas tegevus on lubatud;
3. server uuendab mängu olekut ja füüsikat;
4. server saadab `GAME_STATE_UPDATE` kõigile brauseritele;
5. brauser kuvab serverilt saadud oleku.

Klient ei otsusta ise, kas mängija põrkas kokku, võitis vooru või sai
power-up'i. Need otsused teeb server, et kõik mängijad näeksid sama tulemust.

## Failipuu

```text
.
├── server.js                  # Käivitab Expressi, Socket.IO ja mängutsükli
├── src/
│   ├── gameEngine.js          # gameState, füüsika, skoor ja vooru põhireeglid
│   ├── collision.js           # Raja kokkupõrke kontroll
│   ├── powerUp.js             # Power-up'ide loomine ja mõju
│   ├── gameEvents.js          # Domeenisündmused, mis ei sõltu Socket.IO-st
│   └── server/
│       ├── socketHandlers.js  # Ühendab ühe socket'i handlerite gruppidega
│       ├── lobbyHandlers.js   # Liitumine, lahkumine ja lobby seaded
│       ├── matchHandlers.js   # Start, paus, jätkamine ja vooruvahetus
│       ├── playerHandlers.js  # Reaalaja sisend ja disconnect
│       ├── playerRegistry.js  # Mängija loomine ja hosti valimine
│       └── gameSession.js     # Countdown, taimerid ja vooru elutsükkel
├── public/
│   ├── index.html             # Lehe semantiline struktuur
│   ├── css/
│   │   ├── base.css           # Värvid, reset ja üldised abiklassid
│   │   ├── lobby.css          # Lobby paigutus, bränd, paneelid ja liitumisvorm
│   │   ├── components.css     # Nupud, klahvid, mängijate read ja rattaskinid
│   │   ├── lobby-controls.css # Hosti seaded, helinupud ja ühenduse staatus
│   │   ├── game.css           # Scoreboard ja 800 × 800 mänguareen
│   │   ├── overlay.css        # Täisekraani overlay ja võidutähistus
│   │   ├── countdown.css      # Countdown ning ratta illustratsioon
│   │   ├── results.css        # Paus, tulemused, power-up ja menüünupud
│   │   ├── animations.css     # Kõik @keyframes definitsioonid
│   │   └── responsive.css     # Ligipääsetavus ja väikese ekraani reeglid
│   └── js/
│       ├── client.js          # Brauserirakenduse käivituspunkt
│       ├── input.js           # WASD ja nooleklahvide sisend
│       ├── renderer.js        # requestAnimationFrame koordinaator
│       ├── ui.js              # UI moodulite avalik API
│       ├── audio.js           # Helimoodulite avalik API
│       ├── client/            # Kliendi olek, nupud ja socket'i vastused
│       ├── render/            # Sõidukite, radade ja esemete kuvamine
│       ├── ui/                # Lobby, overlay, tulemused ja nimekirjad
│       └── audio/             # Seaded, taasesitus ja mängu helisündmused
└── scripts/check-syntax.js    # Kontrollib kõigi JS-failide süntaksit
```

## Serveri töövoog

### `server.js`

See on composition root ehk koht, kus rakenduse osad kokku ühendatakse.
Fail:

- loob HTTP ja Socket.IO serveri;
- pakub `public/` kausta brauserile;
- ühendab Socket.IO kliendid handleritega;
- käivitab 30 Hz autoritatiivse füüsikatsükli.

Siia ei peaks lisama üksiku nupu või mängureegli detailset loogikat.

### Socket.IO handlerid

Handler on funktsioon, mis reageerib kliendi saadetud sündmusele.

- `lobbyHandlers.js`: tegevused enne matši;
- `matchHandlers.js`: matši ja vooru elutsükkel;
- `playerHandlers.js`: tihe reaalajas sisend ning ühenduse katkemine.

Handleri tavapärane järjekord on:

1. leia `socket.id` järgi mängija;
2. kontrolli õigusi ja mängu olekut;
3. muuda serveri `gameState` objekti;
4. saada tulemus või viga kliendile.

### `gameSession.js`

See moodul omab intervalle ja ajast sõltuvat vooru olekut. Countdown'i või
taimeri loogika kuulub siia, sest socket'i handler ei peaks ise intervalle
haldamata jätma.

### `gameEngine.js`

See on mängu domeeni keskpunkt. `gameState` on serveri tõeallikas.
`updateGamePhysics()`:

1. uuendab iga elus mängija koordinaate;
2. pikendab aktiivset rada;
3. rakendab wrap'i;
4. kontrollib power-up'e;
5. kontrollib kokkupõrkeid.

## Kliendi töövoog

### `client.js`

Kliendi käivituspunkt teeb ainult neli asja:

1. loob Socket.IO ühenduse;
2. registreerib DOM-nuppude handlerid;
3. registreerib serverisündmuste handlerid;
4. käivitab sisendi ja renderdustsükli.

### `client/`

- `state.js` hoiab kahte järjestikust serverioleku koopiat renderdamiseks;
- `controls.js` muudab nupuvajutused Socket.IO käskudeks;
- `socketEvents.js` muudab serveri vastused UI ja renderduse olekuks.

### `render/`

Renderer ei muuda mängureegleid. Ta teisendab serveri arvud DOM-elementideks:

- `playerView.js`: rattad ja ajutiste efektide välimus;
- `trailView.js`: rajasegmentide ristkülikud;
- `powerUpView.js`: areenile ilmunud esemed;
- `wrapIndicatorView.js`: vastasserva ilmumise hoiatus;
- `renderConfig.js`: ainult renderdamise ühised mõõdud.

### `ui/`

UI moodulid vastutavad staatiliste ekraanide ja tekstilise info eest:

- `lobbyView.js`: lobby tegevused ja matši seaded;
- `screenView.js`: ekraanid, countdown, paus ja süsteemiteated;
- `resultView.js`: vooru ning matši tulemused;
- `playerListView.js`: lobby nimekiri ja scoreboard;
- `audioView.js`: heli sisse-välja nupud.

`ui.js` ekspordib nende avalikud funktsioonid ühest kohast. Seda tüüpi faili
nimetatakse barrel'iks või facade'iks.

### `audio/`

- `audioConfig.js`: failiteed ja konstandid;
- `audioSettings.js`: `localStorage` ning seadete kuulajad;
- `audioPlayer.js`: Howler objektid ja tegelik taasesitus;
- `gameAudio.js`: otsustab olekumuutuste põhjal, millal heli mängida.

### `css/`

`index.html` laeb CSS-moodulid eraldi `<link>` elementidega vajalikus
cascade'i järjekorras. Eraldi lingid võimaldavad brauseril failid paralleelselt
laadida ega tekita `@import` ahelat.

- `base.css`: globaalsed CSS muutujad, `box-sizing`, lehe taust ja
  `.hidden`;
- `lobby.css`: avalehe paigutus, bränd, paneelid ja liitumisvorm;
- `components.css`: korduvkasutatavad nupud, klahvivihjed, mängijate read ja
  rattavärvide pildid;
- `lobby-controls.css`: hosti matšiseaded, helilülitid ja lobby staatus;
- `game.css`: aktiivse mängu paigutus, scoreboard ja areen;
- `overlay.css`: kõigi täisekraani overlay'de ühine taust;
- `countdown.css`: countdown'i tekst ja detailne light-cycle illustratsioon;
- `results.css`: pausimenüü, tulemused, rankings, power-up'id ja teated;
- `animations.css`: nimelised animatsioonid, mida teised failid kasutavad;
- `responsive.css`: reduced-motion ja väikese ekraani parandused.

Linkide järjekord `index.html` failis on oluline. Hilisem fail võib varasemat
üldreeglit täpsustada. Uut kujundust lisades vali faili ekraani või komponendi
vastutuse järgi ning lisa uus link ainult siis, kui lood päriselt uue
vastutusala.

## Kuhu uus kood panna?

Kasuta neid küsimusi:

- Kas see muudab mängureeglit või `gameState` olekut? `src/`.
- Kas see reageerib Socket.IO käsule? `src/server/*Handlers.js`.
- Kas see haldab vooru taimerit? `src/server/gameSession.js`.
- Kas see saadab brauserist käsu serverile? `public/js/client/controls.js`.
- Kas see töötleb serveri vastust? `public/js/client/socketEvents.js`.
- Kas see liigutab või loob areeni DOM-elementi? `public/js/render/`.
- Kas see muudab lobby't, overlay'd või teksti? `public/js/ui/`.
- Kas see puudutab heli? `public/js/audio/`.
- Kas see muudab ainult välimust? Sobiv `public/css/*.css` moodul.

## Kommentaaride põhimõte

Kommentaar peab selgitama põhjust või töövoogu, mida koodist kohe ei näe.

Hea kommentaar:

```js
// Browsers allow background music only after the first interaction.
```

Väheväärtuslik kommentaar:

```js
// Set game status to playing.
gameState.gameStatus = 'PLAYING';
```

Funktsiooni nimi ja väikesed abifunktsioonid peaksid võimalusel ise ütlema,
mida kood teeb. Pikem JSDoc sobib mooduli avalikule funktsioonile, mille
vastutust või sisendit pole allkirjast kohe näha.

## Kontrollimine

Pärast muudatust käivita:

```bash
npm run check
npm start
```

`npm run check` leiab süntaksivead. See ei asenda mängu käsitsi testimist ega
tulevasi automaatteste.
