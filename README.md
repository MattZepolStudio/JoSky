# 🃏 JoSky - Jeu de Cartes Multijoueur en Ligne

Un jeu de cartes multijoueur en temps réel aux règles simples et addictives, optimisé pour les téléphones mobiles et tablettes.

## ✨ Fonctionnalités

- **Multijoueur en temps réel** : Salons privés avec code court (ex: `JOSK`) ou partage de lien direct (`?room=CODE`).
- **Chat en direct** : Messagerie instantanée avec barre de réactions emoji rapides (👏, 😂, 😱, 🎯, 🔥...).
- **Mode Solo & Bots IA** : Possibilité d'ajouter des robots intelligents d'un clic pour tester ou jouer immédiatement.
- **Règles de JoSky** :
  - Paquet de 150 cartes avec couleurs (-2 à 12).
  - Élimination de colonnes verticales (3 cartes identiques).
  - Règle de doublement des points pour le joueur déclencheur s'il n'a pas le score le plus bas.
- **Bots à 3 niveaux** : facile, normal et difficile. Un bot remplace aussi un joueur qui quitte la partie.
- **Parties robustes** : minuteur de tour, reprise après actualisation et sauvegarde des salons.
- **Statistiques** : parties, victoires et meilleur score, conservés sur l'appareil.
- **Mobile First & Tactile** : Interface ergonomique avec retournements 3D et effets sonores Web Audio (synthétiseur procédural).

---

## 🚀 Déploiement sur Render.com (Gratuit)

### Méthode 1 : Blueprint automatique
1. Connectez-vous sur [dashboard.render.com](https://dashboard.render.com).
2. Cliquez sur **New +** > **Blueprint**.
3. Sélectionnez votre dépôt GitHub **`MattZepolStudio/JoSky`**.
4. Render détectera automatiquement le fichier `render.yaml` et configurera le build et le démarrage.
5. Cliquez sur **Apply** ! Votre jeu sera en ligne en quelques minutes.

### Méthode 2 : Web Service manuel
1. Dans Render, cliquez sur **New +** > **Web Service**.
2. Connectez le dépôt **`MattZepolStudio/JoSky`**.
3. Remplissez les informations suivantes :
   - **Runtime** : `Node`
   - **Build Command** : `npm install && npm run build`
   - **Start Command** : `npm start`
   - **Plan** : `Free`
4. Cliquez sur **Deploy Web Service** !

---

## 💾 Sauvegarde des parties

Render gratuit efface le disque à chaque redémarrage. Pour que les parties survivent à une mise en veille ou à un déploiement :

1. Créez une base Redis gratuite sur [upstash.com](https://upstash.com).
2. Dans Render, ajoutez `UPSTASH_REDIS_REST_URL` et `UPSTASH_REDIS_REST_TOKEN` aux variables d'environnement du service.

Sans ces variables, les parties sont écrites dans `.data/rooms.json`. Voir `.env.example` pour les autres réglages.

---

## 💻 Développement local

```bash
# Installation des dépendances
npm install

# Démarrer le serveur dev (Express + Vite + Socket.IO)
npm run dev

# Compiler pour la production
npm run build

# Tester en mode production
npm start

# Lancer les tests automatiques
npm test
```
