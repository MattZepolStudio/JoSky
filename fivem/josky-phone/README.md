# JoSky pour lb-phone

Ressource FiveM qui ajoute le jeu de cartes multijoueur JoSky comme application de lb-phone. Tout tient dans la ressource : aucun site, aucune base de données, aucun service externe.

> **État :** essayée dans un vrai lb-phone : l'app s'installe depuis le store, s'ouvre et se joue, avec les bonnes couleurs. Les invitations par contact, le bouton **Rejoindre** et « À proximité » n'ont été testés qu'en simulation : les contrôles ci-dessous restent à faire.

## Différences avec la version web

Le jeu est le même : mêmes règles, mêmes bots à 3 niveaux, même interface, chat, réactions, tutoriel, pseudo libre, avatars et statistiques sur l'appareil. Seul ce qui dépend de la plateforme change.

### Ajouté sur lb-phone

- **Inviter un contact** : le joueur choisit un contact du téléphone, et le code du salon part dans Messages depuis son numéro. Le contact reçoit aussi une notification avec un bouton **Rejoindre**.
- **À proximité** : les joueurs autour reçoivent la même notification avec le bouton **Rejoindre**.
- **Réglages sans toucher au code** : nom de l'app, prix, textes d'invitation, portée de « À proximité », durée des tours et rythme des bots dans `config.json`.

### Différent

| | Version web | Version lb-phone |
|---|---|---|
| Inviter | Lien, WhatsApp, SMS, QR code | Code du salon, contact du téléphone ou joueurs à proximité, avec bouton Rejoindre |
| En-tête | Logo et code du salon | Code du salon seul, placé sous l'heure du téléphone |
| Bouton du code en haut de l'écran | Copie le lien du salon | Copie le code du salon |
| Pseudo | Choisi par le joueur | Choisi par le joueur, sans lien avec le compte FiveM ou le personnage |
| Identité du joueur | Jeton secret gardé dans le navigateur | Licence FiveM, vérifiée par le serveur |
| Serveur de jeu | Site Node.js hébergé à part | Intégré à la ressource FiveM |
| Connexion | Socket.IO | `fetchNui` et événements réseau FiveM |
| Parties en cours | Sauvegardées, elles survivent à un redémarrage | En mémoire, effacées quand la ressource redémarre |
| Quitter l'écran | Le joueur reste connecté tant que la page tourne | Fermer l'app compte comme une absence : les tours sont joués automatiquement, et rouvrir l'app rend la place |
| Polices | Chargées depuis Google Fonts | Incluses dans la ressource |

### Retiré sur lb-phone

- Liens d'invitation `?room=`, WhatsApp, SMS et QR code.
- Installation du site sur l'écran d'accueil du téléphone réel.
- Sauvegarde des parties.

### Identique par construction

Les deux versions partagent `src/` à la racine du dépôt : une correction de règle ou d'interface s'applique aux deux, à condition de relancer `npm run build:fivem` pour la version lb-phone.

## Installation

1. Copier le dossier `josky-phone` dans `resources/`.
2. Ajouter `ensure josky-phone` au `server.cfg`, après `lb-phone`.
3. Redémarrer le serveur. L'app apparaît dans l'App Store du téléphone (ou directement sur l'écran si `defaultApp` vaut `true`).

Les fichiers compilés sont inclus : Node.js n'est pas nécessaire pour installer.

## Mise à jour

1. Arrêter la ressource avec `stop josky-phone`.
2. Supprimer le dossier `josky-phone`, puis remettre celui du dépôt. Remplacer plutôt que fusionner évite de garder d'anciens fichiers.
3. Taper `refresh`, puis `ensure josky-phone`.
4. Se reconnecter au jeu si `client/client.lua` a changé.

Si une ancienne image reste affichée, vider le cache de FiveM : le téléphone garde les fichiers qui portent le même nom.

## Configuration

`config.json` :

| Clé | Rôle |
|---|---|
| `identifier` | Identifiant de l'app dans lb-phone. Le changer fait de JoSky une nouvelle app, à réinstaller |
| `name`, `description`, `developer` | Textes affichés |
| `defaultApp` | `false` : à installer depuis l'App Store. `true` : installée d'office |
| `game` | `true` : range l'app dans la section jeux de lb-phone |
| `size` | Taille affichée, en Ko |
| `price` | Prix en jeu, `0` pour gratuit |
| `inviteMessage` | Texte envoyé aux contacts invités, `{code}` devient le code du salon |
| `inviteNotification` | Texte de la notification d'invitation, `{name}` devient le pseudo |
| `nearbyMeters` | Portée du bouton « À proximité », en mètres |
| `turnSeconds` | Durée d'un tour |
| `absentTurnSeconds` | Attente avant de jouer à la place d'un absent |
| `botStepMs` | Rythme des bots |

**Inviter un contact :** dans le salon, le joueur choisit un contact (`components.setContactSelector`) et le serveur envoie le message depuis son numéro avec l'export serveur `SendMessage`. Le contact reçoit aussi une notification avec un bouton **Rejoindre** (`SendNotification`), qui ouvre l'app (`OpenApp`) et l'assoit dans le salon. Limite : 5 invitations par minute et par joueur.

**À proximité :** le serveur cherche les joueurs à portée, dans le même routing bucket, et leur envoie la notification avec le bouton **Rejoindre**. Il faut OneSync, sinon le serveur ne connaît pas leur position. AirShare n'est pas utilisé : cliquer sur sa notification ne faisait rien dans nos essais.

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

- [x] L'app s'installe depuis le store et s'ouvre.
- [x] Le serveur démarre et une partie contre un bot se joue.
- [ ] **Saisie clavier** : pseudo, code du salon et chat. Si le jeu capte les touches, remplacer ces champs par `components.setPopUp` et son option `input`.
- [ ] `onClose` se déclenche bien quand on quitte l'app **et** quand on range le téléphone. Sinon, un joueur parti garde son minuteur de 60 s.
- [ ] `localStorage` persiste entre deux ouvertures de l'app, sinon le joueur n'est pas ramené seul dans sa partie.
- [ ] Le sélecteur de contacts s'ouvre au-dessus de l'app et renvoie bien un numéro.
- [ ] L'invitation arrive dans Messages, depuis le numéro du joueur, et un contact bloqué affiche une erreur.
- [ ] Le bouton **Rejoindre** de la notification ouvre JoSky et fait entrer dans le salon, app fermée comme ouverte, et aussi quand l'ami n'a pas installé l'app (comportement non documenté).
- [ ] « À proximité » prévient les joueurs à portée, et seulement eux.
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

Le navigateur intégré à FiveM ne comprend pas toutes les fonctions CSS récentes : `ui/legacyCss.ts` convertit `oklch`, les dégradés `oklab` et `dvh` à la compilation. Les marges autour de l'heure et de la barre d'accueil sont dans `ui/src/phone.css`.

## Crédits

Structure basée sur [lb-phone-app-template](https://github.com/lbphone/lb-phone-app-template) (MIT). Polices Gloock, Outfit et Plus Jakarta Sans (SIL Open Font License).
