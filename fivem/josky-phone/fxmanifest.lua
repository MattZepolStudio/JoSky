fx_version "cerulean"
game "gta5"

title "JoSky - lb-phone"
description "Multiplayer card game for lb-phone."
author "MattZepolStudio"

client_script "client/client.lua"
server_scripts {
    "server/identity.lua",
    "server/server.js",
}

file "config.json"
file "ui/dist/**/*"

ui_page "ui/dist/index.html"
