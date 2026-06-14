# NPC single-player režiimi teostusplaan

> **Refaktori järel:** serveri Socket.IO loogika asub `src/server/` kaustas,
> kliendi vastutused `public/js/client/`, `public/js/ui/`, `public/js/render/`
> ja `public/js/audio/` kaustades. Täpne failikaart ja andmevoog on failis
> `docs/Architecture.md`. Allolevate etappide juures eelista uut vastutuse
> järgi jaotatud faili, mitte ära lisa loogikat tagasi käivitusfailidesse.

## 1. Eesmärk

Lisada olemasolevale Light Cycle Arena mängule üksikmäng, milles:

- host ehk lead player saab valida `Multiplayer` või `Single-player` režiimi;
- üksikmängus saab valida 1, 2 või 3 virtuaalset vastast;
- üksikmängu ajal ei saa teised veebimängijad ruumiga liituda;
- NPC-d kasutavad sama füüsikat, kokkupõrkeid, radu, power-up'e, punktiarvestust ja voorusüsteemi nagu pärismängijad;
- NPC-d võistlevad nii inimese kui ka üksteise vastu;
- olemas on vähemalt `Easy`, `Medium` ja `Hard` raskusaste;
- NPC iseloomu saab enne mängu kohandada ning kasutaja näeb selle eeldatavat tugevust;
- NPC ei saa avada menüüd ega saata pause-, restart-, quit- või muid hosti käske;
- olemasolev mitmikmäng töötab pärast muudatust endiselt samamoodi.

Kõige tähtsam arhitektuuriotsus: **NPC on serveris tavalise mängija kujuga objekt, millel on `isBot: true`, kuid puudub Socket.IO ühendus.** Nii ei teki eraldi NPC-mängumootorit ja üksikmäng jääb mitmikmänguga võimalikult sarnaseks.

---

## 2. Mida olemasolevas koodis juba kasutada saab

### Server ja võrguliiklus

- `server.js` käivitab serveri ja autoritatiivse mängutsükli.
- `src/server/` moodulid haldavad Socket.IO ühendusi, lobby't ja vooru elutsüklit.
- Server saadab klientidele `GAME_STATE_UPDATE` sündmuse.
- `JOIN_LOBBY`, `START_GAME`, `PLAYER_INPUT`, `PAUSE_GAME`, `RESUME_GAME`, `QUIT_MATCH`, `START_NEXT_ROUND` ja `RETURN_TO_LOBBY` on juba olemas.
- Server töötab 30 tick'i sekundis ning on mängu autoriteetne osapool.

### Mängumootor

- `src/gameEngine.js` sisaldab globaalset `gameState` objekti.
- Kõik `gameState.players` mängijad liiguvad läbi sama `updateGamePhysics()` funktsiooni.
- Kokkupõrge, elimineerimine, vooru tulemus, skoor ja järgmise vooru ettevalmistus on juba üldised ning ei sõltu socket'ist.
- See tähendab, et õigesti loodud bot lisatakse automaatselt füüsikasse, kokkupõrgetesse ja tulemustesse.

### Power-up'id

- `src/powerUp.js` rakendab power-up'i igale mängijaobjektile.
- NPC saab neid juba praegu koguda, kui tema koordinaat power-up'iga kattub.
- Freeze'i kiiruse taastamine eeldab hetkel baaskiirust `4`. NPC kohandamisel ei tasu esimeses versioonis muuta ratta tegelikku baaskiirust, sest see muudaks ka power-up'i loogikat. Kohanda pigem reaktsiooniaega, strateegiat, riskitaset ja otsuse õnnestumise tõenäosust.

### Klient ja kasutajaliides

- `public/js/client/controls.js` saadab lobby valikud serverisse.
- `public/js/client/socketEvents.js` töötleb serveri olekut.
- `public/js/ui/` renderdab lobby mängijad, scoreboard'i ja nupud.
- `public/js/render/` renderdab kõiki `gameState.players` kirjeid id järgi. Seetõttu kuvatakse NPC rattad ja rajad ilma eraldi renderdusmootorita.
- `public/index.html` lobby `match-settings` plokk on sobiv koht mängurežiimi ja NPC seadete lisamiseks.
- `public/css/` sisaldab vastutuse järgi jaotatud lobby, komponentide,
  mänguareeni, overlay ja responsive kujunduse faile, mida saab laiendada.

### Praegused piirangud

- Automaatseid teste ei ole.
- Inimese pööramine on kirjutatud `src/server/playerHandlers.js` faili `PLAYER_INPUT` sündmuse sisse. NPC peab saama kasutada sama pööramise valideerimist.
- `gameState` ei sisalda veel mängurežiimi ega NPC konfiguratsiooni.
- Lobby alustamisreegel kontrollib ainult mängijate arvu ega erista inimest ja NPC-d.

---

## 3. Soovituslik lõppstruktuur

Lisa kaks serveripoolset moodulit:

```text
src/
  botConfig.js       # profiilid, raskusastmed, valideerimine ja botide loomine
  botController.js   # ümbruse hindamine ning NPC pööramisotsused
```

Soovi korral võib jagada need hiljem väiksemateks failideks, kuid õppimise ajal on kaks selge vastutusega moodulit piisav:

- `botConfig.js` vastab küsimusele: **milline bot see on?**
- `botController.js` vastab küsimusele: **mida bot praegu teeb?**

Ära pane AI otsustusloogikat `public/js` kausta. Kliendipoolne NPC saaks petta, läheks eri brauserites lahku ja ei oleks serveri autoriteetne.

