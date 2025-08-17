# Guide de déploiement sur un VPS Namecheap

Ce document décrit les étapes pour déployer l'application UDRG sur un VPS Namecheap.

## 1. Préparation du VPS

1. **Connectez-vous à votre tableau de bord Namecheap** et accédez à la section VPS.

2. **Assurez-vous que votre VPS exécute un système d'exploitation Linux** (Ubuntu est recommandé, de préférence Ubuntu 20.04 LTS ou plus récent).

3. **Connectez-vous à votre VPS via SSH** :
   ```bash
   ssh utilisateur@votre-adresse-ip
   ```

## 2. Installation des prérequis

```bash
# Mettre à jour le système
sudo apt update
sudo apt upgrade -y

# Installer Node.js et npm
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Installer PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Installer Git et autres outils
sudo apt install -y git build-essential
```

## 3. Configuration de PostgreSQL

```bash
# Configurer la base de données PostgreSQL
sudo -u postgres psql -c "CREATE USER udrg WITH PASSWORD 'mot_de_passe_securise';"
sudo -u postgres psql -c "CREATE DATABASE udrg_db OWNER udrg;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE udrg_db TO udrg;"
```

## 4. Cloner et configurer l'application

```bash
# Créer un répertoire pour l'application
mkdir -p /var/www/udrg
cd /var/www/udrg

# Télécharger l'application depuis Replit
# Exportez votre projet comme ZIP depuis Replit, puis téléchargez-le sur le serveur
# Exemple avec scp:
# Sur votre machine locale:
# scp udrg.zip utilisateur@votre-adresse-ip:/var/www/udrg/

# Sur le serveur
unzip udrg.zip
```

## 5. Configuration de l'environnement

Créez un fichier `.env` dans le répertoire de l'application :

```bash
cp .env.example .env
nano .env
```

Modifiez les variables d'environnement selon vos besoins :

```
DATABASE_URL=postgres://udrg:mot_de_passe_securise@localhost:5432/udrg_db
PORT=3000
NODE_ENV=production
SESSION_SECRET=une_clé_secrète_longue_et_aléatoire
```

## 6. Installer les dépendances et construire l'application

```bash
# Créer le répertoire uploads s'il n'existe pas
mkdir -p uploads
chmod 755 uploads

# Installer les dépendances
npm install

# Effectuer la migration de la base de données
npm run db:push

# Construire l'application pour la production
npm run build
```

## 7. Configuration de PM2 pour gérer le processus Node.js

```bash
# Installer PM2
sudo npm install -g pm2

# Démarrer l'application avec PM2
pm2 start npm --name "udrg-app" -- run start

# Configurer PM2 pour démarrer automatiquement après un redémarrage
pm2 startup
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $(whoami) --hp $(echo $HOME)
pm2 save
```

## 8. Configuration de Nginx comme proxy inverse

```bash
# Installer Nginx
sudo apt install -y nginx

# Configurer Nginx
sudo nano /etc/nginx/sites-available/udrg
```

Ajoutez la configuration suivante :

```nginx
server {
    listen 80;
    server_name votre-domaine.com www.votre-domaine.com;

    # Gérer les fichiers téléchargés
    location /uploads {
        alias /var/www/udrg/uploads;
        expires 30d;
        add_header Cache-Control "public, max-age=2592000";
    }

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Optimisation de la mise en cache pour les ressources statiques
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg)$ {
        expires 7d;
        add_header Cache-Control "public, max-age=604800";
        try_files $uri @proxy;
    }

    location @proxy {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Puis activez la configuration :

```bash
sudo ln -s /etc/nginx/sites-available/udrg /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 9. Configuration du pare-feu

```bash
# Configurer le pare-feu
sudo apt install -y ufw
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

## 10. Configuration de SSL avec Let's Encrypt

```bash
# Installer Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtenir un certificat SSL
sudo certbot --nginx -d votre-domaine.com -d www.votre-domaine.com
```

## 11. Pointage de votre domaine vers le VPS

Dans votre tableau de bord Namecheap :
1. Allez à la section de gestion des domaines
2. Configurez les enregistrements DNS pour pointer vers l'adresse IP de votre VPS :
   - Enregistrement A : `@` pointant vers l'adresse IP de votre VPS
   - Enregistrement A : `www` pointant vers l'adresse IP de votre VPS

## 12. Maintenance et mises à jour

Pour mettre à jour l'application :

```bash
cd /var/www/udrg

# Sauvegarder la version actuelle
cp -r .env .env.backup

# Télécharger et extraire la nouvelle version
# (après avoir exporté la nouvelle version depuis Replit)

# Restaurer le fichier .env
cp .env.backup .env

# Installer les dépendances et reconstruire
npm install
npm run db:push  # Si le schéma de la base de données a changé
npm run build

# Redémarrer l'application
pm2 restart udrg-app
```

## Sauvegardes

Créez un script de sauvegarde pour la base de données :

```bash
# Créer un script de sauvegarde
sudo nano /usr/local/bin/backup-udrg.sh
```

Contenu du script :
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/udrg"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
mkdir -p $BACKUP_DIR
pg_dump -U udrg -h localhost udrg_db > "$BACKUP_DIR/udrg_db_$TIMESTAMP.sql"
find $BACKUP_DIR -name "udrg_db_*.sql" -type f -mtime +30 -delete
```

Rendez le script exécutable et configurez un cron job :
```bash
sudo chmod +x /usr/local/bin/backup-udrg.sh
sudo crontab -e
```

Ajoutez la ligne suivante pour exécuter la sauvegarde quotidiennement à 2h du matin :
```
0 2 * * * /usr/local/bin/backup-udrg.sh
```