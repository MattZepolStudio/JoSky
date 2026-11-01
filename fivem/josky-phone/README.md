# JoSky pour lb-phone

Ressource FiveM qui ajoute le jeu de cartes multijoueur JoSky comme application de lb-phone. Tout tient dans la ressource : aucun site, aucune base de données, aucun service externe.

> **État :** testé dans une simulation (vrai `server.js` avec de faux natifs FiveM, interface dans une iframe de 270×590 à 400×870). **Jamais lancé dans un vrai FiveM ni dans un vrai lb-phone.** Le premier démarrage demande donc les contrôles ci-dessous.

## Différences avec la version web

Le jeu est le même : mêmes règles, mêmes bots à 3 niveaux, même interface, chat, réactions, tutoriel, pseudo libre, avatars et statistiques sur l'appareil. Seul ce qui dépend de la plateforme change.

### Ajouté sur lb-phone

- **Inviter un contact** : le joueur choisit un contact du téléphone, et le code du salon part dans Messages depuis son numéro.
- **Réglages sans toucher au code** : nom de l'app, prix, texte d'invitation, durée des tours et rythme des bots dans `config.json`.

### Différent

| | Version web | Version lb-phone |
|---|---|---|
| Inviter | Lien, WhatsApp, SMS, QR code | Code du salon ou contact du téléphone |
| Bouton du code en haut de l'écran | Copie le lien du salon | Copie le code du salon |
| Identité du joueur | Jeton secret gardé dans le navigateur | Licence FiveM, vérifiée par le serveur |
| Serveur de jeu | Site Node.js hébergé à part | Intégré à la ressource FiveM |
| Connexion | Socket.IO | `fetchNui` et événements réseau FiveM |
| Parties en cours | Sauvegardées, elles survivent à un redémarrage | En mémoire, effacées quand la ressource redémarre |
| Quitter l'écran | Le joueur reste connecté tant que la page tourne | Fermer l'app compte comme une absence : les tours sont joués automatiquement, et rouvrir l'app rend la place |
| Polices | Chargées depuis Google Fonts | Incluses dans la ressource |

### Retiré sur lb-phone

- Liens d'invitation `?room=`, WhatsApp, SMS et QR code.
- Installation sur l'écran d'accueil et fonctionnement hors ligne de l'application web.
- Sauvegarde des parties.

### Identique par construction

Les deux versions partagent `src/` à la racine du dépôt : une correction de règle ou d'interface s'applique aux deux, à condition de relancer `npm run build:fivem` pour la version lb-phone.

## Installation

1. Copier le dossier `josky-phone` dans `resources/`.
2. Ajouter `ensure josky-phone` au `server.cfg`, après `lb-phone`.
3. Redémarrer le serveur. L'app apparaît sur les téléphones (ou dans l'App Store si `defaultApp` vaut `false`).

Les fichiers compilés sont inclus : Node.js n'est pas nécessaire pour installer.

## Configuration

`config.json` :

| Clé | Rôle |
|---|---|
| `identifier` | Identifiant de l'app dans lb-phone |
| `name`, `description`, `developer` | Textes affichés |
| `defaultApp` | `true` : installée d'office |
| `price` | Prix en jeu, `0` pour gratuit |
| `inviteMessage` | Texte envoyé aux contacts invités, `{code}` devient le code du salon |
| `turnSeconds` | Durée d'un tour |
| `absentTurnSeconds` | Attente avant de jouer à la place d'un absent |
| `botStepMs` | Rythme des bots |

**Inviter un contact :** dans le salon, le joueur choisit un contact (`components.setContactSelector`) et le serveur envoie le message depuis son numéro avec l'export serveur `SendMessage`. Limite : 5 invitations par minute et par joueur.

**Pseudo :** chaque joueur choisit librement le sien dans l'app, 15 caractères au maximum. Il n'est lié ni au compte FiveM ni au personnage.

## Fonctionnement

```
Interface (iframe lb-phone)  ->  fetchNui  ->  client.lua  ->  événements réseau  ->  server.js
```

- `server/server.js` contient le moteur, les bots et les salons. Il fait autorité : le téléphone ne reçoit jamais la valeur des cartes cachées.
- Le joueur est identifié par sa licence FiveM. Le jeton envoyé par le téléphone est ignoré et remplacé côté serveur.
- `client.lua` ne fait que relayer du texte. Les messages restent en JSON, car les `null` et les grilles à trous ne survivraient pas à une table Lua. Les gros messages sont découpés en morceaux de 6 Ko.
- Fermer l'app compte comme une absence : les tours sont joués automatiquement, et rouvrir l'app rend la place.
- Les parties sont en mémoire : un redémarrage de la ressource les efface.

## Contrôles au premier démarrage

Ces points ne sont pas documentés par lb-phone ou n'ont pas pu être testés :

- [ ] L'app s'installe, s'ouvre, et le message `AddCustomApp` n'apparaît pas en rouge dans la console F8.
- [ ] Le serveur démarre sans erreur `server.js` (bundle prévu pour Node 16 ou plus récent).
- [ ] Le CEF de FiveM gère les unités `dvh` et les container queries, soit Chromium 108 ou plus. Sinon, la mise en page sera cassée.
- [ ] **Saisie clavier** : pseudo, code du salon et chat. Si le jeu capte les touches, remplacer ces champs par `components.setPopUp` et son option `input`.
- [ ] La barre d'état du téléphone ne recouvre pas l'en-tête du jeu. Sinon, ajouter une marge haute dans `ui/src/phone.css`.
- [ ] `onClose` se déclenche bien quand on quitte l'app **et** quand on range le téléphone. Sinon, un joueur parti garde son minuteur de 60 s.
- [ ] `localStorage` persiste entre deux ouvertures de l'app, sinon le joueur n'est pas ramené seul dans sa partie.
- [ ] Le sélecteur de contacts s'ouvre au-dessus de l'app et renvoie bien un numéro.
- [ ] L'invitation arrive dans Messages, depuis le numéro du joueur, et un contact bloqué affiche une erreur.
- [ ] Le son fonctionne dans l'iframe.
- [ ] Partie réelle à 2 joueurs, avec une déconnexion FiveM en cours de route.

## Modifier le code

Le code du jeu vient de la racine du dépôt (`src/`), partagé avec la version web. Seuls les fichiers de `ui/src/` et `server-src/` sont propres à lb-phone.

```bash
# À la racine du dépôt
npm install
npm run build:fivem
```

Cela régénère `ui/dist/` et `server/server.js`. Ensuite, redémarrer la ressource.

## Crédits

Structure basée sur [lb-phone-app-template](https://github.com/lbphone/lb-phone-app-template) (MIT). Polices Gloock, Outfit et Plus Jakarta Sans (SIL Open Font License).