---

## 4. Soovituslik andmemudel

Täienda `gameState` algolekut failis `src/gameEngine.js`:

```js
gameMode: 'MULTIPLAYER',
botCount: 1,
botConfigs: [],
```

Lubatud `gameMode` väärtused olgu ainult:

```js
const GAME_MODES = Object.freeze({
    MULTIPLAYER: 'MULTIPLAYER',
    SINGLE_PLAYER: 'SINGLE_PLAYER'
});
```

NPC mängija võiks välja näha ligikaudu nii:

```js
{
    id: 'bot-2',
    name: 'Vector',
    playerNumber: 2,
    color: '#ff3f68',
    isHost: false,
    isBot: true,
    isAlive: true,
    score: 0,
    x: 400,
    y: 400,
    dx: 0,
    dy: 0,
    botConfig: {
        difficulty: 'MEDIUM',
        personality: 'HUNTER'
    },
    botRuntime: {
        nextDecisionAt: 0,
        forceDecisionAt: 0,
        lastTurnAt: 0
    }
}
```

Oluline eristus:

- `botConfig` on lobby seadistus, mis säilib voorude vahel;
- `botRuntime` on ajutine jooksva vooru olek;
- klient ei tohi saata `id`, `isBot`, `isHost`, `score` ega muid usaldatavaid mänguvälju;
- server loob need ise valideeritud valikute põhjal.

---

## 5. Raskusastmed ja kohandatavad iseloomud

### 5.1. Iseloomud

Alusta kolme selgelt erineva profiiliga:

| Iseloom | Käitumine | Tugevus | Nõrkus |
|---|---|---|---|
| `SURVIVOR` | eelistab palju vaba ruumi ja väldib radu | püsib kaua elus | ei suru vastaseid aktiivselt |
| `HUNTER` | liigub vastaste suunas ja proovib nende ruumi piirata | agressiivne | võtab rohkem riske |
| `COLLECTOR` | eelistab ohutuid lähedal olevaid power-up'e | saab rohkem võimendusi | võib eesmärki jälitades halva nurga valida |

Need profiilid tagavad, et NPC-d ei käitu kõik ühtemoodi ja võistlevad loomulikult ka omavahel.

### 5.2. Raskusastmed

Raskusaste peab muutma vähemalt nelja mõõdetavat parameetrit:

| Parameeter | Easy | Medium | Hard |
|---|---:|---:|---:|
| otsuste vahe | 500–750 ms | 250–450 ms | 100–220 ms |
| ettevaatamise kaugus | 70 px | 140 px | 220 px |
| hea otsuse rakendamise tõenäosus | 65% | 88% | 98% |
| juhusliku vea tugevus | suur | keskmine | väike |

Väärtused on algsed häälestuspunktid, mitte lõplik tõde. Testi neid päris mängus ja muuda väikeste sammudega.

### 5.3. Raskus kui kordaja

Ülesanne nõuab, et `Easy`, `Medium` ja `Hard` toimiksid iseloomu oskuse kordajana. Tee see koodis nähtavaks, mitte ainult kirjeldavaks nimeks.

Näide:

```js
const DIFFICULTY_MULTIPLIERS = {
    EASY: 0.70,
    MEDIUM: 1.00,
    HARD: 1.35
};

effectiveSkill =
    PERSONALITIES[personality].baseSkill
    * DIFFICULTY_MULTIPLIERS[difficulty];
```

Kasuta `effectiveSkill` väärtust näiteks:

- ohutuse ettevaatamise kauguse arvutamisel;
- strateegilise skoori kaalu arvutamisel;
- otsuse õnnestumise tõenäosuses;
- juhusliku vea ulatuses;
- otsuste sageduses.

Nii saad review ajal konkreetselt seletada, kuidas raskusastmed erinevad ja miks tugev profiil `Hard` režiimis on eriti ohtlik.

### 5.4. Kasutajale nähtav hinnang

Lobby peab näitama iga NPC juures enne mängu näiteks:

```text
Vector — Hunter — Hard — Effectiveness: 9/10
```

Arvuta hinnang samast `effectiveSkill` väärtusest. Ära hoia UI hinnangut eraldi käsitsi kirjutatud tõena, sest muidu võib nähtav hinnang tegelikust loogikast lahku minna.

---

## 6. Samm-sammuline teostus

### Etapp 0: loo kontrollitav algseis

1. Käivita projekt käsuga `npm start`.
2. Ava vähemalt kaks brauseriakent.
3. Kontrolli enne muudatusi:
   - kaks mängijat saavad liituda;
   - ainult host saab mängu alustada;
   - mõlemad saavad pöörata;
   - pause/resume töötab;
   - voor lõpeb ja järgmine voor algab;
   - power-up'id toimivad;
   - host saab matši järel lobby'sse naasta.
4. Kirjuta leitud olemasolevad vead eraldi üles. Ära sega neid automaatselt NPC tööga.
5. Tee väike git commit ainult siis, kui tööpuu seis on arusaadav. Ära kirjuta üle teiste olemasolevaid muudatusi.

**Õpieesmärk:** enne uue funktsionaalsuse lisamist peab olema teada, milline käitumine on regressioon ja milline oli juba olemas.

**Valmis, kui:** oskad käsitsi demonstreerida olemasoleva mitmikmängu põhivoo.

---

### Etapp 1: lisa minimaalne testiraamistik

Kasuta Node'i sisseehitatud `node:test` moodulit, et vältida kohe uue sõltuvuse lisamist.

