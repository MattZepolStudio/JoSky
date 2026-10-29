# 🃏 JoSky - Jeu de Cartes Multijoueur en Ligne

Un jeu de cartes multijoueur en temps réel inspiré des règles officielles du Skyjo, optimisé pour les téléphones mobiles et tablettes.

## ✨ Fonctionnalités

- **Multijoueur en temps réel** : Salons privés avec code court (ex: `SKYJ`) ou partage de lien direct (`?room=CODE`).
- **Chat en direct** : Messagerie instantanée avec barre de réactions emoji rapides (👏, 😂, 😱, 🎯, 🔥...).
- **Mode Solo & Bots IA** : Possibilité d'ajouter des robots intelligents d'un clic pour tester ou jouer immédiatement.
- **Règles officielles du Skyjo** :
  - Paquet de 150 cartes avec couleurs (-2 à 12).
  - Élimination de colonnes verticales (3 cartes identiques).
  - Règle de doublement des points pour le joueur déclencheur s'il n'a pas le score le plus bas.
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
```
