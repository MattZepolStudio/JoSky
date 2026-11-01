local resourceName = GetCurrentResourceName()
local config = json.decode(LoadResourceFile(resourceName, "config.json"))

while GetResourceState("lb-phone") ~= "started" do
    Wait(500)
end

Wait(1000) -- wait for the AddCustomApp export to exist

local function AddApp()
    local success, errorMessage = exports["lb-phone"]:AddCustomApp({
        identifier = config.identifier,
        name = config.name,
        description = config.description,
        developer = config.developer,
        defaultApp = config.defaultApp,
        price = config.price > 0 and config.price or nil,
        game = config.game,
        size = config.size,
        images = { "https://cfx-nui-" .. resourceName .. "/ui/dist/screenshot.png" },
        ui = resourceName .. "/ui/dist/index.html",
        icon = "https://cfx-nui-" .. resourceName .. "/ui/dist/icon.png",
        onClose = function()
            TriggerServerEvent("josky:disconnect")
        end,
    })

    if not success then
        print("^1[josky-phone] AddCustomApp: " .. tostring(errorMessage) .. "^0")
    end
end

AddApp()

AddEventHandler("onResourceStart", function(resource)
    if resource == "lb-phone" then
        Wait(1000)
        AddApp()
    end
end)

-- Messages stay plain text on both sides of this relay: see server-src/adapter.ts
RegisterNetEvent("josky:message", function(part)
    exports["lb-phone"]:SendCustomAppMessage(config.identifier, { action = "josky", data = part })
end)

local pendingInvite = nil

-- "Rejoindre" button of the invitation notification
RegisterNetEvent("josky:joinInvite", function(data)
    if type(data) ~= "table" or type(data.roomCode) ~= "string" then
        return
    end

    pendingInvite = data.roomCode
    exports["lb-phone"]:OpenApp(config.identifier)
    exports["lb-phone"]:SendCustomAppMessage(config.identifier, { action = "joskyInvite" })
end)

RegisterNUICallback("josky:pendingInvite", function(_, cb)
    cb({ code = pendingInvite })
    pendingInvite = nil
end)

RegisterNUICallback("josky:connect", function(_, cb)
    TriggerServerEvent("josky:connect")
    cb("ok")
end)

RegisterNUICallback("josky:disconnect", function(_, cb)
    TriggerServerEvent("josky:disconnect")
    cb("ok")
end)

RegisterNUICallback("josky:event", function(data, cb)
    TriggerServerEvent("josky:event", data.message)
    cb("ok")
end)