1. Lisa `package.json` faili:

   ```json
   "test": "node --test"
   ```

2. Loo `test/` kaust.
3. Alusta väikestest puhastest funktsioonidest, mitte kogu Socket.IO serveri testimisest.
4. Iga järgneva etapi juures lisa test samal ajal funktsionaalsusega.

Esimesed kavandatud testifailid:

```text
test/
  movement.test.js
  botConfig.test.js
  botController.test.js
  gameMode.test.js
```

**Õpieesmärk:** puhas funktsioon saab sisendi, tagastab tulemuse ja ei vaja brauserit ega töötavat serverit. Sellist loogikat on lihtne automaatselt kontrollida.

**Valmis, kui:** `npm test` käivitub edukalt ka siis, kui teste on alguses vähe.

---

### Etapp 2: eralda ühine pööramisloogika

Praegu muudab `src/server/playerHandlers.js` `PLAYER_INPUT` handler otse `dx` ja `dy` väärtusi. NPC vajab sama reeglit.

1. Loo `src/gameEngine.js` failis eksporditav funktsioon:

   ```js
   applyPlayerTurn(player, turn)
   ```

2. Funktsioon peab:
   - lubama ainult `UP`, `DOWN`, `LEFT`, `RIGHT`;
   - keelama 180-kraadise tagasipöörde;
   - arvestama mängija praegust kiirust, sealhulgas Freeze'i kiirust `2`;
   - alustama uue rajasegmendi ainult päriselt toimunud 90-kraadise pöörde korral;
   - tagastama `true` või `false`.
3. Muuda `PLAYER_INPUT` handler kasutama seda funktsiooni.
4. Hiljem kasutab sama funktsiooni `botController.js`.
5. Lisa testid:
   - üles liikudes saab pöörata vasakule ja paremale;
   - üles liikudes ei saa pöörata alla;
   - sama suuna kordamine ei loo uut rajasegmenti;
   - külmutatud mängija pöörde kiirus jääb `2`, mitte ei muutu tagasi `4`.

**Miks see tuleb teha enne AI-d:** inimene ja bot peavad kasutama sama reeglit. Vastasel juhul tekib kaks liikumisloogikat, mis võivad hakata erinevalt käituma.

**Valmis, kui:** mitmikmängu juhtimine töötab endiselt ja pööramisfunktsiooni testid läbivad.

---

### Etapp 3: lisa mängurežiim serveri olekusse

1. Lisa `gameState.gameMode`, mille algväärtus on `MULTIPLAYER`.
2. Lisa Socket.IO sündmus:

   ```text
   UPDATE_GAME_MODE
   ```

3. Server lubab režiimi muuta ainult siis, kui:
   - saatja on olemasolev mängija;
   - saatja on host;
   - mäng on `LOBBY` olekus;
   - väärtus on lubatud enum;
   - single-player režiimi valimisel pole lobby's teisi inimmängijaid.
4. Vigase soovi korral saada näiteks `GAME_MODE_ERROR`.
5. `resetGameToLobby()` peab säilitama valitud režiimi matši voorude ajal, kuid hosti täieliku lahkumise järel peab tühi server minema tagasi turvalisse vaikeseisu `MULTIPLAYER`.
6. Ära usalda kliendilt saadetud boolean'i nagu `offline: true`; kasuta selget enum väärtust.

**Oluline servajuhtum:** kui lobby's on juba mitu inimest, ära kustuta neid ootamatult režiimi vahetamisel. Keela single-player valik serveris ja näita hostile selget teadet: enne režiimi vahetamist peavad teised mängijad lahkuma.

**Testid:**

- mitte-host ei saa režiimi muuta;
- mängu ajal ei saa režiimi muuta;
- tundmatu väärtus lükatakse tagasi;
- host saab tühjas lobby's valida mõlemat režiimi;
- mitme inimmängijaga lobby't ei saa single-player režiimi muuta.

**Valmis, kui:** režiim on serveris üks tõeallikas ja klient ei saa serveri kontrolle vahele jätta.

---

### Etapp 4: lisa lobby'sse režiimilüliti

Muuda `public/index.html`, `public/js/client/controls.js`,
`public/js/client/socketEvents.js`, sobivaid `public/js/ui/` vaateid ja
vastutusele sobivat `public/css/` moodulit.

1. Lisa hosti seadete plokki kaks valikut:
   - `Multiplayer`;
   - `Single-player`.
2. Kasuta kas radio-nuppe või hästi märgistatud segmented control'i. Tavaline checkbox nimega “Offline” on ebaselgem.
3. Mitte-hosti jaoks peab valik olema nähtav, kuid keelatud.
4. `client.js` saadab muudatuse sündmusega `UPDATE_GAME_MODE`.
5. `GAME_STATE_UPDATE` põhjal peab UI alati serveri tegeliku väärtuse taastama.
6. Näita veateadet, kui server režiimimuudatuse tagasi lükkab.
7. Muuda lobby staatuse tekst režiimile vastavaks:
   - `Lobby online`;
   - `Single-player lobby`.

**Õpieesmärk:** UI ei otsusta ise, mis režiim aktiivne on. UI esitab soovi, server valideerib ja saadab autoritatiivse oleku tagasi.

**Valmis, kui:** host saab režiimi vahetada ning refresh või vigane sündmus ei vii UI-d ja serverit eri olekusse.

---

### Etapp 5: blokeeri üksikmängus veebimängijad

See nõue vajab kahte kaitsekihti.

#### Kiht A: liitumiskatse blokeerimine

