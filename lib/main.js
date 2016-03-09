var data = require("sdk/self").data;
var tabs = require("sdk/tabs");
var simple_prefs = require("sdk/simple-prefs");
var ui = require("sdk/ui");
var { env } = require('sdk/system/environment');
const {Cc,Ci} = require("chrome");
var { Hotkey } = require("sdk/hotkeys");
var contextMenu = require("sdk/context-menu");

function play_video(url) {
	var file = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
	file.initWithPath(simple_prefs.prefs.player);

	// create an nsIProcess
	var process = Cc["@mozilla.org/process/util;1"].createInstance(Ci.nsIProcess);
	process.init(file);

	var args = simple_prefs.prefs.params.split(" ");

	args.push(url);
	
	// process.run(false, args, args.length);
	process.runAsync(args, args.length);
}

var menuItem = contextMenu.Item({
  label: "Watch with MPV",
  context: contextMenu.SelectorContext("[href]"),
  contentScript: 'self.on("click", function(node,data){self.postMessage(node.href);})',
  accessKey: "e",
  image: data.url("icon_button.png"),
  onMessage: function (url) {
    play_video(url);
  }
});

var action_button = ui.ActionButton({
  id: "my-button",
  label: "Play with MPV",
  icon: data.url("icon_button.png"),
  onClick: function(state) {
    play_video(tabs.activeTab.url);
  }
});

var showHotKey = Hotkey({
  combo: simple_prefs.prefs.hotkey,
  onPress: function() {
    play_video(tabs.activeTab.url);
  }
});

tabs.on("ready", function(tab) {
    var worker = tab.attach({
        contentScriptFile: data.url("modified-click.js")
    });
    worker.port.on("altClick", function(url) {
        console.log(url);
        play_video(url);
    });

    function onPrefChanged(name) {
        worker.port.emit("prefChanged", name, simple_prefs.prefs[name]);
    }

    var watchedPrefs = [
        "altClick"
    ];

    watchedPrefs.forEach(function(value) {
        simple_prefs.on(value, onPrefChanged);
        onPrefChanged(value);
    });

    worker.on("detach", function() {
        watchedPrefs.forEach(function(value) {
            simple_prefs.removeListener(value, onPrefChanged);
        });
    });

});
