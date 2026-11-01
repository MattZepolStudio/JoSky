-- Name shown at the table. Replace the body to use the character name of your
-- framework, for example with ESX or QBCore. The game keeps the first 15 characters.
exports("getPlayerName", function(source)
    return GetPlayerName(source)
end)