Lisa `JOIN_LOBBY` alguses kontroll:

```text
Kui gameMode === SINGLE_PLAYER, lükka kõik uued JOIN_LOBBY soovid tagasi.
```

Saada kindel veakood, näiteks:

```text
SINGLE_PLAYER_ACTIVE
```

#### Kiht B: uue Socket.IO ühenduse blokeerimine

Lisa Socket.IO connection middleware või connection'i alguses kontroll, mis keeldub uuest ühendusest, kui single-player režiim on juba aktiivne.

Arvesta järgmiste juhtudega:

- hosti olemasolev socket peab jääma ühendatuks;
- enne režiimivahetust ühendunud, kuid lobby'ga veel liitumata socket ei tohi hiljem liituda;
- hosti disconnect lõpetab üksikmängu ja server taastab vaikimisi multiplayer lobby, et host saaks uuesti ühenduda;
- serveri kontroll peab toimima ka siis, kui keegi saadab sündmusi käsitsi DevTools'ist.

Võimalusel saada enne katkestamist arusaadav põhjus, et teise brauseri UI saaks näidata “Single-player match is active”.

**Käsitest:**

1. Liitu esimeses aknas hostina.
2. Vali single-player.
3. Ava teine aken.
4. Kontrolli, et teine aken ei saa lobby'ga liituda.
5. Lülita hostiga tagasi multiplayer režiimi.
6. Kontrolli, et uus mängija saab taas liituda.

**Valmis, kui:** üksikmängu ajal ei teki `gameState.players` kogumisse ühtegi uut inimmängijat.

---

### Etapp 6: loo NPC konfiguratsioon ja lobby vastased

Failis `src/botConfig.js`:

1. Defineeri lubatud raskused ja iseloomud.
2. Defineeri nimede nimekiri, näiteks `Vector`, `Nova`, `Cipher`.
3. Loo puhas funktsioon:

   ```js
   createBot({ playerNumber, difficulty, personality })
   ```

4. Loo funktsioon, mis valideerib kogu lobby konfiguratsiooni:

   ```js
   validateBotConfigs(configs, expectedCount)
   ```

5. Serveris lisa sündmus:

   ```text
   UPDATE_BOT_SETTINGS
   ```

6. Server lubab seadistust muuta ainult hostile single-player lobby's.
7. Vastaste arv peab olema täisarv vahemikus 1–3.
8. Kui arv või konfiguratsioon muutub, sünkroniseeri lobby botid:
   - lisa puuduolevad botid;
   - eemalda üleliigsed botid;
   - säilita host;
   - määra unikaalsed `playerNumber`, värv ja id;
   - ära anna botile kunagi `isHost: true`.
9. Kasuta botide id-deks serveri loodud stabiilseid väärtusi, näiteks `bot-2`, `bot-3`, `bot-4`.

**Turvakontrollid:**

- klient ei saa luua neljandat bot-vastast;
- klient ei saa määrata tundmatut raskust;
- klient ei saa saata botile hosti õigusi;
- multiplayer režiimis eemaldatakse kõik botid;
- lobby kogusuurus jääb alati 2–4 mängija vahele.

**Testid:**

- luuakse 1, 2 ja 3 boti;
- kõigil on erinev id, number ja värv;
- kõik botid on `isBot: true` ja `isHost: false`;
- vigane konfiguratsioon lükatakse tagasi;
- botide arvu vähendamine eemaldab õiged objektid.

**Valmis, kui:** single-player lobby mängijate nimekirjas on host ja valitud arv NPC-sid, kuid nad veel ei juhi rattaid.

---

### Etapp 7: ehita NPC seadete kasutajaliides

Lobby seadetes kuva single-player režiimis:

1. `Number of opponents` valik väärtustega 1, 2 ja 3.
2. Iga valitud NPC jaoks eraldi kaart või rida:
   - nimi;
   - personality;
   - difficulty;
   - lühike käitumise kirjeldus;
   - arvutatud `Effectiveness` hinnang.
3. Multiplayer režiimis peida NPC seadete plokk täielikult.
4. Mitte-hosti jaoks kuva valitud seadistus ainult lugemiseks.
5. Muudatuse järel saada serverile kogu valideeritav konfiguratsioon.
6. Ära saada sündmust iga renderduse ajal. Saada ainult kasutaja `change` sündmuse järel.
7. Serveri vastuse järel renderda lõplik olek uuesti `gameState.botConfigs` põhjal.

Soovituslik kasutajavoog:

```text
Mode: Single-player
Opponents: 3

NPC 1: Vector | Survivor | Easy   | Effectiveness 4/10
NPC 2: Nova   | Hunter   | Medium | Effectiveness 7/10
NPC 3: Cipher | Collector| Hard   | Effectiveness 9/10
```

Lobby mängijate nimekirjas ja scoreboard'il lisa botile märge `(NPC)`. Selleks täienda `createPlayerItem()` funktsiooni, kuid ära muuda inimese märgistust.

**Valmis, kui:** kasutaja saab enne mängu aru, mitu vastast tuleb ja kuidas igaüks tõenäoliselt käitub.

---

### Etapp 8: korrigeeri mängu alustamise reegleid

Muuda nii serveri kui UI kontrolli.

#### Multiplayer

- vaja on vähemalt 2 inimmängijat;
- NPC-sid ei tohi olla;
- senine käitumine peab jääma samaks.

#### Single-player

- vaja on täpselt 1 inimmängijat, kes on host;
- vaja on 1–3 valideeritud NPC-d;
- mängijate koguarv on 2–4.

