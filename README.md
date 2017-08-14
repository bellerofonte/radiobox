# osmc-radio
DIY remote control for OSMC Radio addon
(using Kodi JSON RPC API http://kodi.wiki/view/JSON-RPC_API/v8)

Using following request to rule the OSMC box

* **Run addon**
http://osmc:8080/jsonrpc?request={"jsonrpc":"2.0","id":1,"method":"Addons.ExecuteAddon","params":{"addonid":"plugin.audio.radio_de"}}

* **Get 'my stations'**
http://osmc:8080/jsonrpc?request={"method":"Files.GetDirectory","id":44,"jsonrpc":"2.0","params":{"directory":"plugin://plugin.audio.radio_de/stations/my"}}

* **Play station**
http://osmc:8080/jsonrpc?request={"jsonrpc":"2.0","id":"1","method":"Player.Open","params":{"item":{"file":"plugin://plugin.audio.radio_de/station/32285"}}}

* **Get player status (playing/paused/stoped)**
http://osmc:8080/jsonrpc?request={"jsonrpc":"2.0","method":"Player.GetProperties","params":{"playerid":0,"properties":["speed"]},"id":1}

* **Get current track**
http://osmc:8080/jsonrpc?request={"jsonrpc":"2.0","method":"Player.GetItem","params":{"playerid":0},"id":1}

* **Play/Pause**
http://osmc:8080/jsonrpc?request={"jsonrpc":"2.0","method":"Player.PlayPause","params":{"playerid":0},"id":1}

* **Get volume**
http://osmc:8080/jsonrpc?request={"jsonrpc":"2.0","method":"Application.GetProperties","params":{"properties":["volume"]},"id":1}

* **Set volume**
http://osmc:8080/jsonrpc?request={"jsonrpc":"2.0","id":1,"method":"Application.SetVolume","params":{"volume":100}}

