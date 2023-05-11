// Modules to control application life and create native browser window
require("babel-polyfill");
const TransportNodeHid = require("@ledgerhq/hw-transport-node-hid").default;
const AppEth = require("@ledgerhq/hw-app-eth").default;
const { listen } = require("@ledgerhq/logs");
const { app, BrowserWindow, ipcMain } = require("electron");
function splitPath(path) {
    const result = [];
    const components = path.split("/");
    components.forEach((element) => {
      let number = parseInt(element, 10);
      if (isNaN(number)) {
        return; // FIXME shouldn't it throws instead?
      }
      if (element.length > 1 && element[element.length - 1] === "'") {
        number += 0x80000000;
      }
      result.push(number);
    });
    return result;
  }
/**
   * get an Ethereum 2 BLS-12 381 public key for a given BIP 32 path.
   * @param {string} path a path in BIP 32 format
   * @param {boolean} [boolDisplay] optionally enable or not the display
   * @return {Promise<{publicKey: string}>} an object with a publicKey
   * @example
   * eth.eth2GetPublicKey("12381/3600/0/0").then(o => o.publicKey)
   */
function getEthInfo(verify) {
    return TransportNodeHid.open("")
      .then(transport => {
        listen(log => console.log(log))
        const paths = splitPath("44'/1616'/0/0/0");
        console.log(paths)
        const buffer = Buffer.alloc(1 + paths.length * 4);
        buffer[0] = paths.length;
        paths.forEach((element, index) => {
          buffer.writeUInt32BE(element, 1 + 4 * index);
        });
        const appEth = new AppEth(transport);
        return appEth.transport.send(0xE0, 0x02, 0x00, 0x00,
            buffer,
          ).then(o => {
        console.log(o.toString('hex'))
            return transport.close().catch(e => {}).then(() => o.address)
        }
            )
      })
      .catch(e => {
        console.warn(e);
        // try again until success!
        return new Promise(s => setTimeout(s, 1000)).then(() =>
        getEthInfo(verify)
        );
      });
  }
// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
    }
})
  // and load the index.html of the app.
  mainWindow.loadFile("index.html");
  // Open the DevTools.
  // mainWindow.webContents.openDevTools()
  // Emitted when the window is closed.
  mainWindow.on("closed", function() {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });
  // ~~~ BASIC LEDGER EXAMPLE ~~~
  ipcMain.on("requestBitcoinInfo", () => {
    getEthInfo(false).then(result => {
        mainWindow.webContents.send("bitcoinInfo", result);
    })
    // getBitcoinInfo(false).then(result => {
    //   mainWindow.webContents.send("bitcoinInfo", result);
    // });
  });
  ipcMain.on("verifyBitcoinInfo", () => {
    getEthInfo(true);
  });
  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
}
// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", createWindow);
// Quit when all windows are closed.
app.on("window-all-closed", function() {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== "darwin") {
    app.quit();
  }
});
app.on("activate", function() {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
});
// In this file you can include the rest of your app's specific main process