Ära kasuta ainult:

```js
Object.keys(gameState.players).length >= 2
```

Loo eraldi loetavad abifunktsioonid:

```js
getHumanPlayers()
getBotPlayers()
canStartMatch()
```

Kasuta sama `canStartMatch()` loogikat nii `START_GAME` valideerimisel kui ka võimalusel UI-le saadetava oleku arvutamisel.

**Testid:**

- multiplayer ühe inimesega ei käivitu;
- multiplayer kahe inimesega käivitub;
- single-player ilma botita ei käivitu;
- single-player ühe hosti ja 1–3 botiga käivitub;
- single-player kahe inimesega ei käivitu.

**Valmis, kui:** mängu ei saa alustada ühegi nõuetele mittevastava osalejate kombinatsiooniga.

---

### Etapp 9: ehita NPC ümbruse tajumine

Failis `src/botController.js` ära alusta “täiusliku AI” kirjutamisest. Ehita esmalt väikesed puhtad funktsioonid.

1. `getCurrentDirection(player)`  
   Teisendab `dx/dy` väärtused suunaks.

2. `getCandidateDirections(player)`  
   Tagastab:
   - otse;
   - vasakpööre;
   - parempööre;
   - mitte kunagi vastassuunda.

3. `simulateStep(position, direction, distance)`  
   Arvestab 800 × 800 areeni ja wrap'i.

4. `distanceToDanger(player, direction, gameState, maxDistance)`  
   Liigub väikeste sammudega ette ja leiab:
   - raja;
   - teise ratta lähedusohu;
   - vajadusel wrap'i järel oleva ohu.

5. `distanceToNearestPowerUp(...)`

6. `distanceToNearestOpponent(...)`

Alusta ray-cast laadse proovivõtuga, näiteks iga 8 px järel. See on lihtsam kui täielik ruumiotsing ja kuni kolme boti puhul piisavalt odav.

**Oluline:** ennustusfunktsioon ei tohi muuta päris `gameState` objekti. See ainult loeb olekut ja tagastab numbri.

**Testid kunstlike olekutega:**

- sein otse ees annab väikese ohutuskauguse;
- tühi suund annab maksimaalse ohutuskauguse;
- oma aktiivset rada ei käsitleta valesti kohese seinana;
- vastassuunda ei pakuta kandidaadiks;
- areeni serva ületav ennustus jätkub vastasservast.

**Õpieesmärk:** jaga keeruline AI kolmeks: taju, hindamine ja tegevus.

**Valmis, kui:** saad testis küsida “kui ohutu on vasak/otse/parem?” ilma töötava serverita.

---

### Etapp 10: lisa suundade hindamine ja iseloomud

Iga kandidaatsuund saab skoori. Näiteks:

```text
score =
    safetyScore
    + personalityScore
    + powerUpScore
    + opponentScore
    + directionDiversityScore
    + randomNoise
```

Soovituslikud põhimõtted:

- `safetyScore` peab kõigil raskustel olema kõige tähtsam;
- `SURVIVOR` annab suure lisakaalu vabale ruumile;
- `HUNTER` eelistab ohutut suunda, mis vähendab kaugust vastaseni või lõikab tema võimalikku teed;
- `COLLECTOR` eelistab power-up'i ainult siis, kui tee selleni pole ohtlik;
- `directionDiversityScore` vähendab lõputut ühe mustri kordamist;
- `randomNoise` tekitab inimlikku varieeruvust ja sõltub raskusest.

Ära lase botil pöörata igal serveri tick'il. Kasuta `botRuntime.nextDecisionAt` aega.

Lisa kaks otsustamise põhjust:

1. **Ohuotsus:** kui otse ees on oht, otsusta kohe.
2. **Strateegiline otsus:** isegi ohutu tee puhul vaata aeg-ajalt uuesti, et bot ei sõidaks lõputult sama mustrit.

Kui otsus “ebaõnnestub”, ära tee tahtlikult alati enesetappu. Inimlik viga võib tähendada:

- parima asemel paremuselt teise suuna valimist;
- reaktsiooni hilinemist;
- korraks otse jätkamist;
- suuremat juhuslikku mõju skoorile.

**Valmis, kui:** kolme profiiliga botid valivad samas olukorras sageli, kuid mitte alati, erineva tegevuse.

---

### Etapp 11: ühenda NPC otsustamine serveri mängutsükliga

Lisa `server.js` 30 Hz tsüklisse enne füüsika uuendamist:

```js
updateBots(gameState, Date.now());
updateGamePhysics();
```

`updateBots()` peab:

- töötama ainult `PLAYING` olekus;
- töötama ainult `isBot === true` ja `isAlive === true` mängijatel;
- jätma inimese puutumata;
- jätma otsuse vahele, kui `nextDecisionAt` pole saabunud ja otsest ohtu pole;
- kutsuma suuna muutmiseks `applyPlayerTurn()`;
- mitte emiteerima `PLAYER_INPUT` Socket.IO sündmust.

NPC otsus toimub serveris otse, kuid liikumise rakendamine kasutab sama funktsiooni nagu inimese sisend.

Kontrolli jõudlust:

- mõõda, et AI ei teeks täielikku radade skaneerimist tarbetult 30 × 3 korda sekundis;
- otsusta harvem, kuid kontrolli lühikest otsest kokkupõrkeohtu igal tick'il;
- hoia ennustuse maksimaalne kaugus ja sammude arv piiratud.

**Valmis, kui:** host saab alustada mängu ja NPC rattad pööravad ise, jätavad radu, põrkavad, surevad ning koguvad power-up'e.

