# osmc-radio
DIY remote control for OSMC Radio addon (using Kodi JSON RPC API)

Using following request to rule the OSMC box

http://osmc:8080/jsonrpc?request={"jsonrpc":"2.0","id":1,"method":"Addons.ExecuteAddon","params":{"addonid":"plugin.audio.radio_de"}}

http://osmc:8080/jsonrpc?request={"method":"Files.GetDirectory","id":44,"jsonrpc":"2.0","params":{"directory":"plugin://plugin.audio.radio_de/stations/my"}}

http://osmc:8080/jsonrpc?request={"jsonrpc":"2.0","id":"1","method":"Player.Open","params":{"item":{"file":"plugin://plugin.audio.radio_de/station/32285"}}}

http://osmc:8080/jsonrpc?request={"jsonrpc":"2.0","id":1,"method":"Player.GetActivePlayers"}

http://osmc:8080/jsonrpc?request={"jsonrpc":"2.0","method":"Player.GetItem","params":{"playerid":0},"id":1}

http://osmc:8080/jsonrpc?request={"jsonrpc":"2.0","method":"Player.PlayPause","params":{"playerid":0},"id":1}

http://osmc:8080/jsonrpc?request={"jsonrpc":"2.0","method":"Application.GetProperties","params":{"properties":["volume"]},"id":1}

http://osmc:8080/jsonrpc?request={"jsonrpc":"2.0","id":1,"method":"Application.SetVolume","params":{"volume":100}}