---

### Etapp 12: taga NPC-de võistlemine kõigi vastu

Kontrolli teadlikult, et AI ei kasutaks ühtegi erandit nagu “otsi ainult inimmängijat”.

1. Vastaste nimekiri peab olema:

   ```js
   all alive players except self
   ```

2. `HUNTER` võib valida sihtmärgiks lähima vastase, olenemata sellest, kas vastane on inimene või NPC.
3. Kokkupõrkes ei tohi olla `isBot` erandeid.
4. Freeze peab mõjutama kõiki teisi elus mängijaid, kaasa arvatud botte.
5. Power-up'i sihtimine peab arvestama, et teine NPC võib selle varem kätte saada.
6. Vooru rankings ja score peavad sisaldama NPC-sid.

**Käsitest:** käivita mäng kolme NPC-ga ja lase inimesel võimalikult kiiresti surra. Jälgi, et NPC-d jätkavad mängu ning võitja selgub nende omavahelises võistluses.

**Valmis, kui:** inimese elimineerimine ei lõpeta vooru enne, kui alles on kõige rohkem üks elus osaleja.

---

### Etapp 13: väldi lõputut mängu

Kasuta korraga käitumuslikku ja tehnilist kaitset.

#### Käitumuslik kaitse

- `forceDecisionAt` sunnib aeg-ajalt uut strateegilist hinnangut;
- bot ei eelista lõputult sama pöördemustrit;
- iseloomud annavad erinevad sihid;
- juhuslik mõju muudab korduvad olukorrad veidi erinevaks;
- vooru vananedes võib botide riskivalmidus aeglaselt suureneda.

#### Tehniline kaitse

Lisa ainult single-player režiimile maksimaalne vooruaeg, näiteks 180 sekundit.

Kui piir saab täis:

1. lõpeta voor deterministliku reegliga;
2. eelista suurima “survival score'iga” elus mängijat;
3. arvuta score näiteks vaba ruumi, lähima ohu kauguse ja alles oleva kaitsekilbi põhjal;
4. võrdse tulemuse korral kasuta stabiilset tie-break'i, näiteks väiksem `playerNumber`;
5. lisa tulemusse märge, et voor lõppes time limit'i tõttu.

Ära rakenda seda piirangut vaikimisi multiplayer režiimile, sest boonusfunktsioon ei tohi muuta olemasoleva mängu tavakäitumist.

**Testid:**

- sama olek annab alati sama timeout-võitja;
- multiplayer vooru timeout ei mõjuta;
- single-player voor ei saa jääda piiramatult `PLAYING` olekusse.

**Valmis, kui:** üksikmängu voor lõpeb alati ning lahendus on review ajal selgitatav.

---

### Etapp 14: kaitse menüütoimingud

NPC-l pole socket'it, seega tavaliselt ei saa ta menüüsündmusi saata. Lisa siiski serverisse selged kontrollid:

- `PAUSE_GAME`;
- `RESUME_GAME`;
- `QUIT_MATCH`;
- `START_NEXT_ROUND`;
- `RETURN_TO_LOBBY`;
- `UPDATE_GAME_MODE`;
- `UPDATE_BOT_SETTINGS`.

Iga handler peab kontrollima, et tegutseja:

```js
player && player.isBot !== true
```

Hosti nõudvatel toimingutel kontrolli lisaks `player.isHost`.

Ära loo botile Socket.IO socket'i ega kutsu botiloogikast menüüfunktsioone.

**Testid või serveritaseme kontrollid:**

- boti id-ga ei saa mängu pausile panna;
- bot ei saa matšist lahkuda;
- bot ei saa järgmist vooru käivitada;
- bot ei saa režiimi või seadeid muuta.

**Valmis, kui:** review nõue “Virtual opponents cannot pause/restart/quit” on kaitstud nii arhitektuuri kui valideerimisega.

---

### Etapp 15: korrasta vooru- ja lobby elutsükkel

Kontrolli kõiki olekumuutusi:

#### Uus matš

- botide score lähtestub;
- `botConfig` säilib;
- `botRuntime` lähtestub;
- kõik saavad õige spawn-positsiooni.

#### Järgmine voor

- botid jäävad mängijate hulka;
- botide iseloom ja raskus säilivad;
- ajutised power-up'i lipud eemaldatakse;
- `nextDecisionAt`, `forceDecisionAt` ja `lastTurnAt` lähtestatakse.

#### Tagasi lobby'sse

- single-player valik ja botiseaded võivad hostile mugavuse jaoks säilida;
- botid kuvatakse jälle lobby nimekirjas;
- multiplayer valimisel eemaldatakse kõik botid.

#### Hosti disconnect

- üksikmäng lõpetatakse;
- kõik botid eemaldatakse;
- intervallid puhastatakse;
- server läheb tühja multiplayer lobby algolekusse.

#### Hosti quit matši ajal

- bot ei tohi saada uueks hostiks;
- kuna single-player mängus pole teist inimest, lõpeta matš ja taasta tühi lobby;
- ära jäta serverisse ainult botte mängima.

Vaata üle ka `ensureHost()`: see peab valima uue hosti ainult inimmängijate seast.

**Valmis, kui:** mitme matši ja vooru järel ei jää alles vanu radu, power-up'e, botte, taimerivälju ega NPC otsustusaegu.

---

### Etapp 16: kohanda tulemused ja nähtav info

1. Lobby nimekiri näitab `(NPC)` märget.
2. Scoreboard näitab NPC-sid samamoodi nagu inimesi.
3. Vooru tulemused näitavad NPC nime, kohta ja võitude arvu.
4. Kui NPC võidab matši, peab pealkiri olema loomulik, näiteks `Vector wins the match`.
5. Kui inimene võidab, säilib olemasolev `You win`.
6. Single-player timeout'i korral näita lühidalt, et rakendus kasutas time limit'i.
7. Ära näita NPC-le mõeldud pause/quit nuppe eraldi. UI kuvatakse ainult päris kliendile.

Kontrolli `updateScoreboard()` cache'i. Praegune hash sisaldab ainult `id` ja `score`; NPC nime, hosti staatuse või konfiguratsiooni muutus ei pruugi olemasolevat rida uuendada. Täienda hash'i vajalike väljadega või uuenda mängijaelemendi kõiki muutuvaid osi.

**Valmis, kui:** kasutaja saab lobby's, mängus ja tulemustes alati aru, kes on inimene ja kes NPC.

---

### Etapp 17: automatiseeritud testid

Minimaalne kasulik testikomplekt:

#### Liikumine

- lubatud 90-kraadine pööre;
- keelatud tagasipööre;
- Freeze'i kiirus säilib;
- uus rajasegment tekib ainult pöördel.

#### NPC seadistus

- lubatud 1–3 boti;
- tundmatu difficulty/personality lükatakse tagasi;
- id, number ja värv on unikaalsed;
- difficulty multiplier annab järjestuse `Easy < Medium < Hard`;
- nähtav effectiveness põhineb samal arvutusel.

#### NPC taju

- oht leitakse igas suunas;
- wrap'i taga olev oht leitakse;
- power-up'i ja vastase kaugus arvutatakse;
- ennustus ei muuda gameState'i.

#### NPC otsus

- otsus ei tagasta vastassuunda;
- otsese seina ees eelistatakse ohutut suunda;
- Survivor, Hunter ja Collector kasutavad erinevaid kaale;
- seeded/fikseeritud juhuslikkusega test annab korratava tulemuse;
- Hard reageerib varem ja eksib harvem kui Easy.

#### Mängurežiim

- single-player lubab ainult ühe inimese;
- multiplayer ei sisalda botte;
- uued liitumised on single-player režiimis keelatud;
- ainult host saab režiimi ja NPC seadeid muuta;
- bot ei saa menüütoiminguid teha.

#### Elutsükkel

- järgmine voor säilitab config'i ja puhastab runtime'i;
- hosti disconnect eemaldab botid;
- tühi server naaseb multiplayer algolekusse;
- timeout lõpetab ainult single-player vooru.

Kui Socket.IO integratsioonitestid vajavad eraldi serveri instantsi, eralda
`server.js` käivitusest hiljem tehasefunktsioon:

```js
createGameServer()
```

See võimaldab testis käivitada serveri juhuslikul pordil ning kasutada juba sõltuvustes olevat `socket.io-client` paketti. Ära tee seda refaktorit enne, kui puhaste moodulite testid töötavad; muidu kasvab muudatuse maht liiga kiiresti.

**Valmis, kui:** `npm test` läbib korduvalt ja testid ei sõltu juhuslikust tulemusest.

---

### Etapp 18: review-eelne käsitest

Kasuta `docs/Review eelsed testid.txt` nõudeid kontrollnimekirjana.

#### Mandatory

- [ ] Host saab vahetada single-player ja multiplayer režiimi.
- [ ] Multiplayer töötab vähemalt kahe eraldi brauseriga nagu enne.
- [ ] Single-player ajal lükatakse teise brauseri ühendus/liitumine tagasi.
- [ ] Valida saab 1 NPC.
- [ ] Valida saab 2 NPC-d.
- [ ] Valida saab 3 NPC-d.
- [ ] NPC-d liiguvad, pööravad, jätavad radu ja saavad elimineeritud.
- [ ] NPC-d koguvad ning kasutavad power-up'e.
- [ ] NPC-d ründavad/väldivad nii inimest kui teisi NPC-sid.
- [ ] Kui inimene sureb esimesena, jätkavad NPC-d omavahel.
- [ ] Mäng ei jää lõputusse vooru.
- [ ] Easy on nähtavalt nõrgem kui Medium.
- [ ] Medium on nähtavalt nõrgem kui Hard.
- [ ] Oskad raskuste erinevused koodist ja arvudega lahti seletada.
- [ ] NPC ei saa pause/restart/quit toiminguid teha.

#### Extra

- [ ] Iga NPC personality't saab eraldi valida.
- [ ] Iga NPC difficulty't saab eraldi valida.
- [ ] UI kirjeldab valiku mõju.
- [ ] Effectiveness hinnang on enne mängu nähtav.
- [ ] Erinevad profiilid käituvad päriselt erinevalt.

#### Regressioonid

- [ ] Unikaalse nime kontroll töötab multiplayer režiimis.
- [ ] Maksimaalselt 4 mängijat.
- [ ] Ainult host saab mängu alustada.
- [ ] Pause/resume/quit töötab inimestel.
- [ ] Järgmine voor ja match winner töötavad.
- [ ] Wrap töötab.
- [ ] Kõik neli power-up'i töötavad.
- [ ] Scoreboard ja tulemused on õiged.
- [ ] Hosti vahetus multiplayer lobby's ei vali kunagi NPC-d.

Testi raskusastmeid mitme vooru põhjal, mitte ühe juhusliku mängu järgi. Juhuslikkuse tõttu võib Easy mõnikord võita ja Hard mõnikord kaotada; oluline on pikaajaliselt nähtav erinevus.

---

### Etapp 19: uuenda README

Praegune `README.md` kirjeldab peamiselt mängu spetsifikatsiooni. Lisa vähemalt:

1. projekti ülevaade;
2. nõutud Node.js versioon;
3. install:

   ```bash
   npm install
   ```

4. käivitamine:

   ```bash
   npm start
   ```

5. testide käivitamine:

   ```bash
   npm test
   ```

6. single-player kasutusjuhend;
7. režiimide erinevus;
8. NPC personality'd;
9. Easy/Medium/Hard tehniline selgitus;
10. üksikmängu time limit;
11. teadaolevad piirangud;
12. boonusfunktsioonid, kui neid lisad.

README peab aitama reviewer'il projekt nullist käivitada ilma suuliste lisajuhisteta.

**Valmis, kui:** teine inimene saab ainult README põhjal projekti paigaldada, käivitada ja single-player mängu alustada.

---

## 7. Soovituslik teostusjärjekord commit'ide kaupa

Hoia commit'id väikesed ja ühe eesmärgiga:

1. `test: add node test setup`
2. `refactor: share validated player turn logic`
3. `feat: add authoritative game mode state`
4. `feat: add lobby game mode controls`
5. `feat: reject online joins during single player`
6. `feat: add validated bot configuration`
7. `feat: add customizable bot lobby UI`
8. `feat: add bot environment sensing`
9. `feat: add difficulty and personality decisions`
10. `feat: run bots in the authoritative game loop`
11. `fix: handle bots across rounds and disconnects`
12. `feat: add single player round timeout`
13. `test: cover npc and game mode behavior`
14. `docs: document single player mode`

Pärast iga commit'i:

```bash
npm test
npm start
```

Seejärel tee vähemalt üks lühike käsitest. Nii on vea tekkimise koht palju lihtsam leida.

---

## 8. Levinud vead, mida vältida

### Ära juhi NPC-d kliendis

Kliendipoolne AI tekitab eri mängijatele erineva tõe ja rikub serveri autoriteetsuse.

### Ära loo NPC jaoks eraldi füüsikat

Bot peab liikuma `updateGamePhysics()` kaudu. Muidu võib ta läbida radu, eirata Freeze'i või saada ebaausa eelise.

### Ära usalda lobby seadistust kliendilt

Kontrolli serveris count, enumid, hosti õigus ja mängu olek.

### Ära seo raskust ainult juhusliku vea protsendiga

Raskus peab mõjutama ka reaktsiooni, ettevaatamist ja strateegilist skoori. Siis on erinevus mängus nähtav ja seletatav.

### Ära tee Easy botist tahtlikku enesetapjat

Easy peaks vahel hilinema või valima mitteoptimaalselt, kuid tema käitumine peab endiselt meenutama inimest.

### Ära anna Hard botile täielikku teadmist

Hard võib vaadata kaugemale ja otsustada paremini, kuid 100% täiuslik AI tundub ebaloomulik ja võib muutuda ebameeldivaks.

### Ära unusta wrap'i AI ennustuses

Areeni serv ei ole sein. Oht võib asuda vastasservas.

### Ära lase botil hostile saada

Kõik hosti valimise kohad peavad filtreerima `isBot !== true`.

### Ära kasuta ainult UI blokeeringut

Disabled nupp pole turvakontroll. Kõik õigused ja režiimireeglid peavad olema serveris valideeritud.

### Ära muuda multiplayer vaikekäitumist

Single-player timeout, botid ja nende seadistus peavad aktiveeruma ainult single-player režiimis.

---

## 9. Review ajal selgitatav tehniline lugu

Valmistu lahendust selgitama järgmises järjekorras:

1. **Server on autoriteetne.** Klient saadab ainult inimese sisendi ja lobby valikud.
2. **NPC on tavaline mängija `isBot` märgisega.** Seetõttu kasutab ta sama füüsikat, radu, kokkupõrkeid ja power-up'e.
3. **Inimene ja NPC kasutavad sama pööramisfunktsiooni.**
4. **AI koosneb tajust, suundade hindamisest ja tegevusest.**
5. **Personality muudab strateegia kaale.**
6. **Difficulty multiplier muudab sama profiili reaktsiooni, ettevaatamist ja edukust.**
7. **Juhuslikud vead muudavad käitumise inimlikumaks, kuid seeded testid hoiavad automaattestid korratavad.**
8. **Kõiki elus vastaseid hinnatakse võrdselt, mistõttu NPC-d võistlevad ka omavahel.**
9. **Ühenduste blokeerimine toimub serveris, mitte ainult UI-s.**
10. **Single-player time limit väldib lõputut vooru ega muuda multiplayer režiimi.**

Kui oskad need kümme punkti oma koodi näidates lahti seletada, katad suure osa review arutelust.

---

## 10. Definition of Done

Ülesanne on valmis siis, kui korraga kehtivad kõik järgmised tingimused:

- kõik mandatory review kontrollid läbivad;
- vähemalt üks extra customization lahendus on kasutajasõbralikult olemas;
- mitmikmängu põhivoog pole katki;
- server valideerib kõik uued sündmused;
- NPC kasutab sama mängumootorit nagu inimene;
- raskusastmete erinevus on mõõdetav ja koodis nähtav;
- üksikmäng ei jää lõputult käima;
- automaattestid läbivad;
- README on uuendatud;
- oskad review ajal arhitektuuri, raskusastmeid ja peamisi kompromisse selgitada.
